
// app/api/admin/departures/[id]/route.js

import { NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";
import Departure from "@/models/Departure";
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
HELPERS
==================================================
*/

async function getAdminFromRequest(request) {
  const token = request.cookies.get("admin_token")?.value;

  if (!token) return null;

  return await verifyAdminToken(token);
}

function isValidId(id) {
  return /^[a-f\d]{24}$/i.test(String(id || ""));
}

function isValidDate(value) {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    !Number.isNaN(new Date(value).getTime())
  );
}

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/*
==================================================
REQUEST VALIDATION
==================================================
*/

function validateDeparture(body) {
  const errors = [];

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["Invalid departure request body."];
  }

  if (
    body.startDate !== undefined &&
    !isValidDate(body.startDate)
  ) {
    errors.push("A valid start date is required.");
  }

  if (
    body.endDate !== undefined &&
    !isValidDate(body.endDate)
  ) {
    errors.push("A valid end date is required.");
  }

  if (body.capacity !== undefined) {
    const capacity = Number(body.capacity);

    if (
      body.capacity === "" ||
      body.capacity === null ||
      !Number.isInteger(capacity) ||
      capacity < 1
    ) {
      errors.push("Capacity must be a positive whole number.");
    }
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
    body.notes !== undefined &&
    typeof body.notes !== "string"
  ) {
    errors.push("Notes must be text.");
  }

  /*
  PRICE OVERRIDE
  */

  if (body.priceOverride !== undefined) {
    const override = body.priceOverride;

    if (
      override !== null &&
      (
        typeof override !== "object" ||
        Array.isArray(override)
      )
    ) {
      errors.push("Price override must be an object or null.");
    } else if (override !== null) {
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
      }

      if (Array.isArray(override.paxPrices)) {
        override.paxPrices.forEach((tier, index) => {
          if (
            !tier ||
            typeof tier !== "object" ||
            Array.isArray(tier)
          ) {
            errors.push(`Invalid pricing tier ${index + 1}.`);
            return;
          }

          const minPax = Number(tier.minPax);
          const pricePerPax = Number(tier.pricePerPax);

          if (
            !Number.isInteger(minPax) ||
            minPax < 1
          ) {
            errors.push(
              `Pricing tier ${index + 1}: minimum PAX must be a positive whole number.`
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
                `Pricing tier ${index + 1}: maximum PAX must be a positive whole number.`
              );
            } else if (
              Number.isInteger(minPax) &&
              maxPax < minPax
            ) {
              errors.push(
                `Pricing tier ${index + 1}: maximum PAX cannot be lower than minimum PAX.`
              );
            }
          }

          if (
            tier.pricePerPax === "" ||
            !Number.isFinite(pricePerPax) ||
            pricePerPax < 0
          ) {
            errors.push(
              `Pricing tier ${index + 1}: price per person must be a valid non-negative number.`
            );
          }
        });
      }
    }
  }

  return errors;
}

/*
==================================================
POPULATE DEPARTURE
==================================================
*/

async function populateDeparture(id) {
  return Departure.findById(id)
    .populate({
      path: "experienceId",
      select: "title slug pageType published price",
      populate: {
        path: "pageType",
        select: "name slug bookable",
      },
    })
    .lean({ virtuals: true });
}

/*
==================================================
NORMALIZE PRICE OVERRIDE
==================================================
*/

function buildPriceOverride(override) {
  // Explicitly reset to disabled defaults.
  if (override === null) {
    return {
      enabled: false,
      currency: "USD",
      pricingType: "fixed",
      amount: 0,
      paxPrices: [],
    };
  }

  return {
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
==================================================
GET SINGLE DEPARTURE
==================================================
*/

export async function GET(request, { params }) {
  try {
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid departure ID.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    const departure = await populateDeparture(id);

    if (!departure) {
      return NextResponse.json(
        {
          success: false,
          message: "Departure not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: departure,
    });
  } catch (error) {
    console.error("GET DEPARTURE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch departure.",
      },
      { status: 500 }
    );
  }
}

/*
==================================================
UPDATE DEPARTURE
==================================================

Uses a transaction so concurrent booking seat updates
cannot race with admin capacity changes.
*/

export async function PATCH(request, { params }) {
  let session;

  try {
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid departure ID.",
        },
        { status: 400 }
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

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const departure = await Departure.findById(id).session(session);

      if (!departure) {
        throw createHttpError("Departure not found.", 404);
      }

      /*
      ONLY UPDATE SUPPORTED FIELDS
      */

      const allowedFields = [
        "startDate",
        "endDate",
        "bookingDeadline",
        "capacity",
        "status",
        "notes",
        "priceOverride",
      ];

      for (const field of allowedFields) {
        if (body[field] === undefined) continue;

        if (field === "startDate" || field === "endDate") {
          departure[field] = new Date(body[field]);
        } else if (field === "bookingDeadline") {
          departure.bookingDeadline =
            body[field] === null || body[field] === ""
              ? null
              : new Date(body[field]);
        } else if (field === "capacity") {
          departure.capacity = Number(body.capacity);
        } else if (field === "notes") {
          departure.notes = body.notes.trim();
        } else if (field === "priceOverride") {
          departure.priceOverride = buildPriceOverride(
            body.priceOverride
          );
        } else {
          departure[field] = body[field];
        }
      }

      /*
      CAPACITY VALIDATION
      */

      if (departure.capacity < departure.reservedPax) {
        throw createHttpError(
          `Capacity cannot be lower than the ${departure.reservedPax} already-reserved passengers.`,
          400
        );
      }

      /*
      DATE VALIDATION
      */

      if (departure.endDate < departure.startDate) {
        throw createHttpError(
          "End date must be on or after the start date.",
          400
        );
      }

      if (
        departure.bookingDeadline &&
        departure.bookingDeadline > departure.startDate
      ) {
        throw createHttpError(
          "Booking deadline cannot be after the start date.",
          400
        );
      }

      /*
      STATUS VALIDATION
      */

      if (
        departure.status === "open" &&
        departure.reservedPax >= departure.capacity
      ) {
        throw createHttpError(
          "A departure with no remaining capacity cannot be opened.",
          400
        );
      }

      /*
      AUDIT FIELD
      */

      const adminId = admin?._id || admin?.id;

      if (adminId && isValidId(adminId)) {
        departure.updatedBy = adminId;
      }

      await departure.save({ session });
    });

    const updatedDeparture = await populateDeparture(id);

    return NextResponse.json({
      success: true,
      message: "Departure updated successfully.",
      data: updatedDeparture,
    });
  } catch (error) {
    console.error("UPDATE DEPARTURE ERROR:", error);

    if (
      error.statusCode ||
      error.name === "ValidationError" ||
      error.name === "CastError"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.statusCode || 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update departure.",
      },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

/*
==================================================
DELETE DEPARTURE
==================================================

A departure with reserved passengers cannot be deleted.
The check and deletion happen in one transaction.
*/

export async function DELETE(request, { params }) {
  let session;

  try {
    const admin = await getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid departure ID.",
        },
        { status: 400 }
      );
    }

    await connectDB();

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const departure = await Departure.findById(id).session(session);

      if (!departure) {
        throw createHttpError("Departure not found.", 404);
      }

      if (departure.reservedPax > 0) {
        throw createHttpError(
          "This departure cannot be deleted because passengers are already reserved. Close or cancel it instead.",
          409
        );
      }

      await Departure.deleteOne(
        { _id: id },
        { session }
      );
    });

    return NextResponse.json({
      success: true,
      message: "Departure deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE DEPARTURE ERROR:", error);

    if (error.statusCode) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete departure.",
      },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
