"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

const STATUS_OPTIONS = [
  "draft",
  "open",
  "full",
  "closed",
  "cancelled",
  "completed",
];

function formatDate(date) {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusClasses(status) {
  const classes = {
    draft: "bg-gray-100 text-gray-700",
    open: "bg-green-100 text-green-700",
    full: "bg-amber-100 text-amber-800",
    closed: "bg-slate-200 text-slate-700",
    cancelled: "bg-red-100 text-red-700",
    completed: "bg-blue-100 text-blue-700",
  };

  return classes[status] || "bg-gray-100 text-gray-700";
}

function getExperienceTitle(departure) {
  const experience = departure.experienceId;

  if (!experience) return "Experience unavailable";

  return experience.title || "Untitled experience";
}

export default function AdminDeparturesPage() {
  const [departures, setDepartures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState("");

  const loadDepartures = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/departures", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load departures."
        );
      }

      setDepartures(
        Array.isArray(result.data) ? result.data : []
      );
    } catch (err) {
      console.error("LOAD DEPARTURES ERROR:", err);
      setError(err.message || "Failed to load departures.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDepartures();
  }, [loadDepartures]);

  const filteredDepartures = useMemo(() => {
    const query = search.trim().toLowerCase();

    return departures.filter((departure) => {
      const experienceTitle = getExperienceTitle(departure);
      const experienceSlug =
        departure.experienceId?.slug || "";

      const matchesSearch =
        !query ||
        experienceTitle.toLowerCase().includes(query) ||
        experienceSlug.toLowerCase().includes(query) ||
        String(departure._id).toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        departure.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [departures, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: departures.length,
      open: departures.filter(
        (item) => item.status === "open"
      ).length,
      draft: departures.filter(
        (item) => item.status === "draft"
      ).length,
      cancelled: departures.filter(
        (item) => item.status === "cancelled"
      ).length,
    };
  }, [departures]);

  async function updateStatus(departure, newStatus) {
    if (departure.status === newStatus) return;

    const confirmed = window.confirm(
      `Change "${getExperienceTitle(departure)}" to "${newStatus}"?`
    );

    if (!confirmed) return;

    try {
      setBusyId(String(departure._id));
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/departures/${departure._id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to update departure status."
        );
      }

      setSuccess("Departure status updated successfully.");
      await loadDepartures();
    } catch (err) {
      console.error("UPDATE DEPARTURE STATUS ERROR:", err);
      setError(err.message || "Failed to update departure status.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteDeparture(departure) {
    const confirmed = window.confirm(
      `Delete the departure for "${getExperienceTitle(departure)}" starting ${formatDate(departure.startDate)}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setBusyId(String(departure._id));
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/departures/${departure._id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to delete departure."
        );
      }

      setSuccess("Departure deleted successfully.");

      setDepartures((current) =>
        current.filter(
          (item) => String(item._id) !== String(departure._id)
        )
      );
    } catch (err) {
      console.error("DELETE DEPARTURE ERROR:", err);
      setError(err.message || "Failed to delete departure.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* PAGE HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Booking Management
            </p>

            <h1 className="mt-2 text-3xl font-bold text-gray-900">
              Departures
            </h1>

            <p className="mt-2 text-sm text-gray-600">
              Manage departure dates, capacity, availability, and status.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={loadDepartures}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <Link
              href="/admin/departures/create"
              className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              + Create Departure
            </Link>
          </div>
        </div>

        {/* ALERTS */}
        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="font-bold"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-6 flex items-start justify-between gap-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            <span>{success}</span>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="font-bold"
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        )}

        {/* SUMMARY CARDS */}
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Departures"
            value={stats.total}
            description="All scheduled departures"
          />

          <SummaryCard
            title="Open"
            value={stats.open}
            description="Marked open for booking"
          />

          <SummaryCard
            title="Draft"
            value={stats.draft}
            description="Not yet published for booking"
          />

          <SummaryCard
            title="Cancelled"
            value={stats.cancelled}
            description="Cancelled departures"
          />
        </section>

        {/* SEARCH AND FILTER */}
        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label
                htmlFor="departure-search"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Search departures
              </label>

              <input
                id="departure-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by experience title, slug, or ID..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="departure-status"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Filter by status
              </label>

              <select
                id="departure-status"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="all">All statuses</option>

                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Showing {filteredDepartures.length} of {departures.length} departures
          </div>
        </section>

        {/* DEPARTURES TABLE */}
        <section className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-700" />

              <p className="mt-4 text-sm text-gray-600">
                Loading departures...
              </p>
            </div>
          ) : filteredDepartures.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h2 className="text-lg font-semibold text-gray-900">
                No departures found
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                {departures.length === 0
                  ? "Create a departure to get started."
                  : "Try changing your search or status filter."}
              </p>

              {departures.length === 0 && (
                <Link
                  href="/admin/departures/create"
                  className="mt-5 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Create your first departure
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full divide-y divide-gray-200 text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Experience
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Dates
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Capacity
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Available
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Change Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredDepartures.map((departure) => {
                    const id = String(departure._id);
                    const capacity = Number(departure.capacity || 0);
                    const reserved = Number(departure.reservedPax || 0);
                    const available = Math.max(0, capacity - reserved);
                    const isBusy = busyId === id;

                    return (
                      <tr key={id} className="hover:bg-gray-50">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-gray-900">
                            {getExperienceTitle(departure)}
                          </div>

                          <div className="mt-1 text-xs text-gray-500">
                            {departure.experienceId?.slug || "No slug"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          <div>
                            <span className="font-medium">Start:</span>{" "}
                            {formatDate(departure.startDate)}
                          </div>

                          <div className="mt-1">
                            <span className="font-medium">End:</span>{" "}
                            {formatDate(departure.endDate)}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-700">
                          <div className="font-semibold">{capacity}</div>

                          <div className="mt-1 text-xs text-gray-500">
                            Reserved: {reserved}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`font-semibold ${
                              available > 0
                                ? "text-green-700"
                                : "text-red-700"
                            }`}
                          >
                            {available}
                          </span>
                          <span className="ml-1 text-xs text-gray-500">
                            seats
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusClasses(
                              departure.status
                            )}`}
                          >
                            {departure.status || "unknown"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <select
                            aria-label={`Change status for ${getExperienceTitle(departure)}`}
                            value={departure.status || "draft"}
                            disabled={isBusy}
                            onChange={(event) =>
                              updateStatus(departure, event.target.value)
                            }
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm capitalize disabled:opacity-50"
                          >
                            {STATUS_OPTIONS.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-3">
                            <Link
                              href={`/admin/departures/${id}/edit`}
                              className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                            >
                              Edit
                            </Link>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => deleteDeparture(departure)}
                              className="text-sm font-semibold text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isBusy ? "Working..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-4 text-xs leading-5 text-gray-500">
          Availability is calculated from capacity minus reserved passengers.
          Your enquiry flow does not yet reserve seats automatically, so these
          numbers will become meaningful for actual bookings once reservation
          handling is implemented.
        </p>
      </div>
    </main>
  );
}

function SummaryCard({ title, value, description }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{title}</p>

      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>

      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </div>
  );
}