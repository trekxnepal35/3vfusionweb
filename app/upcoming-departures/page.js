import Link from "next/link";

import connectDB from "@/lib/mongodb";

import Departure from "@/models/Departure";
import Page from "@/models/Page";
import PageType from "@/models/PageType";

import { resolvePageImages } from "@/lib/imageResolver";

export const metadata = {
  title: "Upcoming Departures | Trekking and Tours in Nepal",
  description:
    "Explore upcoming trekking, tours and travel departures in Nepal. Check available seats and reserve your trip.",
};

/*
====================================================
FORMAT DATE
====================================================
*/

function formatDate(date) {
  if (!date) return "";

  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kathmandu",
  });
}

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
EXPERIENCE DETAILS URL
====================================================
*/

function getExperienceUrl(experience) {
  const type = experience.pageType?.slug;
  const slug = experience.slug;

  if (!slug) return null;

  if (type === "trek") {
    return `/treks/trek/${encodeURIComponent(slug)}`;
  }

  if (type === "tour") {
    return `/tours/${encodeURIComponent(slug)}`;
  }
  if (type === "wellness") {
    return `/wellness/${encodeURIComponent(slug)}`;
  }

  return null;
}

/*
====================================================
UPCOMING DEPARTURES PAGE
====================================================
*/

export default async function UpcomingDeparturesPage() {
  await connectDB();

  const now = new Date();
  const today = getNepalToday();

  /*
  ==================================================
  FIND UPCOMING DEPARTURES
  ==================================================
  */

  const departureDocuments = await Departure.find({
    status: "open",

    startDate: {
      $gte: today,
    },

    // Only departures with available seats.
    $expr: {
      $lt: [
        { $ifNull: ["$reservedPax", 0] },
        "$capacity",
      ],
    },

    // Booking deadline must not have passed.
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
    .lean();

  /*
  ==================================================
  FILTER VALID EXPERIENCES
  ==================================================
  */

  const validDepartures = departureDocuments.filter(
    (departure) =>
      departure.experienceId &&
      departure.experienceId.pageType &&
      departure.experienceId.pageType.bookable === true
  );

  /*
  ==================================================
  TEMPORARY DIAGNOSTICS
  ==================================================
  */




  /*
  ==================================================
  RESOLVE EXPERIENCE IMAGES
  ==================================================
  */

  const uniqueExperiences = [
    ...new Map(
      validDepartures.map((departure) => [
        departure.experienceId._id.toString(),
        departure.experienceId,
      ])
    ).values(),
  ];

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
  ==================================================
  PREPARE DEPARTURE DATA
  ==================================================
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
      ...departure,
      experience,
      availablePax,
      price: getStartingPrice(experience, departure),
    };
  });

  /*
  ==================================================
  PAGE
  ==================================================
  */

  return (
    <main className="min-h-screen bg-gray-50">

      {/* HERO */}

      <section className="bg-gray-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-300">
            Plan Your Next Adventure
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">
            Upcoming Departures
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-300">
            Explore upcoming treks, tours and travel
            experiences in Nepal. Choose your departure
            date and reserve your place.
          </p>
        </div>
      </section>

      {/* DEPARTURE LIST */}

      <section className="px-6 py-14">
        <div className="mx-auto max-w-7xl">

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">
              Available Upcoming Trips
            </h2>

            <p className="mt-2 text-gray-600">
              {departures.length} upcoming{" "}
              {departures.length === 1
                ? "departure"
                : "departures"}{" "}
              available for reservation.
            </p>
          </div>

          {departures.length === 0 ? (
            <div className="rounded-xl bg-white p-12 text-center shadow">
              <h2 className="text-2xl font-semibold text-gray-800">
                No Upcoming Departures
              </h2>

              <p className="mt-3 text-gray-600">
                There are currently no open departures
                with available seats. Please check again
                later.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/treks"
                  className="rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white hover:bg-gray-700"
                >
                  Explore Treks
                </Link>

                <Link
                  href="/tours"
                  className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-800 hover:bg-gray-100"
                >
                  Explore Tours
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

              {departures.map((departure) => {
                const experience = departure.experience;

                const experienceUrl =
                  getExperienceUrl(experience);

                const experienceType =
                  experience.pageType?.slug || "experience";

                const bookingUrl =
                  `/booking?experienceId=${encodeURIComponent(
                    experience._id.toString()
                  )}&experienceType=${encodeURIComponent(
                    experienceType
                  )}&departureId=${encodeURIComponent(
                    departure._id.toString()
                  )}`;

                return (
                  <article
                    key={departure._id.toString()}
                    className="overflow-hidden rounded-xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
                  >

                    {/* IMAGE */}

                    {experience.imageUrl ? (
                      <img
                        src={experience.imageUrl}
                        alt={experience.title || "Trip"}
                        className="h-60 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-60 items-center justify-center bg-gray-200 text-gray-500">
                        No Image Available
                      </div>
                    )}

                    {/* CONTENT */}

                    <div className="p-6">

                      <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-blue-800">
                        {experience.pageType?.name ||
                          experienceType}
                      </span>

                      <h2 className="mt-3 text-xl font-bold text-gray-900">
                        {experience.title}
                      </h2>

                      {experience.description && (
                        <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                          {experience.description}
                        </p>
                      )}

                      {/* DEPARTURE DATES */}

                      <div className="mt-5 space-y-2 border-t pt-4 text-sm text-gray-700">
                        <p>
                          <strong>Start Date:</strong>{" "}
                          {formatDate(departure.startDate)}
                        </p>

                        <p>
                          <strong>End Date:</strong>{" "}
                          {formatDate(departure.endDate)}
                        </p>

                        <p>
                          <strong>Available Seats:</strong>{" "}
                          <span className="font-semibold text-green-700">
                            {departure.availablePax}
                          </span>
                        </p>
                      </div>

                      {/* DURATION */}

                      {(experience.trekDetails?.duration ||
                        experience.tourDetails?.duration) && (
                        <p className="mt-3 text-sm text-gray-700">
                          <strong>Duration:</strong>{" "}
                          {experience.trekDetails?.duration ||
                            experience.tourDetails?.duration}
                        </p>
                      )}

                      {/* PRICE */}

                      {departure.price && (
                        <div className="mt-4">
                          <span className="text-lg font-bold text-gray-900">
                            {departure.price.label
                              ? `${departure.price.label} `
                              : ""}
                            {departure.price.currency}{" "}
                            {departure.price.amount.toLocaleString(
                              "en-US"
                            )}
                          </span>

                          <span className="ml-2 text-sm text-gray-500">
                            / person
                          </span>
                        </div>
                      )}

                      {/* ACTIONS */}

                      <div className="mt-6 flex flex-col gap-3">
                        <Link
                          href={bookingUrl}
                          className="rounded-lg bg-green-700 px-5 py-3 text-center font-semibold text-white transition hover:bg-green-800"
                        >
                          Reserve This Departure
                        </Link>

                        {experienceUrl && (
                          <Link
                            href={experienceUrl}
                            className="rounded-lg border border-gray-300 px-5 py-3 text-center font-semibold text-gray-800 transition hover:bg-gray-100"
                          >
                            View Details
                          </Link>
                        )}
                      </div>

                    </div>
                  </article>
                );
              })}

            </div>
          )}

        </div>
      </section>
    </main>
  );
}