
"use client";

import { useEffect, useMemo, useState} from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";



/*
========================================
SEARCH PAGE
========================================

Global search for:

- Trek
- Tour
- Climbing
- Adventure
- Blog
- Future page types

Uses:

/api/pages

No changes are required to:

models/Page.js

========================================
*/

export default function SearchPageClient() {

  const router = useRouter();

  const searchParams =
    useSearchParams();


  /*
  ========================================
  STATE
  ========================================
  */

  const [search, setSearch] =
    useState(
      searchParams.get("search") || ""
    );

  const [pageType, setPageType] =
    useState(
      searchParams.get("pageType") || ""
    );

  const [region, setRegion] =
    useState(
      searchParams.get("region") || ""
    );

  const [duration, setDuration] =
    useState(
      searchParams.get("duration") || ""
    );

  const [difficulty, setDifficulty] =
    useState(
      searchParams.get("difficulty") || ""
    );

  const [minPrice, setMinPrice] =
    useState(
      searchParams.get("minPrice") || ""
    );

  const [maxPrice, setMaxPrice] =
    useState(
      searchParams.get("maxPrice") || ""
    );


  const [pages, setPages] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [totalItems, setTotalItems] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(0);

  const [currentPage, setCurrentPage] =
    useState(
      Number(
        searchParams.get("page") || 1
      )
    );


  /*
  ========================================
  FILTER OPTIONS
  ========================================
  */

  const [pageTypes, setPageTypes] =
    useState([]);

  const [regions, setRegions] =
    useState([]);

  const [loadingFilters, setLoadingFilters] =
    useState(true);


  /*
  ========================================
  PAGE TYPE DISPLAY NAME
  ========================================
  */

  const getPageTypeName = (page) => {

    if (!page?.pageType) {
      return "Experience";
    }


    if (
      typeof page.pageType ===
      "string"
    ) {
      return page.pageType;
    }


    return (
      page.pageType.name ||
      page.pageType.title ||
      page.pageType.slug ||
      "Experience"
    );

  };


  /*
  ========================================
  PAGE TYPE SLUG
  ========================================
  */

  const getPageTypeSlug = (page) => {

    if (!page?.pageType) {
      return "";
    }


    if (
      typeof page.pageType ===
      "string"
    ) {
      return page.pageType
        .toLowerCase();
    }


    return (
      page.pageType.slug ||
      ""
    )
      .toString()
      .toLowerCase();

  };


  /*
  ========================================
  REGION NAME
  ========================================
  */

  const getRegionName = (page) => {

    if (!page?.region) {
      return "";
    }


    if (
      typeof page.region ===
      "string"
    ) {
      return page.region;
    }


    return (
      page.region.name ||
      page.region.title ||
      ""
    );

  };


  /*
  ========================================
  IMAGE
  ========================================
  */

  const getImageUrl = (page) => {
    const type = getPageTypeSlug(page);
  
    // Team Profile image
    if (type === "team" && page?.teamProfile?.photoUrl) {
      return page.teamProfile.photoUrl;
    }
  
    // Professional Guide image
    if (
      (type === "guide" ||
        type === "professional-guide") &&
      page?.professionalGuide?.photoUrl
    ) {
      return page.professionalGuide.photoUrl;
    }
  
    // Existing Trek, Tour, and other page images
    if (page?.cardImageUrl) {
      return page.cardImageUrl;
    }
  
    if (page?.imageUrl) {
      return page.imageUrl;
    }
  
    // Fallbacks for profile images
    return (
      page?.teamProfile?.photoUrl ||
      page?.professionalGuide?.photoUrl ||
      ""
    );
  };


  /*
  ========================================
  DURATION
  ========================================
  */

  const getDuration = (page) => {

    const typeSlug =
      getPageTypeSlug(page);


    if (
      typeSlug === "trek" &&
      page?.trekDetails?.duration
    ) {

      return page.trekDetails.duration;

    }


    if (
      typeSlug === "tour" &&
      page?.tourDetails?.duration
    ) {

      return page.tourDetails.duration;

    }


    /*
    Future page types may use either
    trekDetails or tourDetails.

    Fall back to whichever exists.
    */

    if (
      page?.trekDetails?.duration
    ) {

      return page.trekDetails.duration;

    }


    if (
      page?.tourDetails?.duration
    ) {

      return page.tourDetails.duration;

    }


    return "";

  };


  /*
  ========================================
  DIFFICULTY
  ========================================
  */

  const getDifficulty = (page) => {

    return (
      page?.trekDetails?.difficulty ||
      ""
    );

  };


  /*
  ========================================
  PRICE
  ========================================
  */

  const getPrice = (page) => {

    const price =
      page?.price || {};


    /*
    Fixed price
    */

    if (
      price.pricingType ===
      "fixed"
    ) {

      const amount =
        Number(price.amount);


      if (
        Number.isFinite(amount) &&
        amount > 0
      ) {

        return amount;

      }

    }


    /*
    PAX based price

    Use the lowest available
    price per person for display.
    */

    if (
      price.pricingType ===
        "pax_based" &&
      Array.isArray(
        price.paxPrices
      )
    ) {

      const values =
        price.paxPrices

          .map(
            (item) =>
              Number(
                item.pricePerPax
              )
          )

          .filter(
            (value) =>
              Number.isFinite(
                value
              ) &&
              value >= 0
          );


      if (values.length > 0) {

        return Math.min(
          ...values
        );

      }

    }


    /*
    Fallback
    */

    const amount =
      Number(price.amount);


    return Number.isFinite(amount)
      ? amount
      : 0;

  };


  /*
  ========================================
  CURRENCY
  ========================================
  */

  const getCurrency = (page) => {

    return (
      page?.price?.currency ||
      "USD"
    );

  };


  /*
  ========================================
  ROUTE
  ========================================
  */

  const getPageUrl = (page) => {

    const slug =
      page?.slug;


    if (!slug) {
      return "#";
    }


    const type =
      getPageTypeSlug(page);


    /*
    Trek
    */

    if (type === "trek") {

      return `/treks/trek/${slug}`;

    }


    /*
    Tour
    */

    if (type === "tour") {

      return `/tours/${slug}`;

    }


    /*
    Climbing
    */

    if (type === "climbing") {

      return `/climbing/${slug}`;

    }


    /*
    Adventure
    */

    if (type === "adventure") {

      return `/adventure/${slug}`;

    }


    /*
    Blog
    */

    if (type === "blog") {

      return `/blog/${slug}`;

    }


    /*
    Future / fallback

    */

    return `/${slug}`;

  };


  /*
  ========================================
  FETCH PAGE TYPES
  ========================================
  */

  useEffect(() => {

    let cancelled = false;


    async function loadPageTypes() {

      try {

        const response =
          await fetch(
            "/api/page-types",
            {
              cache: "no-store",
            }
          );


        if (!response.ok) {
          throw new Error(
            "Failed to load page types"
          );
        }


        const result =
          await response.json();


        if (
          !cancelled &&
          result?.success
        ) {

          setPageTypes(
            Array.isArray(
              result.data
            )
              ? result.data
              : []
          );

        }

      } catch (error) {

        console.error(
          "Page type loading error:",
          error
        );

      }

    }


    loadPageTypes();


    return () => {

      cancelled = true;

    };

  }, []);


  /*
  ========================================
  FETCH REGIONS
  ========================================
  */

  useEffect(() => {

    let cancelled = false;


    async function loadRegions() {

      try {

        const response =
          await fetch(
            "/api/regions",
            {
              cache: "no-store",
            }
          );


        if (!response.ok) {
          throw new Error(
            "Failed to load regions"
          );
        }


        const result =
          await response.json();


        if (
          !cancelled &&
          result?.success
        ) {

          setRegions(
            Array.isArray(
              result.data
            )
              ? result.data
              : []
          );

        }

      } catch (error) {

        console.error(
          "Region loading error:",
          error
        );

      } finally {

        if (!cancelled) {

          setLoadingFilters(
            false
          );

        }

      }

    }


    loadRegions();


    return () => {

      cancelled = true;

    };

  }, []);


  /*
  ========================================
  LOAD SEARCH RESULTS
  ========================================
  */

  useEffect(() => {

    let cancelled = false;


    async function loadResults() {

      setLoading(true);

      setError("");


      try {

        const params =
          new URLSearchParams();


        /*
        Search
        */

        if (
          search.trim()
        ) {

          params.set(
            "search",
            search.trim()
          );

        }


        /*
        Page type
        */

        if (pageType) {

          params.set(
            "pageType",
            pageType
          );

        }


        /*
        Region
        */

        if (region) {

          params.set(
            "region",
            region
          );

        }


        /*
        Duration
        */

        if (
          duration.trim()
        ) {

          params.set(
            "duration",
            duration.trim()
          );

        }


        /*
        Difficulty
        */

        if (difficulty) {

          params.set(
            "difficulty",
            difficulty
          );

        }


        /*
        Price
        */

        if (minPrice) {

          params.set(
            "minPrice",
            minPrice
          );

        }


        if (maxPrice) {

          params.set(
            "maxPrice",
            maxPrice
          );

        }


        /*
        Pagination
        */

        params.set(
          "page",
          String(currentPage)
        );

        params.set(
          "limit",
          "12"
        );


        const response =
          await fetch(
            `/api/pages?${params.toString()}`,
            {
              cache: "no-store",
            }
          );


        if (!response.ok) {

          throw new Error(
            `Search request failed: ${response.status}`
          );

        }


        const result =
          await response.json();


        if (!result?.success) {

          throw new Error(
            result?.message ||
            "Unable to load search results"
          );

        }


        if (!cancelled) {

          setPages(
            Array.isArray(
              result.data
            )
              ? result.data
              : []
          );


          setTotalItems(
            Number(
              result.pagination
                ?.totalItems || 0
            )
          );


          setTotalPages(
            Number(
              result.pagination
                ?.totalPages || 0
            )
          );

        }

      } catch (error) {

        console.error(
          "Search error:",
          error
        );


        if (!cancelled) {

          setError(
            error.message ||
            "Unable to load search results"
          );

          setPages([]);

        }

      } finally {

        if (!cancelled) {

          setLoading(false);

        }

      }

    }


    loadResults();


    return () => {

      cancelled = true;

    };

  }, [
    search,
    pageType,
    region,
    duration,
    difficulty,
    minPrice,
    maxPrice,
    currentPage,
  ]);


  /*
  ========================================
  UPDATE URL
  ========================================
  */

  useEffect(() => {

    const params =
      new URLSearchParams();


    if (search.trim()) {

      params.set(
        "search",
        search.trim()
      );

    }


    if (pageType) {

      params.set(
        "pageType",
        pageType
      );

    }


    if (region) {

      params.set(
        "region",
        region
      );

    }


    if (duration.trim()) {

      params.set(
        "duration",
        duration.trim()
      );

    }


    if (difficulty) {

      params.set(
        "difficulty",
        difficulty
      );

    }


    if (minPrice) {

      params.set(
        "minPrice",
        minPrice
      );

    }


    if (maxPrice) {

      params.set(
        "maxPrice",
        maxPrice
      );

    }


    if (currentPage > 1) {

      params.set(
        "page",
        String(currentPage)
      );

    }


    const query =
      params.toString();


    router.replace(
      query
        ? `/search?${query}`
        : "/search",
      {
        scroll: false,
      }
    );

  }, [
    search,
    pageType,
    region,
    duration,
    difficulty,
    minPrice,
    maxPrice,
    currentPage,
    router,
  ]);


  /*
  ========================================
  CLEAR FILTERS
  ========================================
  */

  const clearFilters = () => {

    setSearch("");

    setPageType("");

    setRegion("");

    setDuration("");

    setDifficulty("");

    setMinPrice("");

    setMaxPrice("");

    setCurrentPage(1);

  };


  /*
  ========================================
  FILTER ACTIVE CHECK
  ========================================
  */

  const filtersActive =
    Boolean(
      search.trim() ||
      pageType ||
      region ||
      duration.trim() ||
      difficulty ||
      minPrice ||
      maxPrice
    );


  /*
  ========================================
  DIFFICULTY OPTIONS
  ========================================
  */

  const difficulties =
    useMemo(
      () => [
        "Easy",
        "Moderate",
        "Challenging",
        "Difficult",
      ],
      []
    );


  /*
  ========================================
  RENDER
  ========================================
  */

  return (

    <main className="min-h-screen bg-gray-50">


      {/* ========================================
          HERO / SEARCH HEADER
      ======================================== */}

      <section className="bg-slate-900 text-white">

        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">

          <div className="max-w-3xl">

            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-300">

              Explore Nepal

            </p>


            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">

              Search Experiences

            </h1>


            <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">

              Find treks, tours, climbing adventures,
              and other experiences.

            </p>


            {/* SEARCH BOX */}

            <form
              onSubmit={(event) => {

                event.preventDefault();

                setCurrentPage(1);

              }}
              className="mt-7"
            >

              <div className="flex flex-col gap-3 sm:flex-row">

                <div className="relative flex-1">

                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-gray-400">

                    🔎

                  </span>


                  <input
                    type="search"
                    value={search}
                    onChange={(event) => {

                      setSearch(
                        event.target.value
                      );

                      setCurrentPage(1);

                    }}
                    placeholder="Search by trek, tour, destination..."
                    className="w-full rounded-xl border border-white/20 bg-white px-12 py-4 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:border-white focus:ring-2 focus:ring-white/30"
                  />

                </div>


                <button
                  type="submit"
                  className="rounded-xl bg-white px-7 py-4 font-semibold text-slate-900 transition hover:bg-slate-100"
                >

                  Search

                </button>

              </div>

            </form>

          </div>

        </div>

      </section>


      {/* ========================================
          MAIN CONTENT
      ======================================== */}

      <section className="mx-auto max-w-full px-5 py-8 sm:px-8 lg:px-10">

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">


          {/* ========================================
              FILTER SIDEBAR
          ======================================== */}

          < aside className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">

            <div className="mb-6 flex items-center justify-between">

              <h2 className="text-lg font-bold text-gray-900">

                Filters

              </h2>


              {filtersActive && (

                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >

                  Clear all

                </button>

              )}

            </div>


            <div className="space-y-5">


              {/* PAGE TYPE */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">

                  Page Type

                </label>


                <select
                  value={pageType}
                  onChange={(event) => {

                    setPageType(
                      event.target.value
                    );

                    setCurrentPage(1);

                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                >

                  <option value="">

                    All Types

                  </option>


                  {pageTypes.map(
                    (item) => (

                      <option
                        key={
                          item._id ||
                          item.id ||
                          item.slug
                        }
                        value={
                          item.slug ||
                          item._id
                        }
                      >

                        {item.name ||
                          item.title ||
                          item.slug}

                      </option>

                    )
                  )}

                </select>

              </div>


              {/* REGION */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">

                  Region

                </label>


                <select
                  value={region}
                  onChange={(event) => {

                    setRegion(
                      event.target.value
                    );

                    setCurrentPage(1);

                  }}
                  disabled={
                    loadingFilters
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200 disabled:bg-gray-100"
                >

                  <option value="">

                    All Regions

                  </option>


                  {regions.map(
                    (item) => (

                      <option
                        key={
                          item._id ||
                          item.id ||
                          item.slug
                        }
                        value={
                          item.slug ||
                          item._id
                        }
                      >

                        {item.name ||
                          item.title ||
                          item.slug}

                      </option>

                    )
                  )}

                </select>

              </div>


              {/* DURATION */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">

                  Duration

                </label>


                <input
                  type="text"
                  value={duration}
                  onChange={(event) => {

                    setDuration(
                      event.target.value
                    );

                    setCurrentPage(1);

                  }}
                  placeholder='Example: 14 Days'
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                />

              </div>


              {/* DIFFICULTY */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">

                  Difficulty

                </label>


                <select
                  value={difficulty}
                  onChange={(event) => {

                    setDifficulty(
                      event.target.value
                    );

                    setCurrentPage(1);

                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                >

                  <option value="">

                    All Difficulties

                  </option>


                  {difficulties.map(
                    (item) => (

                      <option
                        key={item}
                        value={item}
                      >

                        {item}

                      </option>

                    )
                  )}

                </select>

              </div>


              {/* PRICE */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700">

                  Price

                </label>


                <div className="grid grid-cols-2 gap-2">

                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(event) => {

                      setMinPrice(
                        event.target.value
                      );

                      setCurrentPage(1);

                    }}
                    placeholder="Min"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                  />


                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(event) => {

                      setMaxPrice(
                        event.target.value
                      );

                      setCurrentPage(1);

                    }}
                    placeholder="Max"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200"
                  />

                </div>

              </div>


              {/* CLEAR */}

              {filtersActive && (

                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >

                  Reset Filters

                </button>

              )}

            </div>

          </aside>


          {/* ========================================
              RESULTS
          ======================================== */}

          <div>


            {/* RESULT HEADER */}

            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="text-xl font-bold text-gray-900">

                  Search Results

                </h2>


                {!loading && (

                  <p className="mt-1 text-sm text-gray-500">

                    {totalItems}{" "}
                    {totalItems === 1
                      ? "result"
                      : "results"}{" "}
                    found

                  </p>

                )}

              </div>


              {filtersActive && (

                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-left text-sm font-medium text-slate-700 hover:text-slate-900 sm:text-right"
                >

                  Clear filters

                </button>

              )}

            </div>


            {/* ERROR */}

            {error && (

              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

                {error}

              </div>

            )}


            {/* LOADING */}

            {loading && (

              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

                {[1, 2, 3, 4, 5, 6].map(
                  (item) => (

                    <div
                      key={item}
                      className="overflow-hidden rounded-2xl border border-gray-200 bg-white"
                    >

                      <div className="h-52 animate-pulse bg-gray-200" />

                      <div className="space-y-3 p-5">

                        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />

                        <div className="h-6 w-4/5 animate-pulse rounded bg-gray-200" />

                        <div className="h-4 w-full animate-pulse rounded bg-gray-200" />

                        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />

                      </div>

                    </div>

                  )
                )}

              </div>

            )}


            {/* NO RESULTS */}

            {!loading &&
              !error &&
              pages.length === 0 && (

                <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">

                  <div className="text-5xl">

                    🔎

                  </div>


                  <h3 className="mt-5 text-xl font-bold text-gray-900">

                    No results found

                  </h3>


                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">

                    Try changing your search term
                    or removing one or more filters.

                  </p>


                  {filtersActive && (

                    <button
                      type="button"
                      onClick={clearFilters}
                      className="mt-6 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >

                      Clear Filters

                    </button>

                  )}

                </div>

              )}


            {/* RESULTS GRID */}

            {!loading &&
              !error &&
              pages.length > 0 && (

                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-5">

                  {pages.map(
                    (item) => {

                      const image =
                        getImageUrl(
                          item
                        );

                      const type =
                        getPageTypeName(
                          item
                        );

                      const regionName =
                        getRegionName(
                          item
                        );

                      const itemDuration =
                        getDuration(
                          item
                        );

                      const itemDifficulty =
                        getDifficulty(
                          item
                        );

                      const price =
                        getPrice(
                          item
                        );

                      const currency =
                        getCurrency(
                          item
                        );

                      const url =
                        getPageUrl(
                          item
                        );


                      return (

                        <article
                          key={
                            item._id ||
                            item.id ||
                            item.slug
                          }
                          className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                        >


                          {/* IMAGE */}

                          <Link href={url}>

                            <div className="relative h-52 overflow-hidden bg-gray-100">

                              {image ? (

                                <img
                                  src={image}
                                  alt={
                                    item.title ||
                                    "Experience"
                                  }
                                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                />

                              ) : (

                                <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">

                                  🏔️

                                </div>

                              )}


                              <div className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-gray-800 shadow">

                                {type}

                              </div>

                            </div>

                          </Link>


                          {/* CONTENT */}

                          <div className="p-5">


                            {regionName && (

                              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">

                                {regionName}

                              </p>

                            )}


                            <Link href={url}>

                              <h3 className="line-clamp-2 text-lg font-bold leading-7 text-gray-900 transition group-hover:text-slate-700">

                                {item.title}

                              </h3>

                            </Link>


                            {item.description && (

                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-500">

                                {item.description}

                              </p>

                            )}


                            {/* DETAILS */}

                            {(itemDuration ||
                              itemDifficulty) && (

                              <div className="mt-4 flex flex-wrap gap-2">

                                {itemDuration && (

                                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">

                                    📅{" "}
                                    {itemDuration}

                                  </span>

                                )}


                                {itemDifficulty && (

                                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">

                                    🥾{" "}
                                    {itemDifficulty}

                                  </span>

                                )}

                              </div>

                            )}


                            {/* FOOTER */}

                            <div className="mt-5 flex items-end justify-between gap-3 border-t border-gray-100 pt-4">

                              <div>

                                {price > 0 && (

                                  <>

                                    <p className="text-22  text-gray-900">

                                      Start From

                                    </p>

                                    <p className="text-lg font-bold text-gray-900">

                                      {currency}{" "}

                                      {price.toLocaleString()}

                                    </p>

                                  </>

                                )}

                              </div>


                              <Link
                                href={url}
                                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                              >

                                View Details

                              </Link>

                            </div>

                          </div>

                        </article>

                      );

                    }
                  )}

                </div>

              )}


            {/* ========================================
                PAGINATION
            ======================================== */}

            {!loading &&
              totalPages > 1 && (

                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">


                  {/* PREVIOUS */}

                  <button
                    type="button"
                    disabled={
                      currentPage <= 1
                    }
                    onClick={() => {

                      setCurrentPage(
                        (value) =>
                          Math.max(
                            1,
                            value - 1
                          )
                      );

                      window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });

                    }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >

                    ← Previous

                  </button>


                  {/* PAGE NUMBERS */}

                  {Array.from(
                    {
                      length: totalPages,
                    },
                    (_, index) =>
                      index + 1
                  )
                    .filter(
                      (number) => {

                        return (
                          number === 1 ||
                          number === totalPages ||
                          Math.abs(
                            number -
                              currentPage
                          ) <= 2
                        );

                      }
                    )
                    .map(
                      (number) => (

                        <button
                          type="button"
                          key={number}
                          onClick={() => {

                            setCurrentPage(
                              number
                            );

                            window.scrollTo({
                              top: 0,
                              behavior: "smooth",
                            });

                          }}
                          className={`min-w-10 rounded-lg px-3 py-2 text-sm font-semibold ${
                            number ===
                            currentPage
                              ? "bg-slate-900 text-white"
                              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >

                          {number}

                        </button>

                      )
                    )}


                  {/* NEXT */}

                  <button
                    type="button"
                    disabled={
                      currentPage >=
                      totalPages
                    }
                    onClick={() => {

                      setCurrentPage(
                        (value) =>
                          Math.min(
                            totalPages,
                            value + 1
                          )
                      );

                      window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });

                    }}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >

                    Next →

                  </button>

                </div>

              )}

          </div>

        </div>

      </section>

    </main>

  );

}

