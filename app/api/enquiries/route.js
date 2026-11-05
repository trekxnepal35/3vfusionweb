import { NextResponse } from "next/server";
import { Resend } from "resend";

import connectDB from "@/lib/mongodb";
import Enquiry from "@/models/Enquiry";
import Page from "@/models/Page";
import { verifyAdminToken } from "@/lib/auth";

/*

# EMAIL CONFIGURATION

*/

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return new Resend(apiKey);
}

const ENQUIRY_EMAIL =
  process.env.ENQUIRY_EMAIL ||
  process.env.BOOKING_EMAIL;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  "Trek Website [onboarding@resend.dev](mailto:onboarding@resend.dev)";

/*

# HELPERS

*/

function getAdminFromRequest(request) {
  const token = request.cookies.get("admin_token")?.value;

  if (!token) return null;

  return verifyAdminToken(token);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}



/*

GET ALL ENQUIRIES
ADMIN ONLY
==========

*/

export async function GET(request) {
  try {
    const admin = getAdminFromRequest(request);


    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const enquiries = await Enquiry.find({})
      .populate({
        path: "experience",
        select: "title slug imageUrl pageType region",
        populate: [
          {
            path: "pageType",
            select: "name slug bookable",
          },
          {
            path: "region",
            select: "name slug",
          },
        ],
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: enquiries,
    });


  } catch (error) {
    console.error("GET ENQUIRIES ERROR:", error);


    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch enquiries",
      },
      { status: 500 }
    );


  }
}

/*

CREATE ENQUIRY
PUBLIC
======

*/

export async function POST(request) {
  try {
    await connectDB();


    const body = await request.json();

    const {
      experienceId,
      experienceType,
      name,
      email,
      phone,
      country,
      numberOfPeople,
      preferredDate,
      message,
    } = body;

    /*
    ========================================
    BASIC VALIDATION
    ========================================
    */

    if (!experienceId) {
      return NextResponse.json(
        {
          success: false,
          message: "Experience ID is required",
        },
        { status: 400 }
      );
    }

    if (!experienceType) {
      return NextResponse.json(
        {
          success: false,
          message: "Experience type is required",
        },
        { status: 400 }
      );
    }

    if (!name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Name is required",
        },
        { status: 400 }
      );
    }

    if (!email?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required",
        },
        { status: 400 }
      );
    }

    if (!phone?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number is required",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(Number(numberOfPeople)) ||
      Number(numberOfPeople) < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Number of people must be at least 1",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    FIND EXPERIENCE
    ========================================
    */

    const experience = await Page.findById(experienceId)
      .populate({
        path: "pageType",
        select: "name slug bookable",
      })
      .lean();

    if (!experience) {
      return NextResponse.json(
        {
          success: false,
          message: "Experience not found",
        },
        { status: 404 }
      );
    }

    /*
    ========================================
    CHECK PAGE TYPE
    ========================================
    */

    if (!experience.pageType) {
      return NextResponse.json(
        {
          success: false,
          message: "Experience page type is missing",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    VERIFY EXPERIENCE TYPE
    ========================================
    */

    const requestedType = String(experienceType)
      .trim()
      .toLowerCase();

    const actualType = String(experience.pageType.slug)
      .trim()
      .toLowerCase();

    if (requestedType !== actualType) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Experience type does not match the selected experience",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    CHECK BOOKABLE
    ========================================
    */

    if (experience.pageType.bookable !== true) {
      return NextResponse.json(
        {
          success: false,
          message: "This experience does not accept enquiries",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    CHECK PUBLISHED
    ========================================
    */

    if (experience.published !== true) {
      return NextResponse.json(
        {
          success: false,
          message: "This experience is not available",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    SAVE ENQUIRY TO DATABASE
    ========================================
    */

    const enquiry = await Enquiry.create({
      experience: experience._id,
      experienceType: actualType,
      experienceTitle: experience.title,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      country: country?.trim() || "",
      numberOfPeople: Number(numberOfPeople),
      preferredDate: preferredDate
        ? new Date(preferredDate)
        : null,
      message: message?.trim() || "",
      status: "new",
    });

    /*
    ========================================
    SEND EMAIL NOTIFICATION
    ========================================
    */

    let emailNotificationSent = false;

    if (!process.env.RESEND_API_KEY) {
      console.error(
        "ENQUIRY EMAIL ERROR: RESEND_API_KEY is not configured."
      );
    } else if (!ENQUIRY_EMAIL) {
      console.error(
        "ENQUIRY EMAIL ERROR: Set ENQUIRY_EMAIL or BOOKING_EMAIL."
      );
    } else {
      const safeTitle = escapeHTML(experience.title);
      const safeType = escapeHTML(actualType);
      const safeName = escapeHTML(name.trim());
      const safeEmail = escapeHTML(email.trim());
      const safePhone = escapeHTML(phone.trim());
      const safeCountry = escapeHTML(country?.trim() || "Not provided");
      const safePeople = escapeHTML(Number(numberOfPeople));
      const safeDate = escapeHTML(
        preferredDate || "Not specified"
      );
      const safeMessage = escapeHTML(
        message?.trim() || "No additional message"
      );
      const enquiryId = enquiry._id.toString();

      try {
        const resend = getResendClient();

        const result = await resend.emails.send({
          from: FROM_EMAIL,
          to: [ENQUIRY_EMAIL],
          replyTo: email.trim(),
          subject: `New ${actualType} Enquiry - ${experience.title}`,
          html: `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; color: #222;">
          <h2 style="background: #111827; color: white; padding: 20px;">
            New Website Enquiry
          </h2>

          <p>A visitor has submitted a new enquiry through your website.</p>

          <h3>Experience Details</h3>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Experience</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safeTitle}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Type</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safeType}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Enquiry ID</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${enquiryId}</td>
            </tr>
          </table>

          <h3>Customer Details</h3>
          <table style="border-collapse: collapse; width: 100%;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Name</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Email</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Phone</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safePhone}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Country</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safeCountry}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Number of People</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safePeople}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Preferred Date</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safeDate}</td>
            </tr>
          </table>

          <h3>Message</h3>
          <p style="white-space: pre-wrap;">${safeMessage}</p>

          <hr style="margin-top: 25px;" />
          <p style="color: #666; font-size: 12px;">
            This notification was generated by your website enquiry form.
          </p>
        </div>
      `,
        });

        if (result.error) {
          console.error(
            "RESEND ENQUIRY EMAIL ERROR:",
            result.error
          );
        } else {
          emailNotificationSent = true;
          console.log(
            "Enquiry notification email sent:",
            result.data?.id
          );
        }
      } catch (emailError) {
        console.error(
          "SEND ENQUIRY EMAIL ERROR:",
          emailError
        );
      }
    }

    /*
    ========================================
    RETURN SUCCESS
    ========================================
    */

    return NextResponse.json(
      {
        success: true,
        message: "Enquiry submitted successfully",
        emailNotificationSent,
        data: {
          id: enquiry._id,
          experienceTitle: enquiry.experienceTitle,
          experienceType: enquiry.experienceType,
          status: enquiry.status,
        },
      },
      { status: 201 }
    );


  } catch (error) {
    console.error("CREATE ENQUIRY ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit enquiry",
      },
      { status: 500 }
    );


  }
}
