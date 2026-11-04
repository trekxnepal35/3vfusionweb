"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    pages: 0,
    regions: 0,
    bookings: 0,
    treks: 0,
    tours: 0,
    pageTypes: 0,
    departures: 0,
    openDepartures: 0,
  });

  const [loading, setLoading] = useState(true);

  // =========================================
  // LOAD DASHBOARD STATISTICS
  // =========================================

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        setLoading(true);

        const responses = await Promise.all([
          fetch("/api/pages", { cache: "no-store" }),
          fetch("/api/regions", { cache: "no-store" }),
          fetch("/api/bookings", { cache: "no-store" }),
          fetch("/api/treks", { cache: "no-store" }),
          fetch("/api/tours", { cache: "no-store" }),
          fetch("/api/page-types", { cache: "no-store" }),
          fetch("/api/admin/departures", { cache: "no-store" }),
        ]);

        const [
          pagesResponse,
          regionsResponse,
          bookingsResponse,
          treksResponse,
          toursResponse,
          pageTypesResponse,
          departuresResponse,
        ] = responses;

        const [
          pagesData,
          regionsData,
          bookingsData,
          treksData,
          toursData,
          pageTypesData,
          departuresData,
        ] = await Promise.all(
          responses.map(async (response) => {
            if (!response.ok) return { data: [] };

            try {
              return await response.json();
            } catch {
              return { data: [] };
            }
          })
        );

        const pages = Array.isArray(pagesData.data)
          ? pagesData.data
          : [];

        const regions = Array.isArray(regionsData.data)
          ? regionsData.data
          : [];

        const bookings = Array.isArray(bookingsData.data)
          ? bookingsData.data
          : [];

        const treks = Array.isArray(treksData.data)
          ? treksData.data
          : [];

        const tours = Array.isArray(toursData.data)
          ? toursData.data
          : [];

        const pageTypes = Array.isArray(pageTypesData.data)
          ? pageTypesData.data
          : [];

        const departures = Array.isArray(departuresData.data)
          ? departuresData.data
          : [];

        setStats({
          pages: pages.length,
          regions: regions.length,
          bookings: bookings.length,
          treks: treks.length,
          tours: tours.length,
          pageTypes: pageTypes.length,
          departures: departures.length,
          openDepartures: departures.filter(
            (departure) => departure.status === "open"
          ).length,
        });
      } catch (error) {
        console.error("Dashboard statistics error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardStats();
  }, []);

  // =========================================
  // DASHBOARD CARDS
  // =========================================

  const cards = [
    {
      title: "Pages",
      value: stats.pages,
      description: "Manage website pages",
      href: "/admin/pages",
      icon: "📄",
    },
    {
      title: "Page Types",
      value: stats.pageTypes,
      description: "Manage dynamic page types",
      href: "/admin/page-types",
      icon: "🏷️",
    },
    {
      title: "Regions",
      value: stats.regions,
      description: "Manage trekking regions",
      href: "/admin/regions",
      icon: "🌄",
    },
    {
      title: "Treks",
      value: stats.treks,
      description: "Manage trekking packages",
      href: "/admin/pages?type=trek",
      icon: "🥾",
    },
    {
      title: "Tours",
      value: stats.tours,
      description: "Manage tour packages",
      href: "/admin/pages?type=tour",
      icon: "🏔️",
    },
    {
      title: "Reservations",
      value: stats.bookings,
      description: "Manage customer reservations",
      href: "/admin/bookings",
      icon: "📅",
    },
    {
      title: "Departure Management",
      value: stats.departures,
      description: `${stats.openDepartures} open departures`,
      href: "/admin/departures",
      icon: "🗓️",
    },
  ];

  return (
    <div className="space-y-8">
      {/* =========================================
          HEADER
      ========================================= */}

      <section>
        <h1 className="text-3xl font-bold text-gray-900">
          Admin Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Manage your Trek Nepal website from one place.
        </p>
      </section>

      {/* =========================================
          STATISTICS
      ========================================= */}

      <section>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <span className="text-3xl">
                  {card.icon}
                </span>

                <span className="text-sm text-gray-400 group-hover:text-gray-700">
                  View →
                </span>
              </div>

              <h2 className="mt-5 text-sm font-medium text-gray-500">
                {card.title}
              </h2>

              <p className="mt-1 text-3xl font-bold text-gray-900">
                {loading ? "..." : card.value}
              </p>

              <p className="mt-2 text-sm text-gray-500">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* =========================================
          QUICK ACTIONS
      ========================================= */}

      <section>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Navbar */}

          <Link
            href="/admin/navbar"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-orange-400 hover:shadow-md"
          >
            <div className="text-2xl">🧭</div>

            <h3 className="mt-3 font-semibold text-gray-900">
              Manage Navbar
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Add, edit, and delete website navbar items.
            </p>
          </Link>

          {/* Page Types */}

          <Link
            href="/admin/page-types"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-blue-400 hover:shadow-md"
          >
            <div className="text-2xl">🏷️</div>

            <h3 className="mt-3 font-semibold text-gray-900">
              Manage Page Types
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Add and manage Trek, Tour, Climbing, Adventure,
              and other page types.
            </p>
          </Link>

          {/* Pages */}

          <Link
            href="/admin/pages/create"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-green-400 hover:shadow-md"
          >
            <div className="text-2xl">📄</div>

            <h3 className="mt-3 font-semibold text-gray-900">
              Create Page
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Create a new Trek, Tour, Climbing, Adventure,
              or General page.
            </p>
          </Link>

          {/* Reservations */}

          <Link
            href="/admin/bookings"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-purple-400 hover:shadow-md"
          >
            <div className="text-2xl">📅</div>

            <h3 className="mt-3 font-semibold text-gray-900">
              Manage Reservations
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              View and manage customer reservations.
            </p>
          </Link>

          {/* Departure Management */}

          <Link
            href="/admin/departures"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-400 hover:shadow-md"
          >
            <div className="text-2xl">🗓️</div>

            <h3 className="mt-3 font-semibold text-gray-900">
              Departure Management
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Create departures, manage schedules, and monitor available seats.
            </p>
          </Link>
        </div>
      </section>

      {/* =========================================
          WEBSITE MANAGEMENT
      ========================================= */}

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          Website Management
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Manage the dynamic parts of your website.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {/* Dynamic Navbar */}

          <div className="rounded-lg bg-gray-50 p-5">
            <div className="text-2xl">🧭</div>

            <h3 className="mt-3 font-semibold text-gray-900">
              Dynamic Navbar
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Your existing Navbar CRUD controls the website
              navigation menu.
            </p>

            <Link
              href="/admin/navbar"
              className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              Manage Navbar →
            </Link>
          </div>

          {/* Dynamic Page Types */}

          <div className="rounded-lg bg-gray-50 p-5">
            <div className="text-2xl">🏷️</div>

            <h3 className="mt-3 font-semibold text-gray-900">
              Dynamic Page Types
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Create Trek, Tour, Climbing, Adventure, Expedition,
              Hiking, or any future page type.
            </p>

            <Link
              href="/admin/page-types"
              className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              Manage Page Types →
            </Link>
          </div>

          {/* Dynamic Regions */}

          <div className="rounded-lg bg-gray-50 p-5">
            <div className="text-2xl">🌄</div>

            <h3 className="mt-3 font-semibold text-gray-900">
              Dynamic Regions
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Regions are dynamic and can optionally be assigned
              to pages.
            </p>

            <Link
              href="/admin/regions"
              className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              Manage Regions →
            </Link>
          </div>

          {/* Dynamic Pages */}

          <div className="rounded-lg bg-gray-50 p-5">
            <div className="text-2xl">📄</div>

            <h3 className="mt-3 font-semibold text-gray-900">
              Dynamic Pages
            </h3>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Create and manage all website content using the
              selected Page Type and optional Region.
            </p>

            <Link
              href="/admin/pages"
              className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              Manage Pages →
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================
          PAGE TYPE + REGION LOGIC
      ========================================= */}

      <section className="rounded-xl border border-blue-100 bg-blue-50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Page Structure
        </h2>

        <p className="mt-2 text-sm text-gray-600">
          Page Type is required, while Region is optional.
          This allows different types of experiences to use
          regions only when appropriate.
        </p>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-blue-200">
                <th className="px-4 py-3 font-semibold text-gray-700">
                  Example Page
                </th>

                <th className="px-4 py-3 font-semibold text-gray-700">
                  Page Type
                </th>

                <th className="px-4 py-3 font-semibold text-gray-700">
                  Region
                </th>
              </tr>
            </thead>

            <tbody>
              <tr className="border-b border-blue-100">
                <td className="px-4 py-3">
                  Everest Base Camp Trek
                </td>

                <td className="px-4 py-3">Trek</td>

                <td className="px-4 py-3">Everest</td>
              </tr>

              <tr className="border-b border-blue-100">
                <td className="px-4 py-3">
                  Island Peak Climbing
                </td>

                <td className="px-4 py-3">Climbing</td>

                <td className="px-4 py-3">Everest</td>
              </tr>

              <tr className="border-b border-blue-100">
                <td className="px-4 py-3">
                  Kathmandu Cultural Tour
                </td>

                <td className="px-4 py-3">Tour</td>

                <td className="px-4 py-3">No Region</td>
              </tr>

              <tr>
                <td className="px-4 py-3">
                  Nepal Adventure
                </td>

                <td className="px-4 py-3">Adventure</td>

                <td className="px-4 py-3">Optional</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}