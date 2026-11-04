import { notFound } from "next/navigation";

import connectDB from "@/lib/mongodb";
import Page from "@/models/Page";
import PageType from "@/models/PageType";
import Region from "@/models/Region";
import Link from "next/link";
import TrekJsonLd from "@/app/components/TrekJsonLd";
import BreadcrumbJsonLd from "@/app/components/BreadcrumbJsonLd";
import FeedbackList from "@/app/components/FeedbackList";
import FeedbackForm from "@/app/components/FeedbackForm";
import ImageGallery from "@/app/components/ImageGallery";
import SectionNavigation from "@/app/components/SectionNavigation";
import SectionCollapse from "@/app/components/SectionCollapse";
import YouTubeVideos from "@/app/components/YouTubeVideos";
import { resolvePageImage, resolveImage, } from "@/lib/imageResolver";
import RichTextContent from "@/app/components/RichTextContent";
import Departure from "@/models/Departure";



/*
=========================================
GET TREK
=========================================
*/

async function getTrek(slug) {

  await connectDB();

  /*
  ========================================
  FIND TREK PAGE TYPE
  ========================================
  */

  const trekType =
    await PageType.findOne({
      slug: "trek",
      published: true,
    }).lean();


  if (!trekType) {
    return null;
  }


  /*
  ========================================
  FIND TREK
  ========================================
  */

  const trek =
    await Page.findOne({
      slug: slug.toLowerCase(),
      pageType: trekType._id,
      published: true,
    })
      .populate("pageType")
      .populate("region")
      .lean();




  /*
  ========================================
  RESOLVE FAQ IMAGE
  ========================================
  */

  if (trek && trek.faqImageUrl) {

    trek.faqImageUrl =
      await resolveImage({
        url: trek.faqImageUrl,
        storage: trek.faqImageStorage,
        key: trek.faqImageKey,
      });

  }

  return trek;
}


/*
=========================================
DYNAMIC SEO METADATA
=========================================
*/

export async function generateMetadata({ params }) {

  const { slug } = await params;

  const trek = await getTrek(slug);


  if (!trek) {

    return {
      title: "Trek Not Found",
      description:
        "The requested trek could not be found.",
    };
  }


  const title =
    trek.seo?.metaTitle ||
    trek.title;


  const description =
    trek.seo?.metaDescription ||
    trek.description ||
    `${trek.title} in Nepal`;


  return {

    title,

    description,

    keywords:
      trek.seo?.keywords || [],

    alternates:
      trek.seo?.canonicalUrl
        ? {
          canonical:
            trek.seo.canonicalUrl,
        }
        : undefined,

    robots:
      trek.seo?.noIndex
        ? {
          index: false,
          follow: false,
        }
        : {
          index: true,
          follow: true,
        },

    openGraph: {

      title:
        trek.seo?.ogTitle ||
        title,

      description:
        trek.seo?.ogDescription ||
        description,

      images:
        trek.seo?.ogImage
          ? [trek.seo.ogImage]
          : trek.imageUrl
            ? [trek.imageUrl]
            : [],
    },
  };
}


/*
=========================================
PAGE
=========================================
*/

export default async function TrekDetailPage({
  params,
}) {

  const { slug } = await params;
  let trek = await getTrek(slug);
  /*
  ========================================
  404
  ========================================
  */

  if (!trek) {
    notFound();
  }


  /*
  ========================================
  RESOLVE PRIMARY TREK IMAGE
  ========================================
  */

  const trekImageUrl =
    await resolvePageImage(trek);


  /*
  ========================================
  BOOKING STATUS
  ========================================
  */

  const isBookable =
    trek.pageType?.bookable === true;

  /*
=========================================
AVAILABLE DEPARTURES
=========================================
*/

  const now = new Date();

  const departures = isBookable
    ? await Departure.find({
      experienceId: trek._id,
      status: "open",
      startDate: { $gte: now },
      $expr: {
        $lt: ["$reservedPax", "$capacity"],
      },
      $or: [
        { bookingDeadline: null },
        { bookingDeadline: { $gte: now } },
      ],
    })
      .select(
        "_id startDate endDate bookingDeadline capacity reservedPax priceOverride"
      )
      .sort({ startDate: 1 })
      .lean()
    : [];

  /*
  ========================================
  PRICE
  ========================================
  */

  const pricingType =
    trek.price?.pricingType || "fixed";


  const fixedPrice =
    Number(trek.price?.amount || 0);


  const paxPrices =
    Array.isArray(trek.price?.paxPrices)
      ? trek.price.paxPrices
      : [];


  /*
  ========================================
  TREK DETAILS
  ========================================
  */

  const details =
    trek.trekDetails || {};


  /*
  ========================================
  BREADCRUMB
  ========================================
  */

  const breadcrumbs = [

    {
      name: "Home",
      url: "/",
    },

    {
      name: "Treks",
      url: "/treks",
    },

    ...(trek.region
      ? [
        {
          name: trek.region.name,
          url: `/treks/${trek.region.slug}`,
        },
      ]
      : []),

    {
      name: trek.title,
      url: `/treks/trek/${trek.slug}`,
    },
  ];

  /*
=========================================
GALLERY IMAGES
=========================================
*/

  const galleryImages =
    Array.isArray(trek.images)
      ? await Promise.all(
        trek.images.map(
          async (image) => {

            const url =
              await resolveImage(
                image
              );

            return {
              url,
              alt:
                image.alt ||
                trek.title ||
                "Trek image",
            };

          }
        )
      )
      : [];

  return (

    <>

      <TrekJsonLd trek={trek} />

      <BreadcrumbJsonLd
        items={breadcrumbs}
      />


      <main>

        {/* =====================================
            HERO
        ===================================== */}

        <section className="relative bg-gray-900">

          <ImageGallery
            images={galleryImages}
            fallbackImage={trekImageUrl}
            fallbackAlt={trek.title}
          />

          <div className="absolute inset-0 flex items-end">

            <div className="mx-auto w-full max-w-7xl px-6 pb-12">

              <div className="max-w-4xl">

                <div className="mb-4 flex flex-wrap gap-2">

                  <span className="rounded-full bg-white/20 px-4 py-2 text-sm text-white backdrop-blur">
                    Trekking
                  </span>

                  {trek.region && (
                    <Link
                      href={`/treks/${trek.region.slug}`}
                      className="rounded-full bg-white/20 px-4 py-2 text-sm text-white backdrop-blur hover:bg-white/30"
                    >
                      {trek.region.name}
                    </Link>
                  )}

                </div>

                <h1 className="text-4xl font-bold text-white md:text-6xl">
                  {trek.title}
                </h1>

                {trek.description && (
                  <p className="mt-5 max-w-3xl text-lg text-white/90">
                    {trek.description}
                  </p>
                )}

              </div>

            </div>

          </div>

        </section>


        {/* =====================================
            Section Navigation
        ===================================== */}

        <SectionNavigation
          sections={[
            {
              id: "overview",
              label: "Overview",
              icon: "📖",
            },
            {
              id: "highlight",
              label: "Highlight",
              icon: "⭐",
            },
            {
              id: "itinerary",
              label: "Itinerary",
              icon: "🗓️",
            },
            {
              id: "trek-information",
              label: "Trek Information",
              icon: "ℹ️",
            },
            {
              id: "included",
              label: "What's Included",
              icon: "✓",
            },
            {
              id: "excluded",
              label: "What's Not Included",
              icon: "×",
            },
            {
              id: "important-information",
              label: "Important Information",
              icon: "⚠️",
            },
            {
              id: "map-faq",
              label: "Map & FAQ",
              icon: "❓",
            },
            {
              id: "reviews",
              label: "Review",
              icon: "💬",
            },
          ]}
        />


        {/* =====================================
            MAIN CONTENT
        ===================================== */}

        <section className="mx-auto max-w-full px-6 py-12">

          <div className="grid gap-10 lg:grid-cols-3">


            {/* =================================
                LEFT CONTENT
            ================================= */}

            <div className="lg:col-span-2">


              {/* ================================
                  QUICK INFORMATION
              ================================= */}

              <div className="text-justify grid grid-cols-2 gap-4 md:grid-cols-4">
                <InfoCard
                  label="Duration"
                  value={details.duration}
                  icon="🕒"
                />

                <InfoCard
                  label="Difficulty"
                  value={details.difficulty}
                  icon="⛰️"
                />

                <InfoCard
                  label="Max Altitude"
                  value={details.maxAltitude}
                  icon="🏔️"
                />

                <InfoCard
                  label="Best Season"
                  value={details.bestSeason}
                  icon="☀️"
                />

              </div>


              {/* ================================
                  DESCRIPTION
              ================================= */}

              {trek.content && (
                <section id="overview" className="mt-12 ">

                  <SectionCollapse title="Overview" >
                    <hr />

                    {/* <div
                      className="text-justify whitespace-pre-line leading-8 text-gray-700 transition-all duration-300"
                    >
                      {trek.content}
                    </div> */}

                    <RichTextContent
                      content={trek.content}
                      className="prose max-w-none prose-p:leading-8 prose-p:text-gray-700 prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:hover:underline"
                    />
                  </SectionCollapse>
                </section>
              )}
              {/* ================================
                  Highlight
              ================================= */}

              {trek.highlight && (

                <section id="highlight" className="mt-12">

                  <SectionCollapse title="Trip Highlights">
                    <hr />

                    {/* <div
                      className="text-justify whitespace-pre-line leading-8 text-gray-700 transition-all duration-300"
                    >

                      {trek.highlight}

                    </div> */}

                    <RichTextContent
                      content={trek.highlight}
                      className="prose max-w-none prose-p:leading-8 prose-p:text-gray-700 prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:hover:underline"
                    />
                  </SectionCollapse>

                </section>

              )}


              {/* ================================
                  TREK DETAILS
              ================================= */}

              <section id="trek-information" className="mt-12">


                <SectionCollapse title="Trek Information">
                  <hr />

                  <div className="text-justify grid gap-4 md:grid-cols-2 transition-all duration-300">

                    <DetailRow
                      label="Starting Point"
                      value={details.startingPoint}
                      icon="📍"
                    />

                    <DetailRow
                      label="Ending Point"
                      value={details.endingPoint}
                      icon="🏁"
                    />

                    <DetailRow
                      label="Accommodation"
                      value={details.accommodation}
                      icon="🛏️"
                    />

                    <DetailRow
                      label="Meals"
                      value={details.meals}
                      icon="🍽️"
                    />

                    <DetailRow
                      label="Group Size"
                      value={details.groupSize}
                      icon="👥"
                    />

                    <DetailRow
                      label="Permits"
                      value={details.permits}
                      icon="🎫"
                    />

                    <DetailRow
                      label="Transportation"
                      value={details.transportation}
                      icon="🚐"
                    />

                    <DetailRow
                      label="Guide"
                      value={details.guide}
                      icon="🧭"
                    />

                  </div>
                </SectionCollapse>

              </section>


              {/* ================================
                  ITINERARY
              ================================= */}

              {/* ITINERARY */}

              {trek.itinerary?.length > 0 && (

                <section id="itinerary" className="mt-12">
                  <SectionCollapse title="Itinerary">
                    <div className="space-y-5">
                      {trek.itinerary.map((day, index) => (
                        <div
                          key={index}
                          className="rounded-xl border bg-white p-6 shadow-sm"
                        >
                          <SectionCollapse
                            title={`Day:${day.day}  ${day.title}`}
                          >
                            {/* DAY DESCRIPTION */}


                            {/* {day.description && (
                              <p className="mt-3 whitespace-pre-line text-justify leading-7 text-gray-600">
                                {day.description}
                              </p>
                            )} */}

                            {day.description && (
                              <RichTextContent
                                content={day.description}
                                className="prose max-w-none prose-p:leading-7 prose-p:text-gray-600 prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:hover:underline"
                              />
                            )}

                            {/* DAY DETAILS */}

                            <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
                              {day.altitude && (
                                <span>
                                  🏔️ Altitude: {day.altitude}
                                </span>
                              )}

                              {day.walkingHours && (
                                <span>
                                  🚶 Walking: {day.walkingHours}
                                </span>
                              )}

                              {day.accommodation && (
                                <span>
                                  🛏️ Stay: {day.accommodation}
                                </span>
                              )}

                              {day.meal && (
                                <span>
                                  🍽️ Meal: {day.meal}
                                </span>
                              )}
                            </div>
                          </SectionCollapse>
                        </div>
                      ))}
                    </div>
                  </SectionCollapse>


                </section>
              )}





            </div>


            {/* =================================
                SIDEBAR
            ================================= */}

            <aside>

              <div className="sticky top-24 rounded-2xl border bg-white p-6 shadow-lg">

                <h2 className="text-2xl font-bold">

                  {pricingType === "pax_based"
                    ? "Pricing"
                    : "Package Price"}

                </h2>


                {pricingType === "fixed" ? (

                  <div className="mt-5">

                    <span className="text-4xl font-bold">

                      {trek.price?.currency || "USD"}{" "}

                      {fixedPrice.toLocaleString()}

                    </span>

                    <span className="ml-2 text-gray-500">

                      / person

                    </span>

                  </div>

                ) : (

                  <div className="mt-5 space-y-3">

                    {paxPrices.map(
                      (tier, index) => (

                        <div
                          key={index}
                          className="flex justify-between rounded-lg bg-gray-50 p-3"
                        >

                          <span>

                            {tier.minPax}

                            {" – "}

                            {tier.maxPax ?? "16+"}

                            {" people"}

                          </span>


                          <strong>

                            {trek.price?.currency || "USD"}{" "}

                            {Number(
                              tier.pricePerPax
                            ).toLocaleString()}

                          </strong>

                        </div>

                      )
                    )}

                  </div>

                )}

                      {/* ================================
    GENERAL BOOKING
================================= */}

{isBookable && (
                  <Link
                    href={`/booking?experienceId=${trek._id}&experienceType=${trek.pageType.slug}`}
                    className={`block rounded-lg bg-gray-900 px-6 py-4 text-center font-semibold text-white transition hover:bg-gray-700 ${departures.length > 0 ? "mt-4" : "mt-8"
                      }`}
                  >
                    Book This Trek
                  </Link>
                )}


                {/* ================================
    AVAILABLE DEPARTURES
================================= */}

                {isBookable && departures.length > 0 && (
                  <div className="mt-8">
                    <h3 className="mb-4 text-xl font-bold text-gray-900">
                      Available Departures
                    </h3>

                    <div className="space-y-4">
                      {departures.map((departure) => {
                        const availablePax = Math.max(
                          0,
                          Number(departure.capacity || 0) -
                          Number(departure.reservedPax || 0)
                        );

                        const startDate = new Date(
                          departure.startDate
                        );

                        const endDate = new Date(
                          departure.endDate
                        );

                        const dateOptions = {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        };

                        const departurePrice =
                          departure.priceOverride?.enabled === true
                            ? departure.priceOverride
                            : trek.price;

                        const departurePricingType =
                          departurePrice?.pricingType || "fixed";

                        return (
                          <div
                            key={String(departure._id)}
                            className="rounded-xl border border-gray-200 p-4"
                          >
                            <p className="font-semibold text-gray-900">
                              {startDate.toLocaleDateString(
                                "en-GB",
                                dateOptions
                              )}
                              {" – "}
                              {endDate.toLocaleDateString(
                                "en-GB",
                                dateOptions
                              )}
                            </p>

                            <div className="mt-3 flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                Available seats
                              </span>

                              <span className="font-semibold text-gray-900">
                                {availablePax}
                              </span>
                            </div>

                            {departurePrice && (
                              <div className="mt-2 text-sm text-gray-600">
                                {departurePricingType === "fixed"
                                  ? `Package price: ${departurePrice.currency ||
                                  "USD"
                                  } ${Number(
                                    departurePrice.amount || 0
                                  ).toLocaleString()} / person`
                                  : "Group-based pricing available"}
                              </div>
                            )}

                            <Link
                              href={`/booking?experienceId=${trek._id}&experienceType=${trek.pageType.slug}&departureId=${departure._id}`}
                              className="mt-4 block rounded-lg bg-emerald-600 px-4 py-3 text-center font-semibold text-white transition hover:bg-emerald-700"
                            >
                              Book This Departure
                            </Link>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}


          



                {/* ================================
                    ENQUIRY
                ================================= */}

                <Link
                  href={`/enquiry?experienceId=${trek._id}&experienceType=${trek.pageType.slug}`}
                  className={`block rounded-lg border border-gray-900 px-6 py-4 text-center font-semibold text-gray-900 transition hover:bg-gray-100 ${isBookable
                    ? "mt-3"
                    : "mt-8"
                    }`}
                >

                  Make an Enquiry

                </Link>


                <p className="mt-5 text-center text-sm text-gray-500">

                  Contact us for availability and
                  personalized trekking arrangements.

                </p>

              </div>

            </aside>

          </div>

          {/* ================================
                  INCLUSIONS
              ================================= */}

          {trek.inclusions?.length > 0 && (

            <section id="included" className="mt-12">


              <SectionCollapse title="What`s Included">
                <hr />
                <ul className="space-y-3 transition-all duration-300">

                  {trek.inclusions.map(
                    (item, index) => (

                      <li
                        key={index}
                        className="flex gap-3 text-gray-700"
                      >

                        <span className="text-justify font-bold text-green-600">
                          ✓
                        </span>

                        <span>{item}</span>

                      </li>

                    )
                  )}

                </ul>
              </SectionCollapse>

            </section>

          )}


          {/* ================================
EXCLUSIONS
================================= */}

          {trek.exclusions?.length > 0 && (

            <section id="excluded" className="mt-12">

              <SectionCollapse title="What`s Not Included">
                <hr />

                <ul className="space-y-3 transition-all duration-300">

                  {trek.exclusions.map(
                    (item, index) => (

                      <li
                        key={index}
                        className="flex gap-3 text-gray-700"
                      >

                        <span className="text-justify font-bold text-red-600">
                          ×
                        </span>

                        <span>{item}</span>

                      </li>

                    )
                  )}

                </ul>
              </SectionCollapse>

            </section>

          )}


          {/* ================================
IMPORTANT INFORMATION
================================= */}

          {trek.importantInformation && (

            <section id="important-information" className="mt-12 rounded-xl bg-gray-50 p-6">


              <SectionCollapse title="Important Information">
                <hr />



                {/* <p className="text-justify whitespace-pre-line leading-7 text-gray-700 transition-all duration-300">

                  {trek.importantInformation}

                </p> */}

                <RichTextContent
                  content={trek.importantInformation}
                  className="prose max-w-none prose-p:leading-7 prose-p:text-gray-700 prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:hover:underline"
                />
              </SectionCollapse>

            </section>

          )}

          {/* =====================================
          FREQUENTLY ASKED QUESTIONS
         ===================================== */}

          {Array.isArray(trek.faqs) &&
            trek.faqs.length > 0 && (

              <section id="map-faq" className="mx-auto mt-16 max-w-full px-6">
                <SectionCollapse title="Map and FAQ">
                  <hr />
                  <div className="grid gap-10 lg:grid-cols-3">

                    {/* FAQ IMAGE */}

                    {trek.faqImageUrl && (

                      <div className="lg:col-span-1">

                        <div className="sticky top-24 overflow-hidden rounded-2xl transition-all duration-300">

                          <Link
                            href={trek.faqImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block cursor-pointer"
                          >
                            <img
                              src={trek.faqImageUrl}
                              alt={`${trek.title} FAQ`}
                              className="h-[520px] w-full object-cover"
                            />

                          </Link>
                        </div>

                      </div>

                    )}

                    {/* FAQ CONTENT */}

                    <div
                      className={
                        trek.faqImageUrl
                          ? "lg:col-span-2"
                          : "lg:col-span-3"
                      }
                    >

                      <div className="mb-8">

                        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                          Frequently Asked Questions
                        </p>

                        <h2 className="mt-2 text-3xl font-bold text-gray-900">
                          Questions About {trek.title}
                        </h2>

                        <p className="mt-3 text-gray-600">
                          Find answers to common questions about this trek.
                        </p>

                      </div>

                      <div className="space-y-4">

                        {trek.faqs.map(
                          (faq, index) => (

                            <details
                              key={index}
                              className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                            >

                              <summary className="text-justify flex cursor-pointer list-none items-center justify-between gap-6 font-semibold text-gray-900">

                                <span>
                                  {faq.question}
                                </span>

                                <span className="text-2xl text-emerald-600 transition-transform duration-300 group-open:rotate-45">
                                  +
                                </span>

                              </summary>

                              {faq.answer && (

                                <div className="mt-4 border-t border-gray-100 pt-4">

                                  {/* <p className="text-justify leading-7 text-gray-600">
                                    {faq.answer}
                                  </p> */}
                                  <RichTextContent
                                    content={faq.answer}
                                    className="prose max-w-none prose-p:leading-7 prose-p:text-gray-600 prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:hover:underline"
                                  />

                                </div>

                              )}

                            </details>

                          )
                        )}

                      </div>

                    </div>

                  </div>
                </SectionCollapse>

              </section>

            )}

          {/* =====================================
               YouTube Videos
              ===================================== */}

          {Array.isArray(trek.youtubeVideos) &&
            trek.youtubeVideos.length > 0 && (

              <section className="mx-auto mt-16 max-w-6xl">

                <YouTubeVideos
                  videos={trek.youtubeVideos}
                />

              </section>

            )}


          {/* =====================================
              FEEDBACK / COMMENTS
          ===================================== */}

          <section id="reviews" className="mx-auto mt-16 max-w-5xl transition-all duration-300">
            <SectionCollapse title="Reviews">
              <hr />
              <FeedbackList
                pageId={String(trek._id)}
              />
            </SectionCollapse>

            <SectionCollapse title="Review Form">
              <hr />

              <FeedbackForm
                pageId={String(trek._id)}
                pageTitle={trek.title}
              />
            </SectionCollapse>


          </section>

        </section>

      </main>

    </>
  );
}


/*
=========================================
INFO CARD
=========================================
*/

function InfoCard({
  label,
  value,
  icon,
}) {

  if (!value) {
    return null;
  }


  return (

    <div className="rounded-xl bg-gray-50 p-5">

      <div className="flex items-center gap-3">

        <span className="flex h-1 w-1 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
          {icon}
        </span>

        <div>

          <p className="text-sm text-gray-500">
            {label}
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            {value}
          </p>

        </div>

      </div>

    </div>

  );

}


/*
=========================================
DETAIL ROW
=========================================
*/

function DetailRow({
  label,
  value,
  icon,
}) {

  if (!value) {
    return null;
  }


  return (
    // Old format 
    // <div className="rounded-lg border p-4">

    //   <div className="flex items-center gap-3">

    //     <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-xl">
    //       {icon}
    //     </span>

    //     <div>

    //       <p className="text-sm text-gray-500">
    //         {label}
    //       </p>

    //       <p className="mt-1 font-medium text-gray-900">
    //         {value}
    //       </p>

    //     </div>

    //   </div>

    // </div>
    <div className="rounded-xl bg-gray-50 p-5">

      <div className="flex items-center gap-3">

        <span className="flex h-1 w-1 shrink-0 items-center justify-center rounded-full bg-white text-xl shadow-sm">
          {icon}
        </span>

        <div>

          <p className="text-sm text-gray-500">
            {label}
          </p>

          <p className="mt-1 font-semibold text-gray-900">
            {value}
          </p>

        </div>

      </div>

    </div>

  );

}

