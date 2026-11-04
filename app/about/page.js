import Link from "next/link";
import { notFound } from "next/navigation";
import { resolvePageImage } from "@/lib/imageResolver";
import RichTextContent from "../components/RichTextContent";

export const metadata = {
  title: "About Us | FUSION EXPEDITIONS",
  description:
    "Learn more about Trek Nepal, our team, and our commitment to creating memorable trekking, touring, climbing, and adventure experiences in Nepal.",
};

async function getAboutPage() {
  const baseUrl = process.env.baseUrl
  const ABOUT_PAGE_ID = process.env.ABOUT_PAGE_ID

  const response = await fetch(
    `${baseUrl}/api/pages/${ABOUT_PAGE_ID}`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export default async function AboutPage() {
  const aboutPage = await getAboutPage();
  const page = aboutPage.data;

  if (!page) {
    notFound();
  }

  /*
====================================================
RESOLVE ABOUT PAGE IMAGE
====================================================
*/

  const aboutImageUrl =
    await resolvePageImage(page);


  return (<main className="bg-white">


    {/* ========================================
      HERO
  ======================================== */}

    <section className="relative overflow-hidden bg-gray-900">
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />

      <div className="relative mx-auto max-w-full px-5 py-24 sm:px-10 lg:px-16 lg:py-32">

        <div className="max-w-full">

          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.25em] text-blue-400">
            About Us
          </p>


          {/* <p className=" whitespace-pre-line mt-6 text-justify max-w-full text-lg leading-8 text-gray-200"> */}
            {/* {page.description} */}
            <RichTextContent content={page.description}  />
          Hello

        </div>

      </div>
    </section>


    {/* ========================================
      INTRODUCTION
  ======================================== */}

    <section className="mx-auto max-w-full px-5 py-16 sm:px-10 lg:px-16 lg:py-24">

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">

        <div>

          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-blue-600">
            Who We Are
          </p>

          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Your Journey Begins Here
          </h2>

          <div className="mt-6 text-justify space-y-5 text-base leading-7 text-gray-600">

            {/* <p className="whitespace-pre-line" > */}
         
            <RichTextContent content={page.content} />


          </div>

        </div>


        {/* IMAGE PLACEHOLDER */}

        <div className="overflow-hidden rounded-3xl bg-gray-100 shadow-lg">

          <div className="overflow-hidden rounded-3xl bg-gray-100 shadow-lg">

            <div className="aspect-[4/3]">

              {aboutImageUrl ? (
                <img
                  src={aboutImageUrl}
                  alt="About Photo"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-sm text-gray-400">
                    Nepal Himalayas
                  </span>
                </div>
              )}

            </div>

          </div>

          {/* ========================================
      WHAT WE OFFER
  ======================================== */}

          <section className="bg-gray-50">

            <div className="mx-auto max-w-7xl px-5 py-16 sm:px-10 lg:px-16 lg:py-24">

              <div className="mx-auto  text-center">

                <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                  What We Offer
                </p>

                <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Explore Nepal Your Way
                </h2>

                {/* <p className="mt-5 text-lg leading-8 text-gray-600"> */}
                  {/* {page.highlight} */}
                  <RichTextContent content={page.highlight} />
              

              </div>


              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">


                {/* TREKS */}

                <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-200">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">
                    🏔️
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-gray-900">
                    Trekking
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {page.inclusions?.[0] || ""}
                  </p>

                </div>


                {/* TOURS */}

                <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-200">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">
                    🛕
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-gray-900">
                    Tours
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {page.inclusions[1] || ""}
                  </p>

                </div>


                {/* CLIMBING */}

                <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-200">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">
                    🧗
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-gray-900">
                    Climbing
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {page.inclusions[2] || ""}
                  </p>

                </div>


                {/* ADVENTURE */}

                <div className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-200">

                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">
                    🪂
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-gray-900">
                    Adventure
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-gray-600">
                    {page.inclusions[3] || ""}
                  </p>

                </div>

              </div>

            </div>

          </section>

        </div>

      </div>

    </section>





    {/* ========================================
      WHY TRAVEL WITH US
  ======================================== */}

    <section className="mx-auto max-w-full px-6 py-16 sm:px-8 lg:px-12 lg:py-24">

      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">

        <div>

          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
            Why Choose Us
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            More Than Just a Trip
          </h2>

          {/* <p className="whitespace-pre-line mt-5 text-base leading-7 text-gray-600"> */}
            {/* {page.importantInformation} */}
            <RichTextContent content={page.importantInformation} />
          

        </div>


        <div className="grid gap-6 sm:grid-cols-2">

          <div className="rounded-2xl border border-gray-200 p-6">

            <h3 className="text-lg font-bold text-gray-900">
              Local Experience
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {page.exclusions[0] || ""}
            </p>

          </div>


          <div className="rounded-2xl border border-gray-200 p-6">

            <h3 className="text-lg font-bold text-gray-900">
              Personalized Journeys
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {page.exclusions[1] || ""}
            </p>

          </div>


          <div className="rounded-2xl border border-gray-200 p-6">

            <h3 className="text-lg font-bold text-gray-900">
              Responsible Travel
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {page.exclusions[2] || ""}
            </p>

          </div>


          <div className="rounded-2xl border border-gray-200 p-6">

            <h3 className="text-lg font-bold text-gray-900">
              Memorable Experiences
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              {page.exclusions[3] || ""}
            </p>

          </div>

        </div>

      </div>

    </section>


    {/* ========================================
      CTA
  ======================================== */}

    <section className="bg-gray-900">

      <div className="mx-auto max-w-full px-6 py-16 text-center sm:px-8 lg:px-12 lg:py-20">

      <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Ready to Explore Nepal?
        </h2>

        <p className="mx-auto mt-5 max-w-full text-lg leading-8 text-gray-300">
          Explore our trekking, tour, climbing, and adventure experiences  and start planning your journey.
        </p>


        <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">

          <Link
            href="/treks"
            className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
          >
            Explore Treks
          </Link>

          <Link
            href="/tours"
            className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Explore Tours
          </Link>

          <Link
            href="/contact"
            className="rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Contact Us
          </Link>

        </div>

      </div>

    </section>

  </main>
  );
}
