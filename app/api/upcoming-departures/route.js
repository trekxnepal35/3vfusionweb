
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Departure from "@/models/Departure";

import { resolvePageImages } from "@/lib/imageResolver";

/*
====================================================
GET NEPAL TODAY
====================================================
*/

function getNepalToday() {
  const now = new Date();

  const nepalDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const [year, month, day] = nepalDate.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day));
}

/*
====================================================
GET STARTING PRICE
====================================================
*/

function getStartingPrice(experience, departure) {
  let price = experience.price || {};

  if (departure.priceOverride?.enabled === true) {
    price = departure.priceOverride;
  }

  const currency = price.currency || "USD";

  if (price.pricingType === "pax_based") {
    const tiers = Array.isArray(price.paxPrices)
      ? price.paxPrices
      : [];

    const validPrices = tiers
      .map((tier) => Number(tier.pricePerPax))
      .filter(
        (amount) =>
          Number.isFinite(amount) && amount > 0
      );

    if (validPrices.length === 0) {
      return null;
    }

    return {
      currency,
      amount: Math.min(...validPrices),
      label: "Starting from",
    };
  }

  const amount = Number(price.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    currency,
    amount,
    label: "",
  };
}

/*
====================================================
GET UPCOMING DEPARTURES
====================================================
*/

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const requestedLimit = Number(searchParams.get("limit")) || 6;

    const limit = Math.min(
      Math.max(requestedLimit, 1),
      20
    );

    const now = new Date();
    const today = getNepalToday();

    /*
    ================================================
    FIND UPCOMING DEPARTURES
    ================================================
    */

    const departureDocuments = await Departure.find({
      status: "open",

      startDate: {
        $gte: today,
      },

      $expr: {
        $lt: [
          { $ifNull: ["$reservedPax", 0] },
          "$capacity",
        ],
      },

      $or: [
        { bookingDeadline: null },
        { bookingDeadline: { $exists: false } },
        { bookingDeadline: { $gte: now } },
      ],
    })
      .populate({
        path: "experienceId",
        match: {
          published: true,
        },
        select:
          "title slug description imageUrl images price pageType trekDetails tourDetails",
        populate: {
          path: "pageType",
          match: {
            published: true,
            bookable: true,
          },
          select: "name slug bookable published",
        },
      })
      .sort({
        startDate: 1,
      })
      .limit(limit)
      .lean();

    /*
    ================================================
    FILTER VALID EXPERIENCES
    ================================================
    */

    const validDepartures = departureDocuments.filter(
      (departure) =>
        departure.experienceId &&
        departure.experienceId.pageType &&
        departure.experienceId.pageType.bookable === true
    );

    /*
    ================================================
    GET UNIQUE EXPERIENCES
    ================================================
    */

    const uniqueExperiences = [
      ...new Map(
        validDepartures.map((departure) => [
          departure.experienceId._id.toString(),
          departure.experienceId,
        ])
      ).values(),
    ];

    /*
    ================================================
    RESOLVE AWS S3 / CLOUDINARY IMAGES
    ================================================
    */

    const resolvedExperiences =
      uniqueExperiences.length > 0
        ? await resolvePageImages(uniqueExperiences)
        : [];

    const experienceMap = new Map(
      (resolvedExperiences || []).map((experience) => [
        experience._id.toString(),
        experience,
      ])
    );

    /*
    ================================================
    PREPARE API RESPONSE
    ================================================
    */

    const departures = validDepartures.map((departure) => {
      const experience =
        experienceMap.get(
          departure.experienceId._id.toString()
        ) || departure.experienceId;

      const availablePax = Math.max(
        0,
        Number(departure.capacity || 0) -
          Number(departure.reservedPax || 0)
      );

      return {
        _id: departure._id.toString(),

        startDate: departure.startDate,
        endDate: departure.endDate,

        capacity: departure.capacity,
        reservedPax: departure.reservedPax || 0,
        availablePax,

        price: getStartingPrice(experience, departure),

        experience: {
          _id: experience._id.toString(),
          title: experience.title,
          slug: experience.slug,
          description: experience.description,

          imageUrl: experience.imageUrl || null,
          cardImageUrl: experience.cardImageUrl || null,

          pageType: experience.pageType
            ? {
                name: experience.pageType.name,
                slug: experience.pageType.slug,
              }
            : null,

          trekDetails: experience.trekDetails || {},
          tourDetails: experience.tourDetails || {},
        },
      };
    });

    return NextResponse.json({
      success: true,
      count: departures.length,
      data: departures,
    });

  } catch (error) {
    console.error(
      "Upcoming departures API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load upcoming departures.",
      },
      {
        status: 500,
      }
    );
  }
}
