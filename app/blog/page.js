import Link from "next/link";
import BreadcrumbJsonLd from "@/app/components/BreadcrumbJsonLd";
import JsonLd from "@/app/components/JsonLd";
import { resolvePageImages } from "@/lib/imageResolver";



/*
==================================================
SEO METADATA
==================================================
*/

export async function generateMetadata({ searchParams }) {

  const baseUrl =
    process.env.baseUrl ||
    "http://localhost:3000";

  const params = await searchParams;

  const currentPage =
    Number(params?.page || 1);

  const title =
    currentPage > 1
      ? `Nepal Travel Blog - Page ${currentPage} | FUSION EXPEDITIONS`
      : "Nepal Travel Blog | Trekking Guides, Stories & Travel Tips";

  const description =
    "Discover Nepal travel stories, trekking guides, destination information, travel tips, and experiences from Nepal.";

  return {

    title,

    description,

    alternates: {
      canonical:
        currentPage > 1
          ? `${baseUrl}/blog?page=${currentPage}`
          : `${baseUrl}/blog`,
    },

    openGraph: {

      title,

      description,

      url:
        currentPage > 1
          ? `${baseUrl}/blog?page=${currentPage}`
          : `${baseUrl}/blog`,

      siteName: "FUSION EXPEDITIONS",

      type: "website",

    },

    twitter: {

      card: "summary_large_image",

      title,

      description,

    },

    robots: {

      index: true,

      follow: true,

    },

  };

};


/*
==================================================
GET BLOGS
==================================================
*/

async function getBlogs(page = 1, limit = 6) {

  try {

    const baseUrl =
      process.env.baseUrl ||
      "http://localhost:3000";

    const response = await fetch(
      `${baseUrl}/api/pages?pageType=blog&published=true&page=${page}&limit=${limit}`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {

      return {
        blogs: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: page > 1,
        },
      };

    }

    const result =
      await response.json();

    if (!result?.success) {

      return {
        blogs: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: page > 1,
        },
      };

    }

    const blogs =
  Array.isArray(result.data)
    ? result.data
    : [];


    const blogsWithImages =
    await resolvePageImages(blogs);


return {

  blogs: blogsWithImages,

  pagination:
    result.pagination || {
      page,
      limit,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: page > 1,
    },

};

  } catch (error) {

    console.error(
      "Error fetching blogs:",
      error
    );

    return {

      blogs: [],

      pagination: {
        page,
        limit,
        totalItems: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: page > 1,
      },

    };

  }

}


/*
==================================================
BLOG PAGE
==================================================
*/

export default async function BlogPage({
  searchParams,
}) {

  const params =
    await searchParams;

  const requestedPage =
    Number(params?.page || 1);

  const currentPage =
    Number.isInteger(requestedPage) &&
    requestedPage > 0
      ? requestedPage
      : 1;

  const limit = 6;

  const {
    blogs,
    pagination,
  } = await getBlogs(
    currentPage,
    limit
  );


  const baseUrl =
    process.env.baseUrl ||
    "http://localhost:3000";


  /*
  ==================================================
  BLOG / COLLECTION PAGE JSON-LD
  ==================================================
  */

  const blogJsonLd = {

    "@context": "https://schema.org",

    "@type": "CollectionPage",

    name:
      currentPage > 1
        ? `Nepal Travel Blog - Page ${currentPage}`
        : "Nepal Travel Blog | Trekking Guides, Stories & Travel Tips",

    description:
      "Discover Nepal travel stories, trekking guides, destination information, travel tips, and experiences from Nepal.",

    url:
      currentPage > 1
        ? `${baseUrl}/blog?page=${currentPage}`
        : `${baseUrl}/blog`,

    isPartOf: {

      "@type": "WebSite",

      name: "FUSION EXPEDITIONS",

      url: baseUrl,

    },

  };


  /*
  ==================================================
  BLOG ITEM LIST JSON-LD
  ==================================================
  */

  const itemListJsonLd = {

    "@context": "https://schema.org",

    "@type": "ItemList",

    name:
      currentPage > 1
        ? `FUSION EXPEDITIONS Blog - Page ${currentPage}`
        : "FUSION EXPEDITIONS Blog",

    itemListElement:
      blogs.map(
        (blog, index) => ({

          "@type": "ListItem",

          position:
            ((currentPage - 1) * limit) +
            index +
            1,

          name: blog.title,

          url:
            `${baseUrl}/blog/${blog.slug}`,

        })
      ),

  };


  /*
  ==================================================
  BREADCRUMB JSON-LD
  ==================================================
  */

  const breadcrumbItems = [

    {
      name: "Home",

      url: baseUrl,
    },

    {
      name: "Blog",

      url: `${baseUrl}/blog`,
    },

  ];


  /*
  ==================================================
  PAGINATION URL
  ==================================================
  */

  const getPageUrl = (page) => {

    if (page <= 1) {

      return "/blog";

    }

    return `/blog?page=${page}`;

  };


  return (

    <main className="min-h-screen bg-gray-50">


      {/* =========================================
          COLLECTION PAGE JSON-LD
      ========================================= */}

      <JsonLd
        data={blogJsonLd}
      />

      


      {/* =========================================
          BLOG ITEM LIST JSON-LD
      ========================================= */}

      <JsonLd
      data={itemListJsonLd}/>
     
      {/* =========================================
          BREADCRUMB JSON-LD
      ========================================= */}

      <BreadcrumbJsonLd
        items={breadcrumbItems}
      />


      {/* =========================================
          HERO
      ========================================= */}

      <section className="bg-gray-900 px-4 py-20 text-white">

        <div className="mx-auto max-w-full text-center">

          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">

            Travel Stories & Guides

          </p>


          <h1 className="text-2xl font-bold sm:text-5xl">

            Our Blog

          </h1>


          <p className=" mt-5  text-base leading-7 text-gray-300 sm:text-lg">

            Discover travel stories, trekking guides,
            destination information, tips, and
            experiences from Nepal.

          </p>

        </div>

      </section>


      {/* =========================================
          BLOG LIST
      ========================================= */}

      <section className="px-4 py-12 sm:py-16">

        <div className="mx-auto max-w-full">


          {blogs.length === 0 ? (

            <div className="rounded-xl bg-white px-6 py-16 text-center shadow-sm">

              <h2 className="text-2xl font-semibold text-gray-800">

                No blog posts available

              </h2>


              <p className="mt-3 text-gray-500">

                Check back soon for new travel stories
                and guides.

              </p>

            </div>

          ) : (

            <>

              {/* =================================
                  BLOG GRID
              ================================= */}

              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">


                {blogs.map((blog) => (

                  <article
                    key={blog._id}
                    className="
                      group
                      overflow-hidden
                      rounded-2xl
                      bg-white
                      shadow-sm
                      transition
                      duration-300
                      hover:-translate-y-1
                      hover:shadow-xl
                    "
                  >


                    {/* =================================
                        IMAGE
                    ================================= */}

                    <Link
                      href={`/blog/${blog.slug}`}
                    >

                      <div className="relative h-56 overflow-hidden bg-gray-200">


                      {blog.imageUrl ? (

                          <img
                          src={blog.imageUrl}
                            alt={
                              blog.title ||
                              "Blog image"
                            }
                            className="
                              h-full
                              w-full
                              object-cover
                              transition
                              duration-500
                              group-hover:scale-105
                            "
                          />

                        ) : (

                          <div className="
                            flex
                            h-full
                            items-center
                            justify-center
                            bg-gray-200
                            text-gray-500
                          ">

                            No Image

                          </div>

                        )}

                      </div>

                    </Link>


                    {/* =================================
                        CONTENT
                    ================================= */}

                    <div className="p-6">


                      <h2 className="
                        text-xl
                        font-bold
                        leading-7
                        text-gray-900
                        transition
                        group-hover:text-blue-600
                      ">

                        <Link
                          href={`/blog/${blog.slug}`}
                        >

                          {blog.title}

                        </Link>

                      </h2>


                      {blog.description && (

                        <p className="
                        whitespace-pre-line
                          mt-3
                          line-clamp-3
                          text-sm
                          leading-6
                          text-gray-600
                        ">

                          {blog.description}

                        </p>

                      )}


                      <div className="mt-6">

                        <Link
                          href={`/blog/${blog.slug}`}
                          className="
                            inline-flex
                            items-center
                            font-semibold
                            text-blue-600
                            transition
                            hover:text-blue-800
                          "
                        >

                          Read More

                          <span className="
                            ml-2
                            transition-transform
                            group-hover:translate-x-1
                          ">

                            →

                          </span>

                        </Link>

                      </div>


                    </div>

                  </article>

                ))}


              </div>


              {/* =================================
                  PAGINATION
              ================================= */}

              {pagination.totalPages > 1 && (

                <nav
                  className="
                    mt-12
                    flex
                    flex-wrap
                    items-center
                    justify-center
                    gap-2
                  "
                  aria-label="Blog pagination"
                >


                  {/* =================================
                      PREVIOUS
                  ================================= */}

                  {pagination.hasPrevPage ? (

                    <Link
                      href={getPageUrl(
                        currentPage - 1
                      )}
                      className="
                        rounded-lg
                        border
                        border-gray-300
                        bg-white
                        px-4
                        py-2
                        text-sm
                        font-semibold
                        text-gray-700
                        transition
                        hover:bg-gray-100
                      "
                    >

                      ← Previous

                    </Link>

                  ) : (

                    <span
                      className="
                        cursor-not-allowed
                        rounded-lg
                        border
                        border-gray-200
                        bg-gray-100
                        px-4
                        py-2
                        text-sm
                        font-semibold
                        text-gray-400
                      "
                    >

                      ← Previous

                    </span>

                  )}


                  {/* =================================
                      PAGE NUMBERS
                  ================================= */}

                  {Array.from(
                    {
                      length:
                        pagination.totalPages,
                    },
                    (_, index) =>
                      index + 1
                  ).map((pageNumber) => (

                    <Link
                      key={pageNumber}
                      href={getPageUrl(
                        pageNumber
                      )}
                      aria-current={
                        pageNumber === currentPage
                          ? "page"
                          : undefined
                      }
                      className={`
                        rounded-lg
                        px-4
                        py-2
                        text-sm
                        font-semibold
                        transition
                        ${
                          pageNumber ===
                          currentPage
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                        }
                      `}
                    >

                      {pageNumber}

                    </Link>

                  ))}


                  {/* =================================
                      NEXT
                  ================================= */}

                  {pagination.hasNextPage ? (

                    <Link
                      href={getPageUrl(
                        currentPage + 1
                      )}
                      className="
                        rounded-lg
                        border
                        border-gray-300
                        bg-white
                        px-4
                        py-2
                        text-sm
                        font-semibold
                        text-gray-700
                        transition
                        hover:bg-gray-100
                      "
                    >

                      Next →

                    </Link>

                  ) : (

                    <span
                      className="
                        cursor-not-allowed
                        rounded-lg
                        border
                        border-gray-200
                        bg-gray-100
                        px-4
                        py-2
                        text-sm
                        font-semibold
                        text-gray-400
                      "
                    >

                      Next →

                    </span>

                  )}

                </nav>

              )}


              {/* =================================
                  PAGINATION INFORMATION
              ================================= */}

              {pagination.totalItems > 0 && (

                <p className="
                  mt-5
                  text-center
                  text-sm
                  text-gray-500
                ">

                  Showing{" "}
                  {((currentPage - 1) * limit) + 1}
                  {" "}–{" "}
                  {Math.min(
                    currentPage * limit,
                    pagination.totalItems
                  )}
                  {" "}of{" "}
                  {pagination.totalItems}
                  {" "}blog posts

                </p>

              )}

            </>

          )}


        </div>

      </section>


    </main>

  );

}

