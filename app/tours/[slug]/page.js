
import { notFound } from "next/navigation";

import connectDB from "@/lib/mongodb";
import Page from "@/models/Page";
import PageType from "@/models/PageType";
import Link from "next/link";
import ImageGallery from "@/app/components/ImageGallery";
import BreadcrumbJsonLd from "@/app/components/BreadcrumbJsonLd";
import FeedbackList from "@/app/components/FeedbackList";
import FeedbackForm from "@/app/components/FeedbackForm";
import SectionNavigation from "@/app/components/SectionNavigation";
import SectionCollapse from "@/app/components/SectionCollapse";
import { resolvePageImage, resolveImage, } from "@/lib/imageResolver";
import Region from "@/models/Region";
import YouTubeVideos from "@/app/components/YouTubeVideos";
import RichTextContent from "@/app/components/RichTextContent";
import Departure from "@/models/Departure";


/*
=========================================
GET TOUR
=========================================
*/

async function getTour(slug) {

  await connectDB();


  /*
  ========================================
  FIND TOUR PAGE TYPE
  ========================================
  */

  const tourType =
    await PageType.findOne({
      slug: "tour",
      published: true,
    }).lean();


  if (!tourType) {
    return null;
  }


  /*
  ========================================
  FIND TOUR
  ========================================
  */

  const tour =
    await Page.findOne({
      slug: slug.toLowerCase(),
      pageType: tourType._id,
      published: true,
    })
      .populate("pageType")
      .populate("region")
      .lean();


  /*
========================================
FAQ IMAGE URL
========================================
*/

  if (tour && tour.faqImageUrl) {
    tour.faqImageUrl =
      await resolveImage({
        url: tour.faqImageUrl,
        storage: tour.faqImageStorage,
        key: tour.faqImageKey,
      });
  }

  return tour;
}

/*
=========================================
SEO
=========================================
*/

export async function generateMetadata({
  params,
}) {

  const { slug } = await params;

  const tour =
    await getTour(slug);


  if (!tour) {

    return {
      title: "Tour Not Found",
      description:
        "The requested tour could not be found.",
    };
  }


  const title =
    tour.seo?.metaTitle ||
    tour.title;


  const description =
    tour.seo?.metaDescription ||
    tour.description ||
    `${tour.title} in Nepal`;


  return {

    title,

    description,

    keywords:
      tour.seo?.keywords || [],

    alternates:
      tour.seo?.canonicalUrl
        ? {
          canonical:
            tour.seo.canonicalUrl,
        }
        : undefined,

    robots:
      tour.seo?.noIndex
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
        tour.seo?.ogTitle ||
        title,

      description:
        tour.seo?.ogDescription ||
        description,

      images:
        tour.seo?.ogImage
          ? [tour.seo.ogImage]
          : tour.imageUrl
            ? [tour.imageUrl]
            : [],
    },
  };
}


/*
=========================================
PAGE
=========================================
*/

export default async function TourDetailPage({
  params,
}) {

  const { slug } = await params;

  const tour =
    await getTour(slug);


  /*
  ========================================
  404
  ========================================
  */

  if (!tour) {
    notFound();
  }
  const tourImageUrl =
    await resolvePageImage(tour);

  /*
  ========================================
  BOOKING STATUS
  ========================================
  */

  const isBookable =
    tour.pageType?.bookable === true;


  /*
  =========================================
  AVAILABLE DEPARTURES
  =========================================
  */

  const now = new Date();

  const departures = isBookable
    ? await Departure.find({
      experienceId: tour._id,
      status: "open",
      startDate: { $gte: new Date(now.toISOString().slice(0, 10)) },
      $expr: {
        $lt: ["$reservedPax", "$capacity"],
      },
      $or: [
        { bookingDeadline: null },
        { bookingDeadline: { $exists: false } },
        { bookingDeadline: { $gte: now } },
      ],
    })
      .sort({ startDate: 1 })
      .lean()
    : [];

  /*
  ========================================
  TOUR DETAILS
  ========================================
  */

  const details =
    tour.tourDetails || {};


  /*
  ========================================
  PRICE
  ========================================
  */

  const pricingType =
    tour.price?.pricingType || "fixed";


  const fixedPrice =
    Number(tour.price?.amount || 0);


  const paxPrices =
    Array.isArray(tour.price?.paxPrices)
      ? tour.price.paxPrices
      : [];


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
      name: "Tours",
      url: "/tours",
    },

    {
      name: tour.title,
      url: `/tours/${tour.slug}`,
    },

  ];


  /*
  ========================================
  GalleryImages  ImagesGallery
  ========================================
  */
  /*
========================================
GALLERY IMAGES
========================================
*/

  const galleryImages =
    Array.isArray(tour.images)
      ? await Promise.all(
        tour.images.map(async (image) => {

          const url =
            await resolveImage(image);

          return {
            url,
            alt:
              image.alt ||
              tour.title ||
              "Tour image",
          };

        })
      )
      : [];

  /*
  ========================================
  PAGE
  ========================================
  */

  return (

    <>

      <BreadcrumbJsonLd
        items={breadcrumbs}
      />


      <main>


        {/* =====================================
            HERO
        ===================================== */}

        <section className="relative bg-gray-900">

          {/* =====================================
              IMAGE GALLERY
          ===================================== */}

          <ImageGallery
            images={galleryImages}
            fallbackImage={tourImageUrl}
            fallbackAlt={tour.title}
          />





          {/* =====================================
              HERO CONTENT
          ===================================== */}

          <div className="absolute inset-0 flex items-end">

            <div className="mx-auto w-full max-w-7xl px-6 pb-12">

              <span className="rounded-full bg-white/20 px-4 py-2 text-sm text-white backdrop-blur">

                Tour

              </span>


              <h1 className="mt-5 text-4xl font-bold text-white md:text-6xl">

                {tour.title}

              </h1>


              {tour.description && (

                <p className="mt-5 max-w-3xl text-lg text-white/90">

                  {tour.description}

                </p>

              )}

            </div>

          </div>

        </section>
        {/* =====================================
              Navbar/Page Menus display
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
              id: "tour-information",
              label: "Tour Information",
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
            CONTENT
        ===================================== */}

        <section className="mx-auto max-w-full px-6 py-12">

          <div className="grid gap-10 lg:grid-cols-3">


            {/* =================================
                LEFT
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
                  label="Destination"
                  value={details.destination}
                  icon="📍"
                />

                <InfoCard
                  label="Best Season"
                  value={details.bestSeason}
                  icon="☀️"
                />

              </div>






              {/* ================================
                  CONTENT
              ================================= */}

              {tour.content && (

                <section id="overview" className="mt-12">
                  <SectionCollapse title="Overview">
                    <hr />


                    {/* <div className="text-justify whitespace-pre-line leading-8 text-gray-700 ">

                      {tour.content}

                    </div> */}
                    <RichTextContent
                      content={tour.content}
                      className="prose max-w-none prose-p:leading-8 prose-p:text-gray-700 prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:hover:underline"
                    />

                  </SectionCollapse>

                </section>

              )}


              {/* ================================
                 Highlight
              ================================= */}
              {tour.highlight && (

                <section id="highlight" className="mt-12">


                  <SectionCollapse title="Highlight">
                    <hr />
                    {/* <div className="text-justify whitespace-pre-line leading-8 text-gray-700">

                      {tour.highlight}

                    </div> */}

                    <RichTextContent
                      content={tour.highlight}
                      className="prose max-w-none prose-p:leading-8 prose-p:text-gray-700 prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:hover:underline"
                    />
                  </SectionCollapse>

                </section>

              )}
              {/* ================================
                  TOUR Information
              ================================= */}
              <SectionCollapse title="Tour Information">
                <div id="tour-information" className="text-justify grid grid-cols-2 gap-4 md:grid-cols-3">


                  <InfoCard
                    label="Duration"
                    value={details.duration}
                    icon="🕒"
                  />

                  <InfoCard
                    label="Tour Type"
                    value={details.tourType}
                    icon="🧳"
                  />

                  <InfoCard
                    label="Destination"
                    value={details.destination}
                    icon="📍"
                  />

                  <InfoCard
                    label="Best Season"
                    value={details.bestSeason}
                    icon="☀️"
                  />

                  <InfoCard
                    label="Group Size"
                    value={details.groupSize}
                    icon="👥"
                  />

                  <InfoCard
                    label="Accommodation"
                    value={details.accommodation}
                    icon="🛏️"
                  />

                  <InfoCard
                    label="Transportation"
                    value={details.transportation}
                    icon="🚐"
                  />


                </div>
              </SectionCollapse>




              {/* ================================
                  ITINERARY
              ================================= */}

              {tour.itinerary?.length > 0 && (

                <section id="itinerary" className="mt-12">
                  <SectionCollapse title="Itinerary">
                    <div className="space-y-5">
                      {tour.itinerary.map((day, index) => (
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

                  Pricing

                </h2>


                {pricingType === "fixed" ? (

                  <div className="mt-5">

                    <span className="text-4xl font-bold">

                      {tour.price?.currency || "USD"}{" "}

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

                          </span>


                          <strong>

                            {tour.price?.currency || "USD"}{" "}

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
                    BOOKING
                ================================= */}

                {isBookable && (

                  <Link
                    href={`/booking?experienceId=${tour._id}&experienceType=${tour.pageType.slug}`}
                    className="mt-8 block rounded-lg bg-gray-900 px-6 py-4 text-center font-semibold text-white hover:bg-gray-700"
                  >

                    Book This Tour

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
                            : tour.price;

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
                              href={`/booking?experienceId=${tour._id}&experienceType=${tour.pageType.slug}&departureId=${departure._id}`}
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
                  href={`/enquiry?experienceId=${tour._id}&experienceType=${tour.pageType.slug}`}
                  className={`block rounded-lg border border-gray-900 px-6 py-4 text-center font-semibold text-gray-900 transition hover:bg-gray-100 ${isBookable
                    ? "mt-3"
                    : "mt-8"
                    }`}
                >

                  Make an Enquiry

                </Link>

              </div>

            </aside>

          </div>
          {/* ================================
                  INCLUSIONS
              ================================= */}

          {tour.inclusions?.length > 0 && (

            <section id="included" className="mt-12">


              <SectionCollapse title="What`s Included">
                <hr />
                <ul className="space-y-3">

                  {tour.inclusions.map(
                    (item, index) => (

                      <li
                        key={index}
                        className="flex gap-3"
                      >

                        <span className="text-justify font-bold text-green-600">
                          ✓
                        </span>

                        {item}

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

          {tour.exclusions?.length > 0 && (

            <section id="excluded" className="mt-12">


              <SectionCollapse title="What`s Not Included">
                <hr />


                <ul className="space-y-3">

                  {tour.exclusions.map(
                    (item, index) => (

                      <li
                        key={index}
                        className="text-justify flex gap-3"
                      >

                        <span className="font-bold text-red-600">
                          ×
                        </span>

                        {item}

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

          {tour.importantInformation && (

            <section id="important-information" className="mt-12 rounded-xl bg-gray-50 p-6">

              <SectionCollapse title="Important Information">
                <hr />

                {/* <p className="text-justify whitespace-pre-line leading-7 text-gray-700">

                  {tour.importantInformation}

                </p> */}

                <RichTextContent
                  content={tour.importantInformation}
                  className="prose max-w-none prose-p:leading-7 prose-p:text-gray-700 prose-headings:font-bold prose-headings:text-gray-900 prose-a:text-blue-600 prose-a:hover:underline"
                />
              </SectionCollapse>

            </section>

          )}


          {/* =====================================
               FREQUENTLY ASKED QUESTIONS
              ===================================== */}

          {Array.isArray(tour.faqs) &&
            tour.faqs.length > 0 && (

              <section id="map-faq" className="mx-auto mt-16 max-w-full px-6">
                <SectionCollapse title="Map-FAQ">
                  <hr />
                  <div className="grid gap-10 lg:grid-cols-3">

                    {/* FAQ IMAGE */}

                    {tour.faqImageUrl && (

                      <div className="lg:col-span-1">

                        <div className="sticky top-24 overflow-hidden rounded-2xl">
                          <Link
                            href={tour.faqImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block cursor-pointer"
                          >
                            <img
                              src={tour.faqImageUrl}
                              alt={`${tour.title} FAQ`}
                              className="h-[420px] w-full object-cover"
                            />
                          </Link>

                        </div>

                      </div>

                    )}

                    {/* FAQ CONTENT */}

                    <div
                      className={
                        tour.faqImageUrl
                          ? "lg:col-span-2"
                          : "lg:col-span-3"
                      }
                    >

                      <div className="mb-8">

                        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">
                          Frequently Asked Questions
                        </p>

                        <h2 className="mt-2 text-3xl font-bold text-gray-900">
                          Questions About {tour.title}
                        </h2>

                        <p className="mt-3 text-gray-600">
                          Find answers to common questions about this tour.
                        </p>

                      </div>

                      <div className="space-y-4">

                        {tour.faqs.map(
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

          {Array.isArray(tour.youtubeVideos) &&
            tour.youtubeVideos.length > 0 && (

              <section className="mx-auto mt-16 max-w-6xl">

                <YouTubeVideos
                  videos={tour.youtubeVideos}
                />

              </section>

            )}

          {/* =====================================
              FEEDBACK / COMMENTS
          ===================================== */}

          <section id="reviews" className="mx-auto mt-16 max-w-5xl">
            <SectionCollapse title="Reviews">
              <hr />
              <FeedbackList
                pageId={String(tour._id)}
              />
            </SectionCollapse>

            <SectionCollapse title="Form">
              <FeedbackForm
                pageId={String(tour._id)}
                pageTitle={tour.title}
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



