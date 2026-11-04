"use client";

import Link from "next/link";

import {
  useEffect,
  useState,
} from "react";
import { FaTripadvisor } from "react-icons/fa";


/*

# HOMEPAGE

*/

export default function HomePage() {

  const [
    treks,
    setTreks,
  ] = useState([]);

  const [
    tours,
    setTours,
  ] = useState([]);

  const [
    upcomingDepartures,
    setUpcomingDepartures,
  ] = useState([]);

  const [
    regions,
    setRegions,
  ] = useState([]);

  const [
    faqPage,
    setFaqPage,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");



  /*
  
  # FETCH HOMEPAGE DATA
  
  */

  useEffect(() => {

    async function loadData() {

      try {

        setLoading(true);

        setError("");


        /*
        ======================================
        FETCH TREKS
        ======================================
        */

        const trekResponse =
          await fetch(
            "/api/treks?published=true&limit=100",
            {
              cache: "no-store",
            }
          );


        const trekResult =
          await trekResponse.json();


        if (
          trekResult.success
        ) {

          setTreks(
            trekResult.data || []
          );

        }


        /*
        ======================================
        FETCH TOURS
        ======================================
        */

        const tourResponse =
          await fetch(
            "/api/tours?published=true&limit=100",
            {
              cache: "no-store",
            }
          );


        const tourResult =
          await tourResponse.json();


        if (
          tourResult.success
        ) {

          setTours(
            tourResult.data || []
          );

        }

        /*
======================================
FETCH UPCOMING DEPARTURES
======================================
*/

        const departureResponse = await fetch(
          "/api/upcoming-departures?limit=3",
          {
            cache: "no-store",
          }
        );

        const departureResult = await departureResponse.json();

        if (departureResult.success) {
          setUpcomingDepartures(
            departureResult.data || []
          );
        }
        /*
        ======================================
        FETCH REGIONS
        ======================================
        */

        const regionResponse =
          await fetch(
            "/api/regions?published=true",
            {
              cache: "no-store",
            }
          );


        const regionResult =
          await regionResponse.json();


        if (
          regionResult.success
        ) {

          setRegions(
            regionResult.data || []
          );

        }

        /*
======================================
FETCH FAQS
======================================
*/

        const faqResponse =
          await fetch(
            "/api/faq",
            {
              cache: "no-store",
            }
          );


        const faqResult =
          await faqResponse.json();


        if (
          faqResult.success
        ) {

          setFaqPage(
            faqResult.data || null
          );

        }

      } catch (error) {

        console.error(
          "Homepage loading error:",
          error
        );


        setError(
          "Unable to load some website content."
        );

      } finally {

        setLoading(false);

      }

    }


    loadData();


  }, []);

  /*
  
  # PRICE DISPLAY
  
  */

  function getPrice(item) {
    const price = item?.price;

    if (!price) return null;

    // PAX-based pricing: display the minimum price per person
    if (price.pricingType === "pax_based") {
      const tiers = Array.isArray(price.paxPrices)
        ? price.paxPrices
        : [];


      const validPrices = tiers
        .map((tier) => Number(tier.pricePerPax))
        .filter((amount) => Number.isFinite(amount) && amount > 0);

      if (validPrices.length === 0) return null;

      return {
        amount: Math.min(...validPrices),
        currency: price.currency || "USD",
        label: " Start From",
      };


    }

    // Fixed pricing
    const amount = Number(price.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return null;
    }

    return {
      amount,
      currency: price.currency || "USD",
      label: "",
    };
  }




  /*
  
  # LOADING
  
  */

  if (loading) {


    return (

      <main className="min-h-screen bg-white">

        <section className="relative min-h-[650px] overflow-hidden bg-slate-900">

          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-800 to-slate-900" />


          <div className="relative mx-auto flex min-h-[650px] max-w-7xl items-center px-6 py-20 lg:px-8">

            <div className="w-full max-w-3xl animate-pulse">

              <div className="mb-6 h-5 w-40 rounded bg-white/20" />

              <div className="mb-4 h-14 max-w-2xl rounded bg-white/20" />

              <div className="mb-8 h-14 max-w-xl rounded bg-white/20" />

              <div className="h-14 w-48 rounded bg-white/20" />

            </div>

          </div>

        </section>


        <section className="mx-auto max-w-7xl px-6 py-20">

          <div className="mb-12 h-10 w-72 animate-pulse rounded bg-slate-200" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

            {[1, 2, 3].map(
              (item) => (

                <div
                  key={item}
                  className="h-96 animate-pulse rounded-3xl bg-slate-100"
                />

              )
            )}

          </div>

        </section>

      </main>

    );


  }

  /*
  
  # POPULAR EXPERIENCES
  
  */

  const popularExperiences = [


    ...treks.map(
      (item) => ({
        ...item,
        experienceType: "trek",
      })
    ),

    ...tours.map(
      (item) => ({
        ...item,
        experienceType: "tour",
      })
    ),


  ]
    .sort(
      (a, b) => {


        const orderA =
          Number.isFinite(
            Number(a.order)
          )
            ? Number(a.order)
            : Number.MAX_SAFE_INTEGER;


        const orderB =
          Number.isFinite(
            Number(b.order)
          )
            ? Number(b.order)
            : Number.MAX_SAFE_INTEGER;


        return orderA - orderB;

      }
    )
    .slice(0, 5);


  return (


    <main className="min-h-screen bg-white">


      {/* =====================================
      HERO
  ===================================== */}

      <section className="relative min-h-[350px] overflow-hidden bg-slate-950">


        {/* Background */}

        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(rgba(2,6,23,.35),rgba(2,6,23,.78)), url('/images/nepal-hero.jpg')",
          }}
        />


        {/* Fallback gradient */}

        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/30 to-slate-950/80" />


        {/* Hero content */}

        <div className="relative mx-auto flex min-h-[350px] max-w-7xl items-center px-6 py-24 lg:px-8">

          <div className="max-w-4xl text-white">

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-md">

              <span className="h-2 w-2 rounded-full bg-emerald-400" />

              Explore the Himalayas

            </div>


            <h1 className="text-3xl font-black tracking-tight sm:text-6xl lg:text-7xl">

              Discover the Himalayas

              <span className="block text-emerald-300">
                Beyond the Ordinary
              </span>

            </h1>


            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">

              Experience breathtaking Himalayan treks,
              authentic mountain culture and unforgettable
              adventures across Nepal.

            </p>


            <div className="mt-10 flex flex-col gap-4 sm:flex-row">

              <Link
                href="/treks"
                className="rounded-full bg-emerald-500 px-8 py-4 text-center font-bold text-white shadow-xl transition hover:-translate-y-1 hover:bg-emerald-400"
              >
                Explore Treks
              </Link>


              <Link
                href="/tours"
                className="rounded-full border border-white/40 bg-white/10 px-8 py-4 text-center font-bold text-white backdrop-blur-md transition hover:bg-white hover:text-slate-900"
              >
                Discover Tours
              </Link>

            </div>

          </div>

        </div>


        {/* Bottom statistics */}

        <div className="relative mx-auto -mt-20 max-w-full px-6 lg:px-8">

          <div className="grid overflow-hidden rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl sm:grid-cols-3">
            <div className="border-b border-white/10 p-6 text-center text-white sm:border-b-0 sm:border-r">

              <div className="text-3xl font-black">
                325+
              </div>

              <div className="mt-1 text-sm text-slate-300">
                Happy Travellers
              </div>

            </div>



            <div className="border-b border-white/10 p-6 text-center text-white sm:border-b-0 sm:border-r">

              <div className="text-3xl font-black">
                10+
              </div>

              <div className="mt-1 text-sm text-slate-300">
                Years Experience
              </div>

            </div>



            <div className="p-6 text-center text-white">

              <div className="text-3xl font-black">
                100%
              </div>

              <div className="mt-1 text-sm text-slate-300">
                Nepal Adventure
              </div>

            </div>

          </div>

        </div>



      </section>


      {/* =====================================
      POPULAR EXPERIENCES
  ===================================== */}

      {popularExperiences.length > 0 && (

        <PopularExperiences
          experiences={
            popularExperiences
          }
          getPrice={
            getPrice
          }
        />

      )}


      {/* =====================================
      ERROR
  ===================================== */}

      {error && (

        <div className="mx-auto mt-8 max-w-7xl px-6 lg:px-8">

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

            {error}

          </div>

        </div>

      )}

      {/* =====================================
      FEATURED TREKS
  ===================================== */}

      {treks.length > 0 && (

        <section className="bg-slate-50 py-24">

          <div className="mx-auto max-w-full px-6 lg:px-8">

            <SectionHeading
              eyebrow="Himalayan Adventures"
              title="Featured Treks"
              description="Explore some of Nepal's most unforgettable trekking experiences."
              link="/treks"
              linkText="View all treks"
            />


            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

              {treks
                .slice(0, 3)
                .map(
                  (trek) => (

                    <ExperienceCard
                      key={
                        trek._id
                      }
                      item={
                        trek
                      }
                      type="trek"
                      getPrice={
                        getPrice
                      }
                    />

                  )
                )}

            </div>

          </div>

        </section>

      )}

      {/* =====================================
    UPCOMING DEPARTURES
===================================== */}

      {upcomingDepartures.length > 0 && (
        <section className="bg-white py-24">
          <div className="mx-auto max-w-full px-6 lg:px-8">

            <SectionHeading
              eyebrow="Plan Your Journey"
              title="Upcoming Departures"
              description="Choose your preferred departure date and reserve your place on an upcoming Nepal adventure."
              link="/upcoming-departures"
              linkText="View all departures"
            />

            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">

              {upcomingDepartures.map((departure) => {
                const experience = departure.experience;

                if (!experience) return null;

                const experienceType =
                  experience.pageType?.slug || "experience";

                const image =
                  experience.cardImageUrl ||
                  experience.imageUrl;

                const bookingUrl =
                  `/booking?experienceId=${encodeURIComponent(
                    experience._id
                  )}&experienceType=${encodeURIComponent(
                    experienceType
                  )}&departureId=${encodeURIComponent(
                    departure._id
                  )}`;

                const detailHref =
                  experienceType === "trek"
                    ? `/treks/trek/${experience.slug}`
                    : experienceType === "tour"
                      ? `/tours/${experience.slug}`
                      : experienceType === "wellness"
                        ? `/wellness/${experience.slug}`
                        : null;

                const formatDepartureDate = (date) =>
                  date
                    ? new Date(date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      timeZone: "Asia/Kathmandu",
                    })
                    : "";

                return (
                  <article
                    key={departure._id}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
                  >

                    {/* EXPERIENCE IMAGE */}

                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">

                      {image ? (
                        <img
                          src={image}
                          alt={experience.title || "Upcoming departure"}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-600 to-slate-900 text-6xl">
                          🏔️
                        </div>
                      )}

                      <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-900 backdrop-blur">
                        {experience.pageType?.name || experienceType}
                      </span>

                      <span className="absolute right-4 top-4 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow">
                        {departure.availablePax} Seats Left
                      </span>

                    </div>

                    {/* EXPERIENCE CONTENT */}

                    <div className="p-6">

                      <h3 className="line-clamp-2 text-2xl font-black text-slate-900">
                        {experience.title}
                      </h3>

                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                        {experience.description ||
                          "Discover an unforgettable Nepal adventure."}
                      </p>

                      {/* DEPARTURE DATES */}

                      <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-700">

                        <p>
                          <strong>Start Date:</strong>{" "}
                          {formatDepartureDate(departure.startDate)}
                        </p>

                        <p>
                          <strong>End Date:</strong>{" "}
                          {formatDepartureDate(departure.endDate)}
                        </p>

                        <p>
                          <strong>Available Seats:</strong>{" "}
                          <span className="font-bold text-emerald-700">
                            {departure.availablePax}
                          </span>
                        </p>

                      </div>

                      {/* PRICE */}

                      {departure.price && (
                        <div className="mt-5">

                          <span className="text-xs font-medium text-slate-500">
                            {departure.price.label || "Price"}
                          </span>

                          <div className="text-2xl font-black text-slate-900">
                            {departure.price.currency}{" "}
                            {Number(departure.price.amount).toLocaleString("en-US")}

                            <span className="ml-1 text-sm font-medium text-slate-400">
                              / person
                            </span>
                          </div>

                        </div>
                      )}

                      {/* ACTIONS */}

                      <div className="mt-6 flex flex-col gap-3">

                        <Link
                          href={bookingUrl}
                          className="rounded-full bg-emerald-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-700"
                        >
                          Reserve This Departure
                        </Link>

                        {detailHref && (
                          <Link
                            href={detailHref}
                            className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-bold text-slate-700 transition hover:border-emerald-600 hover:text-emerald-600"
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

          </div>
        </section>
      )}


      {/* =====================================
      INTRO
  ===================================== */}

      <section className="mx-auto max-w-full px-6 py-24 lg:px-8">

        <div className="mx-auto  max-w-full text-center">

          <span className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-600">
            Your Himalayan Journey
          </span>


          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">

            Adventure starts here

          </h2>


          <p className="mt-6 text-lg leading-8 text-slate-600">

            From iconic Himalayan trails to peaceful
            cultural journeys, discover carefully designed
            adventures that let you experience the real Nepal.

          </p>

        </div>


        {/* Feature cards */}

        <div className="mt-16 grid  gap-6 md:grid-cols-3">

          <FeatureCard
            icon="🏔️"
            title="Himalayan Treks"
            text="Walk among the world's highest mountains and experience unforgettable Himalayan landscapes."
          />


          <FeatureCard
            icon="🌿"
            title="Authentic Experiences"
            text="Meet local communities, discover mountain culture and travel beyond ordinary tourist routes."
          />


          <FeatureCard
            icon="🧭"
            title="Expertly Planned"
            text="Flexible itineraries, experienced guides and carefully selected routes for a memorable journey."
          />

        </div>

      </section>

      {/* =====================================
      REGIONS
  ===================================== */}

      {regions.length > 0 && (

        <section className="mx-auto max-w-full px-6 py-24 lg:px-8">

          <SectionHeading
            eyebrow="Explore Nepal"
            title="Trekking Regions"
            description="Choose a region and start planning your Himalayan adventure."
          />


          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

            {regions
              .slice(0, 3)
              .map(
                (region) => (

                  <Link
                    key={
                      region._id
                    }
                    href={`/treks/${region.slug}`}
                    className="group relative overflow-hidden rounded-3xl bg-slate-900 p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >

                    {region.cardImageUrl && (

                      <img
                        src={
                          region.cardImageUrl
                        }
                        alt={
                          region.name
                        }
                        className="absolute inset-0 h-full w-full object-cover opacity-40 transition duration-500 group-hover:scale-105 group-hover:opacity-50"
                      />

                    )}


                    <div className="relative">

                      <div className="mb-12 text-4xl">
                        🏔️
                      </div>


                      <h3 className="text-2xl font-black text-white">

                        {region.name}

                      </h3>


                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-200">

                        {region.description ||
                          "Discover amazing Himalayan adventures in this region."}

                      </p>


                      <div className="mt-6 font-bold text-emerald-300">

                        Explore Region

                        <span className="ml-2 transition group-hover:ml-3">
                          →
                        </span>

                      </div>

                    </div>

                  </Link>

                )
              )}

          </div>

        </section>

      )}


      {/* =====================================
      TOURS
  ===================================== */}

      {tours.length > 0 && (

        <section className="bg-slate-950 py-24">

          <div className="mx-auto max-w-full px-6 lg:px-8">

            <SectionHeading
              eyebrow="Beyond Trekking"
              title="Discover Nepal Tours"
              description="Experience Nepal's culture, heritage, wildlife and natural beauty."
              link="/tours"
              linkText="View all tours"
              dark
            />


            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

              {tours
                .slice(0, 3)
                .map(
                  (tour) => (

                    <ExperienceCard
                      key={
                        tour._id
                      }
                      item={
                        tour
                      }
                      type="tour"
                      getPrice={
                        getPrice
                      }
                      dark
                    />

                  )
                )}

            </div>

          </div>

        </section>

      )}


      {/* =====================================
      WHY US
  ===================================== */}

      <section className="mx-auto max-w-full px-6 py-24 lg:px-8">

        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">

          <div>

            <span className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-600">
              Travel With Confidence
            </span>


            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">

              Nepal is more than a destination.

            </h2>


            <p className="mt-6 text-lg leading-8 text-slate-600">

              It is a place of mountains, ancient cultures,
              welcoming communities and extraordinary
              landscapes.

            </p>


            <div className="mt-10 space-y-6">

              <Reason
                title="Local Expertise"
                text="Travel with people who understand Nepal's mountains, culture and communities."
              />


              <Reason
                title="Flexible Experiences"
                text="Choose from carefully designed treks and tours or build an adventure around your needs."
              />


              <Reason
                title="Responsible Travel"
                text="Experience Nepal respectfully while supporting local communities and mountain environments."
              />

            </div>

          </div>


          <div className="relative">

            <div className=" overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-500 to-slate-900 p-1 shadow-2xl">



              {/* ========================================
                    FAQ SECTION
                ======================================== */}

              {faqPage?.faqs?.length > 0 && (

                <section
                  className="flex h-full   rounded-[1.7rem] bg-gradient-to-t from-slate-950 via-slate-900/30 to-transparent p-24"
                // className="bg-gradient-to-br from-slate-50 via-white to-emerald-50 px-4 py-16 sm:px-6 lg:px-8"
                >

                  <div className="mx-auto max-w-5xl ">

                    {/* FAQ HEADER */}

                    <div className="mb-10 text-center">

                      <h2 className="text-5xl  font-bold tracking-tight text-slate-900 sm:text-4xl">
                        Frequently Asked Questions
                      </h2>

                      {/* <div className="mx-auto mt-4 h-1 w-32 rounded-full bg-emerald-600" /> */}

                    </div>


                    {/* FAQ ITEMS */}

                    <div className="space-y-4">

                      {faqPage.faqs
                        .slice(0, 10)
                        .map((faq, index) => (

                          <details
                            key={index}
                            className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                          >

                            <summary className="whitespace-pre-line flex cursor-pointer list-none items-center justify-between gap-6 font-semibold text-gray-900">

                              <span>
                                {faq.question}
                              </span>

                              <span className="text-2xl text-emerald-600 transition-transform duration-300 group-open:rotate-45">
                                +
                              </span>

                            </summary>


                            {faq.answer && (

                              <div className="mt-4 border-t border-gray-100 pt-4">

                                <p className="whitespace-pre-line leading-7 text-gray-600">
                                  {faq.answer}
                                </p>

                              </div>

                            )}

                          </details>

                        ))}

                    </div>


                    {/* VIEW ALL */}

                    {faqPage?.faqs?.length > 10 && (

                      <div className="mt-8 text-center">

                        <Link
                          target="_blank"
                          href="/faq"
                          className="inline-flex items-center rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
                        >
                          View More FAQs
                        </Link>

                      </div>

                    )}

                  </div>

                </section>

              )}



            </div>

          </div>

        </div>

      </section>

      {/* =====================================
      Associate
  ===================================== */}

      <section className="px-6 pb-24 lg:px-8">

        <div className="mx-auto max-w-full overflow-hidden rounded-[2rem] px-8 py-16 text-center shadow-xl sm:px-16">



          <h3 className="mx-auto mt-24 text-4xl   font-black tracking-tight text-slate-900 ">

            We are Associated with

          </h3>


          <div className="mt-10 flex flex-col justify-around gap-4 sm:flex-row">
            <Link
              href="/"
              className="
          flex
          items-center
          shrink-0          
          lg:mr-10
        "
            >
              <img
                src="/nma.png"
                alt="nma Logo"
                className="
          w-56 object-cover
          "
              />
            </Link>
            <Link
              href="/"
              className="
          flex
          items-center
          shrink-0       
          lg:mr-10
        "
            >
              <img
                src="/ntb.png"
                alt="ntb Logo"
                className="
        w-16 object-cover
          "
              />
            </Link>
            <Link
              href="/"
              className="
          flex
          items-center
          shrink-0       
          lg:mr-10
        "
            >
              <img
                src="/taan.png"
                alt="taan Logo"
                className="
           w-56 object-cover
          "
              />
            </Link>


            {/* TripAdvisor */}
            <Link
              href="https://www.tripadvisor.com/Attraction_Review-g293890-d26247521-Reviews-Fusion_Expeditions-Kathmandu_Kathmandu_Valley_Bagmati_Zone_Central_Region.html"
              target="_blank"
              rel="noopener noreferrer"
              // className="text-emerald-500 text-2xl hover:scale-110 transition-transform"
              className=" bg-white font-bold text-emerald-700 transition hover:-translate-y-1 hover:bg-slate-100"
            >
              <span className="text-5xl">
                <FaTripadvisor />

              </span>
            </Link>



          </div>

        </div>

      </section>


      {/* =====================================
      CTA
  ===================================== */}

      <section className="px-6 pb-24 lg:px-8">

        <div className="mx-auto max-w-full overflow-hidden rounded-[2rem] bg-emerald-600 px-8 py-16 text-center shadow-xl sm:px-16">

          <span className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-100">
            Start Your Adventure
          </span>


          <h2 className="mx-auto mt-4  text-4xl font-black tracking-tight text-white sm:text-5xl">

            Ready to explore Nepal?

          </h2>


          <p className="mx-auto mt-6  text-lg leading-8 text-emerald-50">

            Find your perfect trek or tour and begin planning
            an unforgettable journey through the Himalayas.

          </p>


          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">

            <Link
              href="/treks"
              className="rounded-full bg-white px-8 py-4 font-bold text-emerald-700 transition hover:-translate-y-1 hover:bg-slate-100"
            >
              Explore Treks
            </Link>


            <Link
              href="/tours"
              className="rounded-full border border-white/40 px-8 py-4 font-bold text-white transition hover:bg-white/10"
            >
              Explore Tours
            </Link>

          </div>

        </div>

      </section>

    </main>


  );

}

/*

# POPULAR EXPERIENCES

*/

function PopularExperiences({
  experiences,
  getPrice,
}) {

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const [
    isPlaying,
    setIsPlaying,
  ] = useState(true);

  /*
  
  # AUTOPLAY
  
  */

  useEffect(() => {


    if (
      !isPlaying ||
      experiences.length <= 1
    ) {

      return;

    }


    const interval =
      setInterval(
        () => {

          setCurrentIndex(
            (current) =>
              (current + 1) %
              experiences.length
          );

        },
        4000
      );


    return () => {

      clearInterval(
        interval
      );

    };


  }, [
    isPlaying,
    experiences.length,
  ]);

  /*
  
  # CURRENT EXPERIENCE
  
  */

  const current =
    experiences[
    currentIndex
    ];

  if (!current) {


    return null;


  }

  /*
  
  # NEXT
  
  */

  function nextExperience() {


    setCurrentIndex(
      (current) =>
        (current + 1) %
        experiences.length
    );


  }

  /*
  
  # PREVIOUS
  
  */

  function previousExperience() {


    setCurrentIndex(
      (current) =>
        (
          current -
          1 +
          experiences.length
        ) %
        experiences.length
    );


  }

  const price =
    getPrice(current);

  const detailHref =
    current.experienceType === "trek"
      ? `/treks/trek/${current.slug}`
      : `/tours/${current.slug}`;

  return (


    <section className="mx-auto max-w-full px-6 py-20 lg:px-8">

      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        {/* ==================================
       LEFT SIDE
    ================================== */}

        <div className="relative">

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">


            {/* Main image */}

            <Link
              href={detailHref}
              className="group block"
            >

              <div className="relative aspect-[10/5] overflow-hidden bg-slate-200">

                {current.cardImageUrl ? (

                  <img
                    key={
                      current._id
                    }
                    src={
                      current.cardImageUrl
                    }
                    alt={
                      current.title
                    }
                    className="h-full w-full object-cover transition duration-1000 group-hover:scale-105"
                  />

                ) : (

                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-600 to-slate-900 text-7xl">

                    🏔️

                  </div>

                )}


                {/* Overlay */}

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />


                {/* Type */}

                <div className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-900 backdrop-blur">

                  {current.experienceType}

                </div>


                {/* Image counter */}

                <div className="absolute right-5 top-5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">

                  {currentIndex + 1} / {experiences.length}

                </div>


                {/* Image title */}

                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">

                  <h3 className="text-2xl font-black sm:text-3xl">

                    {current.title}

                  </h3>


                  {current.region?.name && (

                    <p className="mt-2 text-sm font-semibold text-emerald-300">

                      📍 {current.region.name}

                    </p>

                  )}

                </div>

              </div>

            </Link>


            {/* Content */}

            <div className="p-6">


              <p className="line-clamp-2 leading-7 text-slate-600">

                {current.description ||
                  "Discover an unforgettable Nepal adventure."}

              </p>


              <div className="mt-5 flex flex-wrap items-end justify-between gap-4">


                {/* Price */}

                {price ? (

                  <div>

                    <span className="text-xs text-slate-500">

                      {price.label ||
                        "Price"}

                    </span>


                    <div className="text-2xl font-black text-slate-900">

                      {price.currency}{" "}

                      {price.amount.toLocaleString()}

                      <span className="ml-1 text-sm font-medium text-slate-400">

                        / person

                      </span>

                    </div>

                  </div>

                ) : (

                  <div className="text-sm font-semibold text-slate-500">

                    Contact us for pricing

                  </div>

                )}


                <Link
                  href={detailHref}
                  className="rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
                >
                  View Details
                </Link>

              </div>


              {/* Controls */}

              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">


                <button
                  type="button"
                  onClick={
                    previousExperience
                  }
                  aria-label="Previous popular experience"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-bold text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                >
                  ←
                </button>


                <button
                  type="button"
                  onClick={() =>
                    setIsPlaying(
                      (playing) =>
                        !playing
                    )
                  }
                  className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                >
                  {isPlaying
                    ? "❚❚ Pause"
                    : "▶ Play"}
                </button>


                <button
                  type="button"
                  onClick={
                    nextExperience
                  }
                  aria-label="Next popular experience"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-bold text-slate-700 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"
                >
                  →
                </button>

              </div>


              {/* Dots */}

              <div className="mt-5 flex justify-center gap-2">

                {experiences.map(
                  (
                    experience,
                    index
                  ) => (

                    <button
                      key={
                        experience._id
                      }
                      type="button"
                      onClick={() => {

                        setCurrentIndex(
                          index
                        );

                      }}
                      aria-label={`Show popular experience ${index + 1}`}
                      className={`h-2.5 rounded-full transition-all ${index === currentIndex
                        ? "w-8 bg-emerald-500"
                        : "w-2.5 bg-slate-300 hover:bg-slate-400"
                        }`}
                    />

                  )
                )}

              </div>

            </div>

          </div>


          {/* Small numbered list */}

          <div className="mt-4 grid grid-cols-5 gap-2">

            {experiences.map(
              (
                experience,
                index
              ) => (

                <button
                  key={
                    experience._id
                  }
                  type="button"
                  onClick={() => {

                    setCurrentIndex(
                      index
                    );

                  }}
                  className={`rounded-xl px-2 py-2 text-center text-xs font-bold transition ${index === currentIndex
                    ? "bg-emerald-600 text-white shadow-md"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  {index + 1}
                </button>

              )
            )}

          </div>

        </div>

        {/* ==================================
        RIGHT SIDE
    ================================== */}

        <div>

          <span className="text-sm font-bold uppercase tracking-[0.25em] text-emerald-600">
            Popular Adventures
          </span>


          <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">

            Discover our popular experiences

          </h2>


          <p className="text-justify mt-6 max-w-full text-lg leading-8 text-slate-600">

            Explore some of our most popular Himalayan treks and Nepal tours, carefully selected from our published experiences. Discover unforgettable trekking adventures in the Himalayas, scenic mountain trails, authentic cultural experiences, and immersive Nepal tours designed for every kind of traveler. From iconic trekking routes to hidden valleys and local heritage, our carefully crafted journeys help you experience the very best of Nepal. Start planning your next Himalayan adventure and discover why Nepal remains one of the world’s most inspiring travel destinations.

          </p>


          <div className="mt-8 flex flex-wrap gap-3">

            <Link
              href="/treks"
              className="rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
            >
              Explore Treks
            </Link>


            <Link
              href="/tours"
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-emerald-600 hover:text-emerald-600"
            >
              Explore Tours
            </Link>

          </div>


          {/* Autoplay status */}

          <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">

            <span
              className={`h-2.5 w-2.5 rounded-full ${isPlaying
                ? "animate-pulse bg-emerald-500"
                : "bg-slate-300"
                }`}
            />

            {isPlaying
              ? "Autoplay is on"
              : "Autoplay is paused"}

          </div>

        </div>




      </div>

    </section>


  );

}

/*

# FEATURE CARD

*/

function FeatureCard({
  icon,
  title,
  text,
}) {

  return (


    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-3xl">

        {icon}

      </div>


      <h3 className="mt-6 text-xl font-black text-slate-900">

        {title}

      </h3>


      <p className="mt-3 leading-7 text-slate-600">

        {text}

      </p>

    </div>


  );

}

/*

# SECTION HEADING

*/

function SectionHeading({
  eyebrow,
  title,
  description,
  link,
  linkText,
  dark = false,
}) {

  return (


    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">

      <div className="max-w-2xl">

        <span
          className={`text-sm font-bold uppercase tracking-[0.25em] ${dark
            ? "text-emerald-300"
            : "text-emerald-600"
            }`}
        >
          {eyebrow}
        </span>


        <h2
          className={`mt-3 text-4xl font-black tracking-tight sm:text-5xl ${dark
            ? "text-white"
            : "text-slate-900"
            }`}
        >
          {title}
        </h2>


        <p
          className={`mt-5 text-lg leading-8 ${dark
            ? "text-slate-300"
            : "text-slate-600"
            }`}
        >
          {description}
        </p>

      </div>


      {link && (

        <Link
          href={link}
          className={`font-bold transition ${dark
            ? "text-emerald-300 hover:text-white"
            : "text-emerald-700 hover:text-emerald-500"
            }`}
        >

          {linkText}

          <span className="ml-2">
            →
          </span>

        </Link>

      )}

    </div>


  );

}

/*

# EXPERIENCE CARD

*/

function ExperienceCard({
  item,
  type,
  getPrice,
  dark = false,
}) {

  const price =
    getPrice(item);

  const detailHref =
    item.pageType?.slug === "trek" ||
      type === "trek"
      ? `/treks/trek/${item.slug}`
      : `/tours/${item.slug}`;

  return (


    <article
      className={`group overflow-hidden rounded-3xl shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${dark
        ? "border border-white/10 bg-white/5"
        : "border border-slate-200 bg-white"
        }`}
    >


      {/* Image */}

      <Link
        href={detailHref}
        className="block"
      >

        <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">

          {item.cardImageUrl ? (

            <img
              src={
                item.cardImageUrl
              }
              alt={
                item.title
              }
              className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />

          ) : (

            <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-600 to-slate-900 text-6xl">
              🏔️
            </div>

          )}


          <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-900 backdrop-blur">
            {type}
          </div>

        </div>

      </Link>


      {/* Content */}

      <div className="p-6">

        <Link
          href={detailHref}
        >

          <h3
            className={`line-clamp-2 text-2xl font-black transition ${dark
              ? "text-white group-hover:text-emerald-300"
              : "text-slate-900 group-hover:text-emerald-700"
              }`}
          >
            {item.title}
          </h3>

        </Link>


        {item.region?.name && (

          <p className="mt-2 text-sm font-semibold text-emerald-600">

            📍 {item.region.name}

          </p>

        )}


        <p
          className={`mt-4 line-clamp-3 leading-7 ${dark
            ? "text-slate-300"
            : "text-slate-600"
            }`}
        >
          {item.description ||
            "Discover an unforgettable Nepal adventure."}
        </p>


        {/* Price */}

        {price && (

          <div className="mt-6">

            <span
              className={`text-xs ${dark
                ? "text-slate-400"
                : "text-slate-500"
                }`}
            >
              {price.label ||
                "Price"}
            </span>


            <div
              className={`text-2xl font-black ${dark
                ? "text-white"
                : "text-slate-900"
                }`}
            >

              {price.currency}{" "}

              {price.amount.toLocaleString()}

              <span className="ml-1 text-sm font-medium text-slate-400">
                / person
              </span>

            </div>

          </div>

        )}


        {/* Buttons */}

        <div className="mt-6 flex gap-3">

          <Link
            href={detailHref}
            className={`flex-1 rounded-full px-5 py-3 text-center text-sm font-bold transition ${dark
              ? "bg-white text-slate-900 hover:bg-emerald-300"
              : "bg-slate-900 text-white hover:bg-emerald-600"
              }`}
          >
            View Details
          </Link>


          <Link
            href={`/booking?experienceId=${item._id}&experienceType=${type}`}
            className="rounded-full border border-emerald-600 px-5 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-600 hover:text-white"
          >
            Book
          </Link>

        </div>

      </div>

    </article>


  );

}

/*

# REASON

*/

function Reason({
  title,
  text,
}) {

  return (


    <div className="flex gap-4">

      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">
        ✓
      </div>


      <div>

        <h3 className="font-black text-slate-900">
          {title}
        </h3>


        <p className="mt-1 leading-7 text-slate-600">
          {text}
        </p>

      </div>

    </div>


  );

}
