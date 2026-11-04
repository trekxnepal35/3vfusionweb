
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function AdminPagesPage() {
  const [pages, setPages] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [bookings, setBookings] = useState([]);

  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [error, setError] = useState("");
  const [dashboardError, setDashboardError] = useState("");

  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState("");

  /*
  =========================================
  LOAD PAGES
  =========================================
  */

  async function loadPages() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/pages", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load pages"
        );
      }

      setPages(result.data || []);
    } catch (error) {
      console.error("LOAD PAGES ERROR:", error);

      setError(
        error.message || "Failed to load pages"
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  =========================================
  LOAD DEPARTURES AND BOOKINGS
  =========================================
  */

  async function loadAdminOverview() {
    try {
      setDashboardLoading(true);
      setDashboardError("");

      const [departureResponse, bookingResponse] =
        await Promise.all([
          fetch("/api/admin/departures", {
            cache: "no-store",
          }),

          fetch("/api/bookings", {
            cache: "no-store",
          }),
        ]);

      const [departureResult, bookingResult] =
        await Promise.all([
          departureResponse.json(),
          bookingResponse.json(),
        ]);

      if (
        !departureResponse.ok ||
        !departureResult.success
      ) {
        throw new Error(
          departureResult.message ||
            "Failed to load departures."
        );
      }

      if (
        !bookingResponse.ok ||
        !bookingResult.success
      ) {
        throw new Error(
          bookingResult.message ||
            "Failed to load reservations."
        );
      }

      setDepartures(departureResult.data || []);
      setBookings(bookingResult.data || []);
    } catch (error) {
      console.error(
        "LOAD ADMIN OVERVIEW ERROR:",
        error
      );

      setDashboardError(
        error.message ||
          "Failed to load dashboard information."
      );
    } finally {
      setDashboardLoading(false);
    }
  }

  useEffect(() => {
    loadPages();
    loadAdminOverview();
  }, []);

  /*
  =========================================
  DASHBOARD COUNTS
  =========================================
  */

  const departureCounts = useMemo(() => {
    return {
      total: departures.length,

      open: departures.filter(
        (item) => item.status === "open"
      ).length,

      draft: departures.filter(
        (item) => item.status === "draft"
      ).length,

      full: departures.filter(
        (item) => item.status === "full"
      ).length,

      closed: departures.filter(
        (item) =>
          ["closed", "cancelled", "completed"].includes(
            item.status
          )
      ).length,
    };
  }, [departures]);

  const bookingCounts = useMemo(() => {
    return {
      total: bookings.length,

      pending: bookings.filter(
        (item) => item.status === "pending"
      ).length,

      confirmed: bookings.filter(
        (item) => item.status === "confirmed"
      ).length,

      cancelled: bookings.filter(
        (item) => item.status === "cancelled"
      ).length,
    };
  }, [bookings]);

  /*
  =========================================
  DELETE PAGE
  =========================================
  */

  async function handleDelete(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this page?"
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      const response = await fetch(
        `/api/pages/${id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to delete page"
        );
      }

      setPages((current) =>
        current.filter((page) => page._id !== id)
      );
    } catch (error) {
      console.error("DELETE PAGE ERROR:", error);

      alert(
        error.message || "Failed to delete page"
      );
    } finally {
      setDeletingId(null);
    }
  }

  /*
  =========================================
  FILTER PAGES
  =========================================
  */

  const filteredPages = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return pages;

    return pages.filter((page) => {
      const title = page.title?.toLowerCase() || "";
      const slug = page.slug?.toLowerCase() || "";

      const pageType =
        page.pageType?.name?.toLowerCase() || "";

      const region =
        page.region?.name?.toLowerCase() || "";

      return (
        title.includes(query) ||
        slug.includes(query) ||
        pageType.includes(query) ||
        region.includes(query)
      );
    });
  }, [pages, search]);

  /*
  =========================================
  PRICE DISPLAY
  =========================================
  */

  function getPrice(page) {
    const price = page.price;

    if (!price) return "No price";

    const currency = price.currency || "USD";

    if (price.pricingType === "pax_based") {
      const tiers = price.paxPrices || [];

      if (tiers.length === 0) {
        return "PAX pricing";
      }

      return `${currency} / PAX`;
    }

    if (
      price.amount !== undefined &&
      price.amount !== null &&
      price.amount !== ""
    ) {
      return `${currency} ${price.amount}`;
    }

    return "No price";
  }

  /*
  =========================================
  REUSABLE DASHBOARD CARD
  =========================================
  */

  function OverviewCard({
    title,
    value,
    description,
    href,
    action,
  }) {
    return (
      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <div className="text-sm text-gray-500">
          {title}
        </div>

        <div className="text-3xl font-bold mt-2">
          {dashboardLoading ? "..." : value}
        </div>

        <p className="text-sm text-gray-500 mt-2">
          {description}
        </p>

        <Link
          href={href}
          className="inline-flex mt-4 text-sm font-semibold text-blue-700 hover:underline"
        >
          {action} →
        </Link>
      </div>
    );
  }

  /*
  =========================================
  PAGE
  =========================================
  */

  return (
    <div className="p-4 md:p-6 space-y-8">

      {/* =================================
          HEADER
      ================================= */}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Admin Dashboard
          </h1>

          <p className="text-gray-600 mt-1">
            Manage website pages, departures, and reservations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            loadPages();
            loadAdminOverview();
          }}
          className="px-5 py-3 border rounded-lg hover:bg-gray-50 transition"
        >
          ↻ Refresh Dashboard
        </button>
      </div>

      {/* =================================
          DASHBOARD ERROR
      ================================= */}

      {dashboardError && (
        <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-lg">
          {dashboardError}
        </div>
      )}

      {/* =================================
          DEPARTURE OVERVIEW
      ================================= */}

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold">
              Departure Management
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Create and manage scheduled departures.
            </p>
          </div>

          <Link
            href="/admin/departures/create"
            className="inline-flex justify-center items-center bg-black text-white px-5 py-3 rounded-lg hover:bg-gray-800"
          >
            + Add Departure
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <OverviewCard
            title="Total Departures"
            value={departureCounts.total}
            description="All scheduled departures"
            href="/admin/departures"
            action="Manage departures"
          />

          <OverviewCard
            title="Open Departures"
            value={departureCounts.open}
            description="Currently open for booking"
            href="/admin/departures"
            action="View departures"
          />

          <OverviewCard
            title="Draft Departures"
            value={departureCounts.draft}
            description="Departures not yet published for booking"
            href="/admin/departures"
            action="Manage drafts"
          />

          <OverviewCard
            title="Full Departures"
            value={departureCounts.full}
            description="Departures marked as full"
            href="/admin/departures"
            action="View departures"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/admin/departures"
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
          >
            Manage All Departures
          </Link>

          <Link
            href="/admin/departures/create"
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
          >
            Create New Departure
          </Link>
        </div>
      </section>

      {/* =================================
          RESERVATION OVERVIEW
      ================================= */}

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold">
              Reservations / Bookings
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Review customer bookings and manage reservation status.
            </p>
          </div>

          <Link
            href="/admin/bookings"
            className="inline-flex justify-center items-center bg-black text-white px-5 py-3 rounded-lg hover:bg-gray-800"
          >
            Manage Reservations
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <OverviewCard
            title="Total Reservations"
            value={bookingCounts.total}
            description="All customer bookings"
            href="/admin/bookings"
            action="View bookings"
          />

          <OverviewCard
            title="Pending Reservations"
            value={bookingCounts.pending}
            description="Awaiting admin confirmation"
            href="/admin/bookings"
            action="Review bookings"
          />

          <OverviewCard
            title="Confirmed Reservations"
            value={bookingCounts.confirmed}
            description="Confirmed customer bookings"
            href="/admin/bookings"
            action="View confirmed"
          />

          <OverviewCard
            title="Cancelled Reservations"
            value={bookingCounts.cancelled}
            description="Cancelled customer bookings"
            href="/admin/bookings"
            action="View cancelled"
          />
        </div>

        <div className="mt-4">
          <Link
            href="/admin/bookings"
            className="inline-flex px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
          >
            Open Booking Management →
          </Link>
        </div>
      </section>

      {/* =================================
          PAGE MANAGEMENT
      ================================= */}

      <section>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">
              Website Pages
            </h2>

            <p className="text-gray-600 mt-1">
              Create, edit, search, and delete website pages.
            </p>
          </div>

          <Link
            href="/admin/pages/create"
            className="inline-flex justify-center items-center bg-black text-white px-5 py-3 rounded-lg hover:bg-gray-800 transition"
          >
            + Create Page
          </Link>
        </div>

        {/* PAGE COUNT */}

        <div className="mb-5 bg-white border rounded-xl p-4">
          <div className="text-sm text-gray-500">
            Total Website Pages
          </div>

          <div className="text-2xl font-bold mt-1">
            {loading ? "..." : pages.length}
          </div>
        </div>

        {/* SEARCH */}

        <div className="mb-5">
          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search pages, page types or regions..."
            className="w-full md:max-w-md border rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-5 bg-red-100 text-red-700 border border-red-200 p-4 rounded-lg">
            {error}
          </div>
        )}

        {/* LOADING */}

        {loading && (
          <div className="bg-white border rounded-xl p-8 text-center text-gray-600">
            Loading pages...
          </div>
        )}

        {/* EMPTY */}

        {!loading && filteredPages.length === 0 && (
          <div className="bg-white border rounded-xl p-8 text-center">
            <h3 className="text-xl font-semibold">
              No Pages Found
            </h3>

            <p className="text-gray-500 mt-2">
              {search
                ? "No pages match your search."
                : "Create your first page."}
            </p>
          </div>
        )}

        {/* PAGE TABLE */}

        {!loading && filteredPages.length > 0 && (
          <div className="bg-white border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-4">
                      Title
                    </th>

                    <th className="text-left p-4">
                      Page Type
                    </th>

                    <th className="text-left p-4">
                      Region
                    </th>

                    <th className="text-left p-4">
                      Price
                    </th>

                    <th className="text-left p-4">
                      Status
                    </th>

                    <th className="text-right p-4">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPages.map((page) => (
                    <tr
                      key={page._id}
                      className="border-t hover:bg-gray-50"
                    >
                      {/* TITLE */}

                      <td className="p-4">
                        <div className="font-semibold">
                          {page.title}
                        </div>

                        <div className="text-sm text-gray-500">
                          /{page.slug}
                        </div>
                      </td>

                      {/* PAGE TYPE */}

                      <td className="p-4">
                        {page.pageType ? (
                          <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
                            {page.pageType.name}
                          </span>
                        ) : (
                          <span className="text-red-500 text-sm">
                            No Page Type
                          </span>
                        )}
                      </td>

                      {/* REGION */}

                      <td className="p-4">
                        {page.region ? (
                          <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                            {page.region.name}
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            No Region
                          </span>
                        )}
                      </td>

                      {/* PRICE */}

                      <td className="p-4">
                        {getPrice(page)}
                      </td>

                      {/* STATUS */}

                      <td className="p-4">
                        {page.published ? (
                          <span className="inline-block bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                            Published
                          </span>
                        ) : (
                          <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                            Draft
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}

                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/pages/edit/${page._id}`}
                            className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                          >
                            Edit
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(page._id)
                            }
                            disabled={
                              deletingId === page._id
                            }
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                          >
                            {deletingId === page._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
