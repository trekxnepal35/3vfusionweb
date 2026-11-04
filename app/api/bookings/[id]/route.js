
import { NextResponse } from "next/server";
import mongoose from "mongoose";

import connectDB from "@/lib/mongodb";

import Booking from "@/models/Booking";
import Page from "@/models/Page";
import Departure from "@/models/Departure";

import { verifyAdminToken } from "@/lib/auth";

/*
====================================================
HELPERS
====================================================
*/

function errorResponse(message, status = 500) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

function getAdmin(request) {
  const token = request.cookies.get("admin_token")?.value;
  return verifyAdminToken(token);
}

function getPriceForBooking(experience, departure, numberOfPeople) {
  const price =
    departure?.priceOverride?.enabled === true
      ? departure.priceOverride
      : experience.price;

  const pricingType = price?.pricingType || "fixed";

  let pricePerPax = 0;

  if (pricingType === "fixed") {
    pricePerPax = Number(price?.amount || 0);
  } else if (pricingType === "pax_based") {
    const tiers = Array.isArray(price?.paxPrices)
      ? price.paxPrices
      : [];

    const matchingTier = tiers.find((tier) => {
      const minPax = Number(tier.minPax);

      const maxPax =
        tier.maxPax === null ||
          tier.maxPax === undefined ||
          tier.maxPax === ""
          ? null
          : Number(tier.maxPax);

      if (!Number.isFinite(minPax) || minPax < 1) {
        return false;
      }

      if (numberOfPeople < minPax) {
        return false;
      }

      if (
        maxPax !== null &&
        Number.isFinite(maxPax) &&
        numberOfPeople > maxPax
      ) {
        return false;
      }

      return true;
    });

    if (!matchingTier) {
      throw new Error(
        `No pricing tier available for ${numberOfPeople} people`
      );
    }

    pricePerPax = Number(matchingTier.pricePerPax || 0);
  } else {
    throw new Error("Invalid pricing type");
  }

  if (!Number.isFinite(pricePerPax) || pricePerPax <= 0) {
    throw new Error("Invalid experience price");
  }

  return {
    pricePerPax,
    currency: price?.currency || "USD",
    pricingType,
    estimatedTotal: pricePerPax * numberOfPeople,
  };
}

/*
====================================================
VALIDATE DEPARTURE BEFORE RESERVING SEATS
====================================================
*/

function validateDepartureForReservation(departure) {
  const now = new Date();

  if (departure.status !== "open") {
    throw new Error(
      "This departure is no longer open for booking."
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

  if (!departure.startDate) {
    throw new Error("Departure start date is missing.");
  }

  const startDate = new Date(departure.startDate);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Departure start date is invalid.");
  }

  /*
  Date-only values stored at midnight remain valid
  throughout their calendar day.

  Datetime values are checked precisely.
  */

  const isDateOnly =
    startDate.getUTCHours() === 0 &&
    startDate.getUTCMinutes() === 0 &&
    startDate.getUTCSeconds() === 0 &&
    startDate.getUTCMilliseconds() === 0;


  const nepalToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const hasStarted = isDateOnly
    ? startDate.toISOString().slice(0, 10) < nepalToday
    : startDate <= now;


  if (hasStarted) {
    throw new Error(
      "This departure has already started."
    );
  }
}

/*
====================================================
UPDATE DEPARTURE SEAT COUNT
====================================================

Positive delta = reserve more seats.
Negative delta = release seats.

Conditional database updates prevent:
- Exceeding departure capacity.
- Reducing reserved seats below zero.
====================================================
*/

async function updateDepartureSeats(
  departureId,
  delta,
  session
) {
  if (!departureId || delta === 0) {
    return;
  }

  const absoluteDelta = Math.abs(delta);

  let result;

  if (delta > 0) {
    result = await Departure.updateOne(
      {
        _id: departureId,
        $expr: {
          $lte: [
            {
              $add: [
                { $ifNull: ["$reservedPax", 0] },
                absoluteDelta,
              ],
            },
            "$capacity",
          ],
        },
      },
      {
        $inc: {
          reservedPax: absoluteDelta,
        },
      },
      { session }
    );
  } else {
    result = await Departure.updateOne(
      {
        _id: departureId,
        $expr: {
          $gte: [
            { $ifNull: ["$reservedPax", 0] },
            absoluteDelta,
          ],
        },
      },
      {
        $inc: {
          reservedPax: -absoluteDelta,
        },
      },
      { session }
    );
  }

  if (result.modifiedCount !== 1) {
    throw new Error(
      delta > 0
        ? "Not enough departure seats available to reserve this booking."
        : "Could not release departure seats. Please check the departure's reserved seat count."
    );
  }
}

/*
====================================================
GET SINGLE BOOKING
====================================================
*/

export async function GET(request, { params }) {
  try {
    await connectDB();

    const admin = getAdmin(request);

    if (!admin) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid booking ID", 400);
    }

    const booking = await Booking.findById(id)
      .populate({
        path: "experience",
        select: "title slug imageUrl pageType region price published",
        populate: [
          {
            path: "pageType",
            select: "name slug",
          },
          {
            path: "region",
            select: "name slug",
          },
        ],
      })
      .populate({
        path: "departure",
        select:
          "startDate endDate bookingDeadline capacity reservedPax status",
      })
      .lean();

    if (!booking) {
      return errorResponse("Booking not found", 404);
    }

    return NextResponse.json(
      {
        success: true,
        booking,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("GET SINGLE BOOKING ERROR:", error);

    return errorResponse(
      error.message || "Failed to fetch booking",
      500
    );
  }
}

/*
====================================================
UPDATE BOOKING
====================================================
*/

export async function PUT(request, { params }) {
  let session;

  try {
    await connectDB();

    const admin = getAdmin(request);

    if (!admin) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid booking ID", 400);
    }

    const body = await request.json();

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      /*
      ================================================
      FIND BOOKING
      ================================================
      */

      const booking = await Booking.findById(id).session(session);

      if (!booking) {
        throw new Error("Booking not found");
      }

      const previousStatus = booking.status;

      const previousPeople = Number(
        booking.numberOfPeople || 1
      );

      /*
      ================================================
      UPDATE CUSTOMER INFORMATION
      ================================================
      */

      if (body.name !== undefined) {
        booking.name = String(body.name).trim();
      }

      if (body.email !== undefined) {
        booking.email = String(body.email).trim().toLowerCase();
      }

      if (body.phone !== undefined) {
        booking.phone = String(body.phone).trim();
      }

      if (body.country !== undefined) {
        booking.country = String(body.country).trim();
      }

      if (body.numberOfPeople !== undefined) {
        const numberOfPeople = Number(body.numberOfPeople);

        if (
          !Number.isInteger(numberOfPeople) ||
          numberOfPeople < 1
        ) {
          throw new Error(
            "Number of people must be at least 1"
          );
        }

        booking.numberOfPeople = numberOfPeople;
      }

      if (body.preferredDate !== undefined) {
        booking.preferredDate = body.preferredDate;
      }

      if (body.message !== undefined) {
        booking.message = String(body.message).trim();
      }

      /*
      ================================================
      UPDATE STATUS
      ================================================
      */

      if (body.status !== undefined) {
        const allowedStatuses = [
          "pending",
          "confirmed",
          "cancelled",
        ];

        if (!allowedStatuses.includes(body.status)) {
          throw new Error("Invalid booking status");
        }

        booking.status = body.status;
      }

      const newStatus = booking.status;

      const newPeople = Number(
        booking.numberOfPeople || 1
      );

      /*
      ================================================
      LOAD EXPERIENCE
      ================================================
      */

      const experience = await Page.findById(
        booking.experience
      )
        .populate({
          path: "pageType",
          select: "name slug",
        })
        .session(session)
        .lean();

      if (!experience) {
        throw new Error("Associated experience not found");
      }

      const pageType = experience.pageType;

      if (!pageType) {
        throw new Error("Experience page type not found");
      }

      if (
        booking.experienceType &&
        booking.experienceType !== pageType.slug
      ) {
        booking.experienceType = pageType.slug;
      }

      /*
      ================================================
      LOAD SELECTED DEPARTURE
      ================================================
      */

      let departure = null;

      if (booking.departure) {
        departure = await Departure.findById(
          booking.departure
        ).session(session);

        if (!departure) {
          throw new Error(
            "The departure associated with this booking was not found."
          );
        }

        if (
          !departure.experienceId ||
          departure.experienceId.toString() !==
          booking.experience.toString()
        ) {
          throw new Error(
            "The selected departure does not belong to this experience."
          );
        }
      }

      /*
      ================================================
      CALCULATE RESERVATION STATE

      New public bookings reserve seats immediately,
      even while their status is pending.

      Legacy pending bookings without seatsReserved
      remain unreserved until confirmed.

      Confirming a booking that already reserved seats
      does not reserve them a second time.
      ================================================
      */

      const previouslyReserved =
        booking.seatsReserved === true ||
        previousStatus === "confirmed";

      let shouldBeReserved = previouslyReserved;

      if (newStatus === "cancelled") {
        shouldBeReserved = false;
      } else if (newStatus === "confirmed") {
        shouldBeReserved = true;
      }

      const previousReservedPeople =
        previouslyReserved ? previousPeople : 0;

      const newReservedPeople =
        shouldBeReserved ? newPeople : 0;

      const seatDelta =
        newReservedPeople - previousReservedPeople;

      /*
      ================================================
      VALIDATE BEFORE RESERVING ADDITIONAL SEATS
      ================================================
      */

      if (departure && seatDelta > 0) {
        validateDepartureForReservation(departure);
      }

      /*
      ================================================
      UPDATE DEPARTURE SEATS
      ================================================
      */

      if (departure && seatDelta !== 0) {
        await updateDepartureSeats(
          departure._id,
          seatDelta,
          session
        );
      }

      /*
      ================================================
      SAVE RESERVATION STATE
      ================================================
      */

      booking.seatsReserved = shouldBeReserved;

      /*
      ================================================
      RECALCULATE PRICE ONLY WHEN PASSENGER COUNT CHANGES

      Preserve the existing price snapshot when an admin
      only changes customer information or booking status.
      ================================================
      */

      if (newPeople !== previousPeople) {
        const calculatedPrice = getPriceForBooking(
          experience,
          departure,
          newPeople
        );

        booking.packagePrice =
          calculatedPrice.pricePerPax;

        booking.packageCurrency =
          calculatedPrice.currency;

        booking.packagePriceType =
          calculatedPrice.pricingType;

        booking.estimatedTotal =
          calculatedPrice.estimatedTotal;
      }

      /*
      ================================================
      SAVE BOOKING
      ================================================
      */

      await booking.save({ session });
    });

    /*
    ================================================
    GET UPDATED BOOKING
    ================================================
    */

    const updatedBooking = await Booking.findById(id)
      .populate({
        path: "experience",
        select: "title slug imageUrl pageType region price published",
        populate: [
          {
            path: "pageType",
            select: "name slug",
          },
          {
            path: "region",
            select: "name slug",
          },
        ],
      })
      .populate({
        path: "departure",
        select:
          "startDate endDate bookingDeadline capacity reservedPax status",
      })
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Booking updated successfully",
        booking: updatedBooking,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("UPDATE BOOKING ERROR:", error);

    const message =
      error.message || "Failed to update booking";

    let status = 500;

    if (
      message === "Booking not found" ||
      message === "Associated experience not found" ||
      message ===
      "The departure associated with this booking was not found."
    ) {
      status = 404;
    } else if (
      message === "Invalid booking ID" ||
      message === "Invalid booking status" ||
      message === "Number of people must be at least 1" ||
      message === "Experience page type not found" ||
      message === "Invalid pricing type" ||
      message === "Invalid experience price" ||
      message === "Departure start date is missing." ||
      message === "Departure start date is invalid." ||
      message.startsWith("No pricing tier available") ||
      message.includes("does not belong to this experience")
    ) {
      status = 400;
    } else if (
      message.includes("Not enough departure seats") ||
      message.includes("Could not release departure seats") ||
      message.includes("no longer open for booking") ||
      message.includes("booking deadline") ||
      message.includes("already started")
    ) {
      status = 409;
    }

    return errorResponse(message, status);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

/*
====================================================
DELETE BOOKING
====================================================
*/

export async function DELETE(request, { params }) {
  let session;

  try {
    await connectDB();

    const admin = getAdmin(request);

    if (!admin) {
      return errorResponse("Unauthorized", 401);
    }

    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse("Invalid booking ID", 400);
    }

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      /*
      ================================================
      FIND BOOKING
      ================================================
      */

      const booking = await Booking.findById(id).session(session);

      if (!booking) {
        throw new Error("Booking not found");
      }

      /*
      ================================================
      RELEASE RESERVED DEPARTURE SEATS

      Also supports older confirmed bookings that were
      created before the seatsReserved field existed.
      ================================================
      */

      const hasReservedSeats =
        booking.seatsReserved === true ||
        booking.status === "confirmed";

      if (hasReservedSeats && booking.departure) {
        const numberOfPeople = Number(
          booking.numberOfPeople || 1
        );

        await updateDepartureSeats(
          booking.departure,
          -numberOfPeople,
          session
        );
      }

      /*
      ================================================
      DELETE BOOKING
      ================================================
      */

      await Booking.deleteOne(
        { _id: booking._id },
        { session }
      );
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Booking deleted and departure seats updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE BOOKING ERROR:", error);

    const message =
      error.message || "Failed to delete booking";

    let status = 500;

    if (message === "Booking not found") {
      status = 404;
    } else if (
      message.includes("Could not release departure seats")
    ) {
      status = 409;
    }

    return errorResponse(message, status);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
