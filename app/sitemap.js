import connectDB from "@/lib/mongodb";
import Page from "@/models/Page";
import Region from "@/models/Region";
export const dynamic = "force-dynamic";


export default async function sitemap() {

  await connectDB();


  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";


  /*
  ========================================
  STATIC PAGES
  ========================================
  */

  const staticPages = [

    {
      url: baseUrl,

      lastModified: new Date(),

      changeFrequency: "weekly",

      priority: 1,
    },

    {
      url: `${baseUrl}/treks`,

      lastModified: new Date(),

      changeFrequency: "weekly",

      priority: 0.9,
    },

    {
      url: `${baseUrl}/blog`,

      lastModified: new Date(),

      changeFrequency: "weekly",

      priority: 0.8,
    },

  ];


  /*
  ========================================
  PUBLISHED PAGES
  ========================================
  */

  const pages = await Page.find({

    published: true,

  })
    .select(
      "slug updatedAt pageType seo"
    )
    .populate(
      "pageType",
      "slug name"
    )
    .lean();


  /*
  ========================================
  GENERAL PAGE URLS
  ========================================
  */

  const generalPages = pages

    .filter((page) => {

      if (page.seo?.noIndex) {
        return false;
      }


      const pageTypeSlug =
        page.pageType?.slug ||
        "";


      /*
      Blog pages have their own
      /blog/[slug] URL structure.
      */

      if (
        pageTypeSlug.toLowerCase() ===
        "blog"
      ) {
        return false;
      }


      return true;

    })

    .map((page) => {

      const pageTypeSlug =
        page.pageType?.slug ||
        "";


      return {

        url:
          `${baseUrl}/${page.slug}`,

        lastModified:
          page.updatedAt ||
          new Date(),

        changeFrequency:
          "weekly",

        priority:
          pageTypeSlug.toLowerCase() ===
          "trek"
            ? 0.8
            : 0.6,

      };

    });


  /*
  ========================================
  BLOG PAGES
  ========================================
  */

  const blogPages = pages

    .filter((page) => {

      if (page.seo?.noIndex) {
        return false;
      }


      const pageTypeSlug =
        page.pageType?.slug ||
        "";


      return (
        pageTypeSlug.toLowerCase() ===
        "blog"
      );

    })

    .map((blog) => ({

      url:
        `${baseUrl}/blog/${blog.slug}`,

      lastModified:
        blog.updatedAt ||
        new Date(),

      changeFrequency:
        "weekly",

      priority: 0.7,

    }));


  /*
  ========================================
  PUBLISHED REGIONS
  ========================================
  */

  const regions = await Region.find({

    published: true,

  })
    .select(
      "slug updatedAt"
    )
    .lean();


  const regionPages =
    regions.map((region) => ({

      url:
        `${baseUrl}/treks/${region.slug}`,

      lastModified:
        region.updatedAt ||
        new Date(),

      changeFrequency:
        "weekly",

      priority: 0.7,

    }));


  /*
  ========================================
  REMOVE DUPLICATE URLS
  ========================================
  */

  const allPages = [

    ...staticPages,

    ...regionPages,

    ...generalPages,

    ...blogPages,

  ];


  const uniquePages =
    Array.from(

      new Map(

        allPages.map(
          (page) => [
            page.url,
            page,
          ]
        )

      ).values()

    );


  return uniquePages;
}

