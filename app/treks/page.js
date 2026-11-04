import Link from "next/link";

import connectDB from "@/lib/mongodb";
import Page from "@/models/Page";
import PageType from "@/models/PageType";
import { resolvePageImages } from "@/lib/imageResolver";
import Region from "@/models/Region";



/*
====================================================
TREK LIST PAGE
====================================================
*/

export const metadata = {
  title: "Trekking in Nepal",
  description:
    "Explore trekking adventures in Nepal including Everest, Annapurna, Langtang, Manaslu and other Himalayan regions.",
};


export default async function TreksPage() {

  /*
  ==================================================
  CONNECT DATABASE
  ==================================================
  */

  await connectDB();


  /*
  ==================================================
  FIND TREK PAGE TYPE
  ==================================================
  */

  const trekPageType = await PageType.findOne({
    slug: "trek",
    published: true,
  }).lean();


  /*
  ==================================================
  IF PAGE TYPE DOES NOT EXIST
  ==================================================
  */

  if (!trekPageType) {

    return (
      <main className="min-h-screen px-6 py-16">

        <div className="mx-auto max-w-6xl">

          <h1 className="mb-4 text-4xl font-bold">
            Trekking in Nepal
          </h1>

          <p className="text-gray-600">
            Trek page type has not been configured yet.
          </p>

        </div>

      </main>
    );

  }


  /*
  ==================================================
  GET TREKS
  ==================================================
  */

  const trekDocuments = await Page.find({
    pageType: trekPageType._id,
    published: true,
  })
    .populate(
      "region",
      "name slug description imageUrl"
    )
    .sort({
      order: 1,
      createdAt: -1,
    })
    .lean();



  /*
 ====================================================
 RESOLVE TREK CARD IMAGES
 ====================================================
 */

  const treks =
    await resolvePageImages(
      trekDocuments
    );


  /*
  ==================================================
  RETURN PAGE
  ==================================================
  */

  return (

    <main className="min-h-screen bg-gray-50">

      {/* ============================================
          HERO
      ============================================ */}

      <section className="bg-gray-900 px-6 py-20 text-white">

        <div className="mx-auto max-w-6xl">

          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-300">
            Explore Nepal
          </p>

          <h1 className="text-4xl font-bold md:text-5xl">
            Trekking in Nepal
          </h1>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-gray-300">
            Discover unforgettable Himalayan trekking adventures
            through the beautiful regions of Nepal.
          </p>

        </div>

      </section>


      {/* ============================================
          TREKS
      ============================================ */}

      <section className="px-6 py-16">

        <div className="mx-auto max-w-full">

          <div className="mb-10">

            <h2 className="text-3xl font-bold text-gray-900">
              Our Trekking Packages
            </h2>

            <p className="mt-2 text-gray-600">
              Choose your preferred Himalayan adventure.
            </p>

          </div>


          {/* ==========================================
              NO TREKS
          ========================================== */}

          {treks.length === 0 ? (

            <div className="rounded-xl bg-white p-10 text-center shadow">

              <h2 className="text-xl font-semibold text-gray-800">
                No treks available
              </h2>

              <p className="mt-2 text-gray-500">
                Trekking packages will appear here once published.
              </p>

            </div>

          ) : (

            /* ========================================
               TREK GRID
            ======================================== */

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">

              {treks.map((trek) => (

                <article
                  key={trek._id.toString()}
                  className="overflow-hidden rounded-xl bg-white shadow-md transition hover:-translate-y-1 hover:shadow-xl"
                >

                  {/* ==================================
                      IMAGE
                  ================================== */}

                  {trek.imageUrl ? (

                    <img
                      src={trek.imageUrl}
                      alt={trek.title}
                      className="h-56 w-full object-cover"
                    />

                  ) : (

                    <div className="flex h-56 items-center justify-center bg-gray-200 text-gray-500">
                      No Image
                    </div>

                  )}


                  {/* ==================================
                      CONTENT
                  ================================== */}

                  <div className="p-6">

                    {/* REGION */}

                    {trek.region?.name && (

                      <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                        {trek.region.name}
                      </p>

                    )}


                    {/* TITLE */}

                    <h3 className="text-xl font-bold text-gray-900">
                      {trek.title}
                    </h3>


                    {/* DESCRIPTION */}

                    {trek.description && (

                      <p className="mt-3 line-clamp-3 text-gray-600">
                        {trek.description}
                      </p>

                    )}


                    {/* DETAILS */}

                    <div className="mt-5 space-y-2 text-sm text-gray-600">

                      {trek.trekDetails?.duration && (
                        <p>
                          <strong>Duration:</strong>{" "}
                          {trek.trekDetails.duration}
                        </p>
                      )}

                      {trek.trekDetails?.difficulty && (
                        <p>
                          <strong>Difficulty:</strong>{" "}
                          {trek.trekDetails.difficulty}
                        </p>
                      )}

                      {trek.trekDetails?.maxAltitude && (
                        <p>
                          <strong>Max Altitude:</strong>{" "}
                          {trek.trekDetails.maxAltitude}
                        </p>
                      )}

                    </div>


                  

                    {/* PRICE */}

                    {(() => {
                      const price = trek.price;

                      if (!price) return null;

                      let amount = 0;
                      let label = "";

                      if (price.pricingType === "pax_based") {
                        const tiers = Array.isArray(price.paxPrices)
                          ? price.paxPrices
                          : [];


                        const validPrices = tiers
                          .map((tier) => Number(tier.pricePerPax))
                          .filter((value) => Number.isFinite(value) && value > 0);

                        if (validPrices.length === 0) return null;

                        amount = Math.min(...validPrices);
                        label = "Start From";


                      } else {
                        amount = Number(price.amount);


                        if (!Number.isFinite(amount) || amount <= 0) {
                          return null;
                        }


                      }

                      return (<div className="mt-5"> <span className="text-22 font-bold text-gray-900">
                        {label ? `${label} ` : ""}
                        {price.currency || "USD"}{" "}
                        {amount.toLocaleString("en-US")} </span>


                        <span className="ml-2 text-sm text-gray-500">
                          / person
                        </span>
                      </div>


                      );
                    })()}



                    {/* BUTTON */}

                    <Link
                      href={`/treks/trek/${trek.slug}`}
                      className="mt-6 inline-block rounded-lg bg-gray-900 px-5 py-3 font-semibold text-white transition hover:bg-gray-700"
                    >
                      View Trek
                    </Link>

                  </div>

                </article>

              ))}

            </div>

          )}

        </div>

      </section>

    </main>

  );

}