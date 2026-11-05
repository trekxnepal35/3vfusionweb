
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";

import Page from "@/models/Page";
import Booking from "@/models/Booking";
import PageType from "@/models/PageType";
import Departure from "@/models/Departure";

import { Resend } from "resend";
import { verifyAdminToken } from "@/lib/auth";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return new Resend(apiKey);
}

/*
=========================================
GET PAX PRICE
=========================================
*/

function getPaxPrice(paxPrices = [], numberOfPeople) {
  if (!Array.isArray(paxPrices)) {
    return null;
  }

  return (
    paxPrices.find((tier) => {
      const min = Number(tier.minPax);

      const max =
        tier.maxPax === null ||
        tier.maxPax === "" ||
        typeof tier.maxPax === "undefined"
          ? null
          : Number(tier.maxPax);

      if (!Number.isFinite(min) || min < 1) {
        return false;
      }

      if (numberOfPeople < min) {
        return false;
      }

      if (
        max !== null &&
        Number.isFinite(max) &&
        numberOfPeople > max
      ) {
        return false;
      }

      return true;
    }) || null
  );
}

/*
=========================================
HTML ESCAPE
=========================================
*/

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/*
=========================================
VALIDATE DEPARTURE DATE
=========================================
*/

function validateDepartureDates(departure) {
  const now = new Date();

  if (!departure.startDate) {
    throw new Error("Departure start date is invalid.");
  }

  const departureStart = new Date(departure.startDate);

  if (Number.isNaN(departureStart.getTime())) {
    throw new Error("Departure start date is invalid.");
  }

  /*
  Date-only values stored at midnight remain
  bookable throughout their calendar day.

  Datetime values are checked precisely.
  */

  const isDateOnly =
    departureStart.getUTCHours() === 0 &&
    departureStart.getUTCMinutes() === 0 &&
    departureStart.getUTCSeconds() === 0 &&
    departureStart.getUTCMilliseconds() === 0;

  const departureHasStarted = isDateOnly
    ? departureStart.toISOString().slice(0, 10) <
      now.toISOString().slice(0, 10)
    : departureStart <= now;

  if (departureHasStarted) {
    throw new Error(
      "This departure has already started or is no longer available."
    );
  }

  if (departure.bookingDeadline) {
    const deadline = new Date(departure.bookingDeadline);

    if (
      Number.isNaN(deadline.getTime()) ||
      deadline < now
    ) {
      throw new Error(
        "The booking deadline for this departure has passed."
      );
    }
  }
}

/*
=========================================
POST BOOKING

PUBLIC API

Customers can submit bookings without
admin authentication.

Only Page Types where bookable === true
can create bookings.

Departure seats are reserved immediately.
Booking status remains pending.
=========================================
*/

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();

    const {
      experienceId,
      experienceType,
      departureId,
      name,
      email,
      phone,
      country,
      numberOfPeople,
      preferredDate,
      message,
      acceptTerms,
    } = body;

    /*
    ========================================
    BASIC EXPERIENCE VALIDATION
    ========================================
    */

    if (
      !experienceId ||
      !mongoose.Types.ObjectId.isValid(experienceId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Valid experience information is required.",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    EXPERIENCE TYPE VALIDATION
    ========================================
    */

    if (
      !experienceType ||
      typeof experienceType !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Experience type is required.",
        },
        { status: 400 }
      );
    }

    const requestedExperienceType = experienceType
      .trim()
      .toLowerCase();

    /*
    ========================================
    CUSTOMER VALIDATION
    ========================================
    */

    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Name is required.",
        },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Email is required.",
        },
        { status: 400 }
      );
    }

    if (typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Phone number is required.",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    NUMBER OF PEOPLE
    ========================================
    */

    const people = Number(numberOfPeople);

    if (!Number.isInteger(people) || people < 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Number of people must be at least 1.",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    TERMS ACCEPTANCE
    ========================================
    */

    if (acceptTerms !== true) {
      return NextResponse.json(
        {
          success: false,
          message: "You must accept the terms and conditions.",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    FIND PAGE TYPE

    Supports:
    - PageType slug
    - PageType MongoDB ObjectId
    ========================================
    */

    let pageType = await PageType.findOne({
      slug: requestedExperienceType,
    }).lean();

    if (
      !pageType &&
      /^[0-9a-fA-F]{24}$/.test(requestedExperienceType)
    ) {
      pageType = await PageType.findById(
        requestedExperienceType
      ).lean();
    }

    if (!pageType) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid experience type.",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    CHECK PAGE TYPE BOOKABLE
    ========================================
    */

    if (pageType.bookable !== true) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This type of experience is not available for booking.",
        },
        { status: 403 }
      );
    }

    /*
    ========================================
    FIND EXPERIENCE
    ========================================
    */

    const experience = await Page.findOne({
      _id: experienceId,
      pageType: pageType._id,
      published: true,
    })
      .populate("pageType", "name slug bookable")
      .lean();

    if (!experience) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Experience not found or is not published.",
        },
        { status: 404 }
      );
    }

    /*
    ========================================
    VERIFY ACTUAL PAGE TYPE
    ========================================
    */

    const actualExperienceType = experience.pageType?.slug
      ?.trim()
      .toLowerCase();

    const requestedTypeMatches =
      requestedExperienceType === actualExperienceType ||
      requestedExperienceType ===
        String(experience.pageType?._id).toLowerCase();

    if (!actualExperienceType || !requestedTypeMatches) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Experience type does not match the selected experience.",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    SECOND BOOKABLE CHECK
    ========================================
    */

    if (experience.pageType?.bookable !== true) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This type of experience is not available for booking.",
        },
        { status: 403 }
      );
    }

    /*
    ========================================
    VALIDATE SELECTED DEPARTURE
    ========================================
    */

    let selectedDeparture = null;

    if (departureId) {
      if (
        typeof departureId !== "string" ||
        !mongoose.Types.ObjectId.isValid(departureId)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid departure selected.",
          },
          { status: 400 }
        );
      }

      selectedDeparture = await Departure.findOne({
        _id: departureId,
        experienceId: experience._id,
      }).lean();

      if (!selectedDeparture) {
        return NextResponse.json(
          {
            success: false,
            message: "Selected departure was not found.",
          },
          { status: 404 }
        );
      }

      if (selectedDeparture.status !== "open") {
        return NextResponse.json(
          {
            success: false,
            message:
              "This departure is not open for booking.",
          },
          { status: 400 }
        );
      }

      try {
        validateDepartureDates(selectedDeparture);
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            message: error.message,
          },
          { status: 400 }
        );
      }

      /*
      Preliminary availability check.

      The final capacity check and reservation
      happen atomically inside the transaction.
      */

      const availablePax = Math.max(
        0,
        Number(selectedDeparture.capacity || 0) -
          Number(selectedDeparture.reservedPax || 0)
      );

      if (availablePax < people) {
        return NextResponse.json(
          {
            success: false,
            message: `Only ${availablePax} places are currently available for this departure.`,
          },
          { status: 409 }
        );
      }
    }

    /*
    ========================================
    GET PRICE

    Default: experience pricing

    If departure custom pricing is enabled,
    departure pricing takes priority.
    ========================================
    */

    let price = experience.price || {};

    let currency = price.currency || "USD";

    let pricingType = price.pricingType || "fixed";

    if (
      selectedDeparture &&
      selectedDeparture.priceOverride?.enabled === true
    ) {
      const override = selectedDeparture.priceOverride;

      currency = override.currency || currency;

      pricingType = override.pricingType || "fixed";

      price = {
        currency,
        pricingType,
        amount: override.amount,
        paxPrices: override.paxPrices || [],
      };
    }

    let packagePrice = 0;
    let estimatedTotal = 0;
    let packagePriceType = pricingType;

    /*
    ========================================
    FIXED PRICE
    ========================================
    */

    if (pricingType === "fixed") {
      packagePrice = Number(price.amount || 0);
      estimatedTotal = packagePrice * people;
      packagePriceType = "fixed";
    }

    /*
    ========================================
    PAX-BASED PRICE
    ========================================
    */

    else if (pricingType === "pax_based") {
      const tier = getPaxPrice(price.paxPrices, people);

      if (!tier) {
        return NextResponse.json(
          {
            success: false,
            message: `No pricing tier is available for ${people} ${
              people === 1 ? "person" : "people"
            }.`,
          },
          { status: 400 }
        );
      }

      packagePrice = Number(tier.pricePerPax || 0);
      estimatedTotal = packagePrice * people;
      packagePriceType = "pax_based";
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid pricing configuration.",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    VALIDATE PRICE
    ========================================
    */

    if (
      !Number.isFinite(packagePrice) ||
      packagePrice <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This experience does not have a valid price.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(estimatedTotal) ||
      estimatedTotal <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unable to calculate booking total.",
        },
        { status: 400 }
      );
    }

    /*
    ========================================
    PREPARE BOOKING DATA
    ========================================
    */

    const bookingData = {
      experience: experience._id,
      experienceType: actualExperienceType,
      experienceTitle: experience.title,

      departure: selectedDeparture?._id || null,
      departureStartDate:
        selectedDeparture?.startDate || null,
      departureEndDate:
        selectedDeparture?.endDate || null,

      packagePrice,
      packageCurrency: currency,
      packagePriceType,
      estimatedTotal,

      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),

      country:
        typeof country === "string"
          ? country.trim()
          : "",

      numberOfPeople: people,

      preferredDate:
        typeof preferredDate === "string"
          ? preferredDate.trim()
          : "",

      message:
        typeof message === "string"
          ? message.trim()
          : "",

      acceptTerms: true,
      status: "pending",

      /*
      Departure bookings reserve seats immediately.
      Bookings without a departure reserve no seats.
      */

      seatsReserved: Boolean(selectedDeparture),
    };

    /*
    ========================================
    CREATE BOOKING AND RESERVE SEATS

    Both operations happen in one transaction.

    If either operation fails, neither is committed.
    ========================================
    */

    let booking;

    if (selectedDeparture) {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const currentDeparture = await Departure.findOne({
            _id: selectedDeparture._id,
            experienceId: experience._id,
          }).session(session);

          if (!currentDeparture) {
            throw new Error(
              "Selected departure was not found."
            );
          }

          if (currentDeparture.status !== "open") {
            throw new Error(
              "This departure is no longer open for booking."
            );
          }

          validateDepartureDates(currentDeparture);

          /*
          Atomic capacity check and seat reservation.

          This prevents two customers from booking
          the same remaining seats simultaneously.
          */

          const reservationResult = await Departure.updateOne(
            {
              _id: currentDeparture._id,
              status: "open",
              $expr: {
                $lte: [
                  {
                    $add: [
                      { $ifNull: ["$reservedPax", 0] },
                      people,
                    ],
                  },
                  "$capacity",
                ],
              },
            },
            {
              $inc: {
                reservedPax: people,
              },
            },
            { session }
          );

          if (reservationResult.modifiedCount !== 1) {
            const available = Math.max(
              0,
              Number(currentDeparture.capacity || 0) -
                Number(currentDeparture.reservedPax || 0)
            );

            throw new Error(
              `Only ${available} places are currently available for this departure.`
            );
          }

          /*
          Use the departure dates loaded inside
          the transaction for the booking snapshot.
          */

          bookingData.departureStartDate =
            currentDeparture.startDate;

          bookingData.departureEndDate =
            currentDeparture.endDate;

          const newBooking = new Booking(bookingData);

          await newBooking.save({ session });

          booking = newBooking;
        });
      } finally {
        await session.endSession();
      }
    } else {
      booking = await Booking.create({
        ...bookingData,
        seatsReserved: false,
      });
    }

    /*
    ========================================
    SEND EMAIL

    Email failure does not undo a valid booking.
    ========================================
    */

    let emailSent = false;
    let emailError = null;

    try {
      const bookingEmail = process.env.BOOKING_EMAIL;

      if (bookingEmail) {
        const departureEmailHtml = selectedDeparture
          ? `
            <h3>Selected Departure</h3>

            <p>
              <strong>Departure ID:</strong>
              ${escapeHtml(selectedDeparture._id)}
            </p>

            <p>
              <strong>Start Date:</strong>
              ${escapeHtml(
                new Date(
                  booking.departureStartDate
                ).toLocaleDateString()
              )}
            </p>

            <p>
              <strong>End Date:</strong>
              ${escapeHtml(
                new Date(
                  booking.departureEndDate
                ).toLocaleDateString()
              )}
            </p>
          `
          : `
            <p>
              <strong>Departure:</strong>
              No scheduled departure selected.
            </p>
          `;

          const resend = getResendClient();

          const emailResult = await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ||
            "Booking <onboarding@resend.dev>",

          to: [bookingEmail],

          subject: `New ${actualExperienceType} Booking - ${experience.title}`,

          html: `
            <div
              style="
                font-family: Arial, sans-serif;
                line-height: 1.6;
                max-width: 700px;
                margin: auto;
              "
            >
              <h2>New Booking Received</h2>

              <hr />

              <h3>Experience</h3>

              <p>
                <strong>Type:</strong>
                ${escapeHtml(actualExperienceType)}
              </p>

              <p>
                <strong>Title:</strong>
                ${escapeHtml(experience.title)}
              </p>

              ${departureEmailHtml}

              <h3>Customer Information</h3>

              <p><strong>Name:</strong> ${escapeHtml(name)}</p>
              <p><strong>Email:</strong> ${escapeHtml(email)}</p>
              <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
              <p><strong>Country:</strong> ${escapeHtml(country || "Not provided")}</p>

              <h3>Booking Information</h3>

              <p><strong>Number of People:</strong> ${people}</p>
              <p><strong>Preferred Date:</strong> ${escapeHtml(preferredDate || "Not provided")}</p>

              <h3>Price</h3>

              <p><strong>Pricing Type:</strong> ${escapeHtml(packagePriceType)}</p>
              <p><strong>Price Per Person:</strong> ${escapeHtml(currency)} ${packagePrice}</p>
              <p><strong>Estimated Total:</strong> ${escapeHtml(currency)} ${estimatedTotal}</p>

              <h3>Customer Message</h3>

              <p>${escapeHtml(message || "No message provided.")}</p>

              <h3>Terms and Conditions</h3>
              <p>Accepted</p>

              <hr />

              <p><strong>Booking ID:</strong> ${escapeHtml(booking._id)}</p>
              <p><strong>Status:</strong> Pending</p>
              <p><strong>Seats Reserved:</strong> ${selectedDeparture ? "Yes" : "No scheduled departure"}</p>
            </div>
          `,
        });

        if (emailResult?.error) {
          emailError =
            emailResult.error.message ||
            "Email sending failed.";
        } else {
          emailSent = true;
        }
      } else {
        emailError = "BOOKING_EMAIL is not configured.";
      }
    } catch (error) {
      console.error("Booking email error:", error);

      emailError =
        error.message || "Email sending failed.";
    }

    /*
    ========================================
    RESPONSE
    ========================================
    */

    return NextResponse.json(
      {
        success: true,
        message: "Booking submitted successfully.",

        data: {
          id: booking._id,
          experienceTitle: experience.title,
          experienceType: actualExperienceType,

          departureId:
            selectedDeparture?._id || null,

          departureStartDate:
            booking.departureStartDate || null,

          departureEndDate:
            booking.departureEndDate || null,

          packagePrice,
          packageCurrency: currency,
          packagePriceType,
          numberOfPeople: people,
          estimatedTotal,
          status: booking.status,
          seatsReserved: booking.seatsReserved,
          acceptTerms: true,
          emailSent,
          emailError,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/bookings error:", error);

    if (error.name === "ValidationError") {
      return NextResponse.json(
        {
          success: false,
          message: "Booking validation failed.",

          errors: Object.fromEntries(
            Object.entries(error.errors).map(
              ([key, value]) => [
                key,
                value.message,
              ]
            )
          ),
        },
        { status: 400 }
      );
    }

    const message =
      error.message || "Failed to create booking.";

    const isDepartureConflict =
      message.includes("places are currently available") ||
      message.includes("no longer open for booking") ||
      message.includes("booking deadline") ||
      message.includes("already started");

    return NextResponse.json(
      {
        success: false,
        message: isDepartureConflict
          ? message
          : "Failed to create booking.",
        error: message,
      },
      {
        status: isDepartureConflict ? 409 : 500,
      }
    );
  }
}

/*
=========================================
GET BOOKINGS

ADMIN ONLY

GET /api/bookings
=========================================
*/

export async function GET(request) {
  try {
    await connectDB();

    const token = request.cookies.get(
      "admin_token"
    )?.value;

    const admin = verifyAdminToken(token);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Unauthorized. Admin access required.",
        },
        { status: 401 }
      );
    }

    const bookings = await Booking.find()
      .populate({
        path: "experience",
        select: "title slug pageType imageUrl price",
        populate: {
          path: "pageType",
          select: "name slug bookable",
        },
      })
      .populate({
        path: "departure",
        select:
          "startDate endDate bookingDeadline capacity reservedPax status",
      })
      .sort({
        createdAt: -1,
      })
      .lean();

    return NextResponse.json(
      {
        success: true,
        count: bookings.length,
        data: bookings,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET /api/bookings error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch bookings.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
