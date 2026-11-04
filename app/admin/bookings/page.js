"use client";

import { useEffect, useMemo, useState } from "react";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  /*
  ========================================
  LOAD BOOKINGS
  ========================================
  */

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/bookings", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to load bookings."
        );
      }

      setBookings(result.data || []);
    } catch (err) {
      console.error("LOAD BOOKINGS ERROR:", err);
      setError(err.message || "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  /*
  ========================================
  UPDATE BOOKING STATUS
  ========================================
  */

  async function updateStatus(bookingId, status) {
    try {
      setUpdatingId(bookingId);
      setError("");

      const response = await fetch(
        `/api/bookings/${bookingId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to update booking."
        );
      }

      setBookings((previous) =>
        previous.map((booking) =>
          booking._id === bookingId
            ? {
                ...booking,
                status: result.data?.status || status,
              }
            : booking
        )
      );
    } catch (err) {
      console.error("UPDATE STATUS ERROR:", err);
      alert(err.message || "Failed to update booking.");
    } finally {
      setUpdatingId(null);
    }
  }

  /*
  ========================================
  DELETE BOOKING
  ========================================
  */

  async function deleteBooking(bookingId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this booking?"
    );

    if (!confirmed) return;

    try {
      setUpdatingId(bookingId);

      const response = await fetch(
        `/api/bookings/${bookingId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to delete booking."
        );
      }

      setBookings((previous) =>
        previous.filter((booking) => booking._id !== bookingId)
      );
    } catch (err) {
      console.error("DELETE BOOKING ERROR:", err);
      alert(err.message || "Failed to delete booking.");
    } finally {
      setUpdatingId(null);
    }
  }

  /*
  ========================================
  EXPERIENCE INFORMATION
  ========================================
  */

  function getExperienceType(booking) {
    const pageType = booking.experience?.pageType;

    if (pageType && typeof pageType === "object") {
      return pageType.name || pageType.slug || "Experience";
    }

    return pageType || booking.experienceType || "Experience";
  }

  function getExperienceTitle(booking) {
    return (
      booking.experience?.title ||
      booking.experienceTitle ||
      booking.trekTitle ||
      "Experience"
    );
  }

  /*
  ========================================
  FORMAT HELPERS
  ========================================
  */

  function formatPrice(amount, currency = "USD") {
    if (amount === undefined || amount === null || amount === "") {
      return "—";
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) {
      return "—";
    }

    return `${currency} ${numericAmount.toLocaleString()}`;
  }

  function formatDate(value) {
    if (!value) return "Not provided";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not provided";
    }

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatDateRange(startDate, endDate) {
    if (!startDate && !endDate) {
      return "Not provided";
    }

    if (startDate && endDate) {
      return `${formatDate(startDate)} – ${formatDate(endDate)}`;
    }

    return formatDate(startDate || endDate);
  }

  function getStatusClass(status) {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-700";

      case "cancelled":
        return "bg-red-100 text-red-700";

      case "pending":
        return "bg-yellow-100 text-yellow-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  /*
  ========================================
  FILTER BOOKINGS
  ========================================
  */

  const filteredBookings = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "all" ||
        booking.status === statusFilter;

      const searchableText = [
        booking.name,
        booking.email,
        booking.phone,
        booking.country,
        getExperienceTitle(booking),
        getExperienceType(booking),
        booking._id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !searchValue || searchableText.includes(searchValue);

      return matchesStatus && matchesSearch;
    });
  }, [bookings, search, statusFilter]);

  /*
  ========================================
  SUMMARY COUNTS
  ========================================
  */

  const pendingCount = bookings.filter(
    (booking) => booking.status === "pending"
  ).length;

  const confirmedCount = bookings.filter(
    (booking) => booking.status === "confirmed"
  ).length;

  const cancelledCount = bookings.filter(
    (booking) => booking.status === "cancelled"
  ).length;

  /*
  ========================================
  LOADING
  ========================================
  */

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-white p-10 text-center shadow">
          <p className="text-gray-500">Loading bookings...</p>
        </div>
      </div>
    );
  }

  /*
  ========================================
  PAGE
  ========================================
  */

  return (
    <div className="p-4 md:p-6">
      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">
            Bookings
          </h1>

          <p className="mt-1 text-gray-500">
            Manage customer bookings for all experiences.
          </p>
        </div>

        <button
          onClick={loadBookings}
          disabled={loading}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          Refresh Bookings
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mb-6 rounded-lg bg-red-100 p-4 text-red-700">
          {error}
        </div>
      )}

      {/* SUMMARY */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="mt-1 text-3xl font-bold">
            {bookings.length}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="mt-1 text-3xl font-bold text-yellow-600">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Confirmed</p>
          <p className="mt-1 text-3xl font-bold text-green-600">
            {confirmedCount}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <p className="text-sm text-gray-500">Cancelled</p>
          <p className="mt-1 text-3xl font-bold text-red-600">
            {cancelledCount}
          </p>
        </div>
      </div>

      {/* SEARCH AND FILTER */}

      <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow md:grid-cols-3">
        <div className="md:col-span-2">
          <label
            htmlFor="bookingSearch"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Search Bookings
          </label>

          <input
            id="bookingSearch"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, email, experience..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-600"
          />
        </div>

        <div>
          <label
            htmlFor="statusFilter"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Filter by Status
          </label>

          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-600"
          >
            <option value="all">All Bookings</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* NO BOOKINGS */}

      {bookings.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow">
          <h2 className="text-xl font-semibold">
            No bookings yet
          </h2>

          <p className="mt-2 text-gray-500">
            Customer bookings will appear here.
          </p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-xl bg-white p-10 text-center shadow">
          <h2 className="text-xl font-semibold">
            No matching bookings
          </h2>

          <p className="mt-2 text-gray-500">
            Try changing your search or status filter.
          </p>

          <button
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
            className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          <div className="mb-3 text-sm text-gray-500">
            Showing {filteredBookings.length} of {bookings.length} bookings
          </div>

          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const experienceTitle = getExperienceTitle(booking);
              const experienceType = getExperienceType(booking);

              const currency =
                booking.packageCurrency ||
                booking.experience?.price?.currency ||
                "USD";

              const departureStartDate =
                booking.departureStartDate ||
                booking.departure?.startDate;

              const departureEndDate =
                booking.departureEndDate ||
                booking.departure?.endDate;

              const hasDeparture =
                Boolean(departureStartDate || departureEndDate);

              return (
                <div
                  key={booking._id}
                  className="rounded-xl bg-white p-5 shadow transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    {/* BOOKING INFORMATION */}

                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-bold">
                        {booking.name || "Customer"}
                      </h2>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <p className="font-medium text-gray-700">
                          {experienceTitle}
                        </p>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {experienceType}
                        </span>
                      </div>

                      {/* CUSTOMER DETAILS */}

                      <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm text-gray-600 md:grid-cols-2">
                        <p>
                          <strong>Email:</strong>{" "}
                          {booking.email || "Not provided"}
                        </p>

                        <p>
                          <strong>Phone:</strong>{" "}
                          {booking.phone || "Not provided"}
                        </p>

                        <p>
                          <strong>Country:</strong>{" "}
                          {booking.country || "Not provided"}
                        </p>

                        <p>
                          <strong>People:</strong>{" "}
                          {booking.numberOfPeople ?? "—"}
                        </p>

                        <p>
                          <strong>Terms and Conditions:</strong>{" "}
                          {booking.acceptTerms ? "Accepted" : "Not accepted"}
                        </p>

                        <p>
                          <strong>Preferred Date:</strong>{" "}
                          {formatDate(booking.preferredDate)}
                        </p>

                        <p>
                          <strong>Price / Person:</strong>{" "}
                          {formatPrice(booking.packagePrice, currency)}
                        </p>
                      </div>

                      {/* DEPARTURE DETAILS */}

                      {hasDeparture && (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                          <h3 className="font-semibold text-blue-900">
                            Selected Departure
                          </h3>

                          <p className="mt-1 text-sm text-blue-800">
                            {formatDateRange(
                              departureStartDate,
                              departureEndDate
                            )}
                          </p>

                          {booking.departure?._id && (
                            <p className="mt-1 break-all text-xs text-blue-700">
                              Departure ID: {booking.departure._id}
                            </p>
                          )}
                        </div>
                      )}

                      {/* ESTIMATED TOTAL */}

                      <div className="mt-4 rounded-lg bg-gray-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-600">
                            Estimated Total
                          </span>

                          <span className="text-lg font-bold text-gray-900">
                            {formatPrice(
                              booking.estimatedTotal,
                              currency
                            )}
                          </span>
                        </div>
                      </div>

                      {/* MESSAGE */}

                      {booking.message && (
                        <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
                          <strong>Message:</strong>

                          <p className="mt-1 whitespace-pre-wrap text-gray-600">
                            {booking.message}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* ACTIONS */}

                    <div className="flex flex-col gap-3 lg:min-w-48">
                      <span
                        className={`rounded-full px-3 py-2 text-center text-sm font-semibold capitalize ${getStatusClass(
                          booking.status
                        )}`}
                      >
                        {booking.status || "unknown"}
                      </span>

                      <label className="text-xs font-medium text-gray-500">
                        Update Booking Status
                      </label>

                      <select
                        value={booking.status || "pending"}
                        disabled={updatingId === booking._id}
                        onChange={(e) =>
                          updateStatus(booking._id, e.target.value)
                        }
                        className="rounded-lg border border-gray-300 bg-white p-2 text-sm outline-none focus:border-gray-500 disabled:opacity-50"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>

                      <button
                        onClick={() => deleteBooking(booking._id)}
                        disabled={updatingId === booking._id}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingId === booking._id
                          ? "Processing..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>

                  {/* FOOTER */}

                  <div className="mt-5 flex flex-col gap-1 border-t pt-3 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                    <span className="break-all">
                      Booking ID: {booking._id}
                    </span>

                    {booking.createdAt && (
                      <span>
                        Created:{" "}
                        {new Date(booking.createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}