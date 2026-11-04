
// app/api/admin/departures/route.js

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import Departure from "@/models/Departure";
import Page from "@/models/Page";
import { verifyAdminToken } from "@/lib/auth";

const ALLOWED_STATUSES = [
  "draft",
  "open",
  "full",
  "closed",
  "cancelled",
  "completed",
];

/*
==================================================
ADMIN AUTHENTICATION
==================================================
*/

async function getAdminFromRequest(request) {
  const token = request.cookies.get("admin_token")?.value;

  if (!token) {
    return null;
  }

  return await verifyAdminToken(token);
}

/*
==================================================
HELPERS
==================================================
*/

function isValidDate(value) {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    !Number.isNaN(new Date(value).getTime())
  );
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value));
}

function validateDeparture(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["Invalid departure request body."];
  }

  if (!body.experienceId) {
    errors.push("Experience is required.");
  } else if (!isValidObjectId(body.experienceId)) {
    errors.push("Invalid experience ID.");
  }

  if (!isValidDate(body.startDate)) {
    errors.push("A valid start date is required.");
  }

  if (!isValidDate(body.endDate)) {
    errors.push("A valid end date is required.");
  }

  const capacity = Number(body.capacity);

  if (
    body.capacity === "" ||
    body.capacity === null ||
    body.capacity === undefined ||
    !Number.isInteger(capacity) ||
    capacity < 1
  ) {
    errors.push("Capacity must be a positive whole number.");
  }

  if (
    body.status !== undefined &&
    !ALLOWED_STATUSES.includes(body.status)
  ) {
    errors.push("Invalid departure status.");
  }

  if (
    body.bookingDeadline !== undefined &&
    body.bookingDeadline !== null &&
    body.bookingDeadline !== "" &&
    !isValidDate(body.bookingDeadline)
  ) {
    errors.push("Booking deadline must be a valid date.");
  }

  if (
    isValidDate(body.startDate) &&
    isValidDate(body.endDate) &&
    new Date(body.endDate) < new Date(body.startDate)
  ) {
    errors.push("End date must be on or after the start date.");
  }

  if (
    body.bookingDeadline &&
    isValidDate(body.bookingDeadline) &&
    isValidDate(body.startDate) &&
    new Date(body.bookingDeadline) > new Date(body.startDate)
  ) {
    errors.push(
      "Booking deadline cannot be after the start date."
    );
  }

  /*
  PRICE OVERRIDE VALIDATION
  */

  if (body.priceOverride !== undefined) {
    const override = body.priceOverride;

    if (
      !override ||
      typeof override !== "object" ||
      Array.isArray(override)
    ) {
      errors.push("Price override must be an object.");
    } else {
      if (
        override.enabled !== undefined &&
        typeof override.enabled !== "boolean"
      ) {
        errors.push("Price override enabled must be true or false.");
      }

      if (
        override.pricingType !== undefined &&
        !["fixed", "pax_based"].includes(override.pricingType)
      ) {
        errors.push("Invalid departure pricing type.");
      }

      if (
        override.currency !== undefined &&
        (
          typeof override.currency !== "string" ||
          !override.currency.trim()
        )
      ) {
        errors.push("A valid pricing currency is required.");
      }

      if (override.amount !== undefined) {
        const amount = Number(override.amount);

        if (
          override.amount === "" ||
          !Number.isFinite(amount) ||
          amount < 0
        ) {
          errors.push("Departure price must be a valid non-negative number.");
        }
      }

      if (
        override.paxPrices !== undefined &&
        !Array.isArray(override.paxPrices)
      ) {
        errors.push("PAX pricing tiers must be an array.");
      } else if (Array.isArray(override.paxPrices)) {
        for (let i = 0; i < override.paxPrices.length; i++) {
          const tier = override.paxPrices[i];

          if (
            !tier ||
            typeof tier !== "object" ||
            Array.isArray(tier)
          ) {
            errors.push(`Invalid pricing tier at position ${i + 1}.`);
            continue;
          }

          const minPax = Number(tier.minPax);
          const pricePerPax = Number(tier.pricePerPax);

          if (
            !Number.isInteger(minPax) ||
            minPax < 1
          ) {
            errors.push(
              `Pricing tier ${i + 1}: minimum PAX must be a positive whole number.`
            );
          }

          if (
            tier.maxPax !== null &&
            tier.maxPax !== undefined &&
            tier.maxPax !== ""
          ) {
            const maxPax = Number(tier.maxPax);

            if (
              !Number.isInteger(maxPax) ||
              maxPax < 1
            ) {
              errors.push(
                `Pricing tier ${i + 1}: maximum PAX must be a positive whole number.`
              );
            } else if (
              Number.isInteger(minPax) &&
              maxPax < minPax
            ) {
              errors.push(
                `Pricing tier ${i + 1}: maximum PAX cannot be lower than minimum PAX.`
              );
            }
          }

          if (
            tier.pricePerPax === "" ||
            !Number.isFinite(pricePerPax) ||
            pricePerPax < 0
          ) {
            errors.push(
              `Pricing tier ${i + 1}: price per person must be a valid non-negative number.`
            );
          }
        }
      }
    }
  }

  return errors;
}

/*
==================================================
POPULATE CONFIGURATION
==================================================
*/

const populateExperience = {
  path: "experienceId",
  select: "title slug pageType published price",
  populate: {
    path: "pageType",
    select: "name slug bookable",
  },
};

/*
==================================================
GET ALL DEPARTURES
==================================================
*/

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);

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

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const experienceId = searchParams.get("experienceId");

    const filter = {};

    if (status) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid departure status filter.",
          },
          { status: 400 }
        );
      }

      filter.status = status;
    }

    if (experienceId) {
      if (!isValidObjectId(experienceId)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid experience ID.",
          },
          { status: 400 }
        );
      }

      filter.experienceId = experienceId;
    }

    const departures = await Departure.find(filter)
      .populate(populateExperience)
      .sort({
        startDate: 1,
        createdAt: -1,
      })
      .lean({ virtuals: true });

    return NextResponse.json({
      success: true,
      data: departures,
    });
  } catch (error) {
    console.error("GET DEPARTURES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch departures.",
      },
      { status: 500 }
    );
  }
}

/*
==================================================
CREATE DEPARTURE
==================================================
*/

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    let body;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid JSON request body.",
        },
        { status: 400 }
      );
    }

    const errors = validateDeparture(body);

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: errors.join(" "),
          errors,
        },
        { status: 400 }
      );
    }

    await connectDB();

    /*
    VERIFY EXPERIENCE
    */

    const experience = await Page.findById(body.experienceId)
      .populate({
        path: "pageType",
        select: "name slug bookable",
      })
      .lean();

    if (!experience) {
      return NextResponse.json(
        {
          success: false,
          message: "Experience not found.",
        },
        { status: 404 }
      );
    }

    if (experience.pageType?.bookable !== true) {
      return NextResponse.json(
        {
          success: false,
          message: "This experience is not configured as bookable.",
        },
        { status: 400 }
      );
    }

    /*
    BUILD DEPARTURE DATA

    Always initialize reservedPax to zero.
    Never accept reservedPax from the client.
    */

    const departureData = {
      experienceId: experience._id,

      startDate: new Date(body.startDate),

      endDate: new Date(body.endDate),

      bookingDeadline:
        body.bookingDeadline
          ? new Date(body.bookingDeadline)
          : null,

      capacity: Number(body.capacity),

      reservedPax: 0,

      status: body.status || "draft",

      notes:
        typeof body.notes === "string"
          ? body.notes.trim()
          : "",
    };

    /*
    DEPARTURE PRICE OVERRIDE

    Only accept supported fields.
    */

    if (body.priceOverride !== undefined) {
      const override = body.priceOverride;

      departureData.priceOverride = {
        enabled: override.enabled === true,

        currency: override.currency
          ? override.currency.trim().toUpperCase()
          : "USD",

        pricingType: override.pricingType || "fixed",

        amount:
          override.amount === undefined
            ? 0
            : Number(override.amount),

        paxPrices: Array.isArray(override.paxPrices)
          ? override.paxPrices.map((tier) => ({
              minPax: Number(tier.minPax),

              maxPax:
                tier.maxPax === "" ||
                tier.maxPax === null ||
                tier.maxPax === undefined
                  ? null
                  : Number(tier.maxPax),

              pricePerPax: Number(tier.pricePerPax),
            }))
          : [],
      };
    }

    /*
    SAVE DEPARTURE
    */

    const departure = await Departure.create({
      ...departureData,

      ...(admin?._id && isValidObjectId(admin._id)
        ? { createdBy: admin._id }
        : {}),
    });

    /*
    RETURN POPULATED DEPARTURE
    */

    const populatedDeparture = await Departure.findById(
      departure._id
    )
      .populate(populateExperience)
      .lean({ virtuals: true });

    return NextResponse.json(
      {
        success: true,
        message: "Departure created successfully.",
        data: populatedDeparture,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CREATE DEPARTURE ERROR:", error);

    if (
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create departure.",
      },
      { status: 500 }
    );
  }
}
