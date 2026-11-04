"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const INITIAL_FORM = {
  experienceId: "",
  startDate: "",
  endDate: "",
  bookingDeadline: "",
  capacity: 12,
  status: "draft",
  notes: "",
  usePriceOverride: false,
  overrideEnabled: true,
  currency: "USD",
  pricingType: "fixed",
  amount: "",
  paxPrices: [
    {
      minPax: 1,
      maxPax: "",
      pricePerPax: "",
    },
  ],
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

export default function CreateDeparturePage() {
  const router = useRouter();

  const [experiences, setExperiences] = useState([]);
  const [loadingExperiences, setLoadingExperiences] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

  // LOAD BOOKABLE EXPERIENCES
  useEffect(() => {
    let mounted = true;

    async function loadExperiences() {
      try {
        setLoadingExperiences(true);

        // No published=true filter:
        // Admin can create departures for published or unpublished pages.
        const response = await fetch(
          "/api/pages?limit=600",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load experiences."
          );
        }

        const pages = Array.isArray(result.data)
          ? result.data
          : [];

        // Your API populates pageType, including its bookable field.
        const bookablePages = pages.filter(
          (page) => page.pageType?.bookable === true
        );

        if (mounted) {
          setExperiences(bookablePages);
        }
      } catch (err) {
        console.error("LOAD EXPERIENCES ERROR:", err);

        if (mounted) {
          setError(
            err.message || "Failed to load bookable experiences."
          );
        }
      } finally {
        if (mounted) {
          setLoadingExperiences(false);
        }
      }
    }

    loadExperiences();

    return () => {
      mounted = false;
    };
  }, []);

  // UPDATE FORM FIELD
  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  // UPDATE PAX PRICE
  function updatePaxPrice(index, field, value) {
    setForm((current) => ({
      ...current,
      paxPrices: current.paxPrices.map((tier, tierIndex) =>
        tierIndex === index
          ? { ...tier, [field]: value }
          : tier
      ),
    }));
  }

  // ADD PAX PRICE TIER
  function addPaxPrice() {
    setForm((current) => ({
      ...current,
      paxPrices: [
        ...current.paxPrices,
        {
          minPax: "",
          maxPax: "",
          pricePerPax: "",
        },
      ],
    }));
  }

  // REMOVE PAX PRICE TIER
  function removePaxPrice(index) {
    setForm((current) => ({
      ...current,
      paxPrices: current.paxPrices.filter(
        (_, tierIndex) => tierIndex !== index
      ),
    }));
  }

  // FORM VALIDATION
  function validateForm() {
    if (!form.experienceId) {
      return "Please select an experience.";
    }

    if (!form.startDate || !form.endDate) {
      return "Please select the departure start and end dates.";
    }

    if (new Date(form.endDate) < new Date(form.startDate)) {
      return "End date must be on or after the start date.";
    }

    if (form.bookingDeadline) {
      if (
        new Date(form.bookingDeadline) >
        new Date(form.startDate)
      ) {
        return "Booking deadline cannot be after the start date.";
      }
    }

    if (
      !Number.isInteger(Number(form.capacity)) ||
      Number(form.capacity) < 1
    ) {
      return "Capacity must be a positive whole number.";
    }

    // Validate pricing only when the override is enabled.
    if (form.usePriceOverride && form.overrideEnabled) {
      if (form.pricingType === "fixed") {
        if (
          form.amount === "" ||
          !Number.isFinite(Number(form.amount)) ||
          Number(form.amount) < 0
        ) {
          return "Enter a valid fixed price.";
        }
      }

      if (form.pricingType === "pax_based") {
        if (form.paxPrices.length === 0) {
          return "Add at least one passenger pricing tier.";
        }

        for (const tier of form.paxPrices) {
          if (
            !Number.isInteger(Number(tier.minPax)) ||
            Number(tier.minPax) < 1 ||
            tier.pricePerPax === "" ||
            !Number.isFinite(Number(tier.pricePerPax)) ||
            Number(tier.pricePerPax) < 0
          ) {
            return "Check the passenger pricing tiers.";
          }

          if (
            tier.maxPax !== "" &&
            (
              !Number.isInteger(Number(tier.maxPax)) ||
              Number(tier.maxPax) < Number(tier.minPax)
            )
          ) {
            return "Maximum passengers must be greater than or equal to minimum passengers.";
          }
        }
      }
    }

    return "";
  }

  // CREATE DEPARTURE
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      experienceId: form.experienceId,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      bookingDeadline: form.bookingDeadline
        ? new Date(form.bookingDeadline).toISOString()
        : null,
      capacity: Number(form.capacity),
      status: form.status,
      notes: form.notes.trim(),
    };

    // PRICE OVERRIDE
    if (form.usePriceOverride) {
      payload.priceOverride = {
        enabled: form.overrideEnabled,
        currency: form.currency,
        pricingType: form.pricingType,
        amount:
          form.overrideEnabled && form.pricingType === "fixed"
            ? Number(form.amount)
            : 0,
        paxPrices:
          form.overrideEnabled && form.pricingType === "pax_based"
            ? form.paxPrices.map((tier) => ({
                minPax: Number(tier.minPax),
                maxPax:
                  tier.maxPax === ""
                    ? null
                    : Number(tier.maxPax),
                pricePerPax: Number(tier.pricePerPax),
              }))
            : [],
      };
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/admin/departures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to create departure."
        );
      }

      router.push("/admin/departures");
      router.refresh();
    } catch (err) {
      console.error("CREATE DEPARTURE ERROR:", err);

      setError(
        err.message || "Failed to create departure."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">

        {/* HEADER */}
        <div className="mb-8">
          <Link
            href="/admin/departures"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          >
            ← Back to Departures
          </Link>

          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Create Departure
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Schedule a new departure for an existing bookable experience.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* EXPERIENCE */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Experience
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Only experiences configured as bookable are displayed.
            </p>

            <div className="mt-5">
              <label
                htmlFor="experienceId"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Select Experience *
              </label>

              <select
                id="experienceId"
                required
                value={form.experienceId}
                onChange={(event) =>
                  updateField("experienceId", event.target.value)
                }
                disabled={loadingExperiences}
                className={inputClass}
              >
                <option value="">
                  {loadingExperiences
                    ? "Loading experiences..."
                    : "Select an experience"}
                </option>

                {experiences.map((experience) => (
                  <option
                    key={experience._id}
                    value={experience._id}
                  >
                    {experience.title}
                    {experience.pageType?.name
                      ? ` — ${experience.pageType.name}`
                      : ""}
                  </option>
                ))}
              </select>

              {!loadingExperiences &&
                experiences.length === 0 && (
                  <p className="mt-2 text-sm text-amber-700">
                    No bookable experiences were found. Check that
                    your page types have booking enabled.
                  </p>
                )}
            </div>
          </section>

          {/* DATES */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Departure Schedule
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">

              <div>
                <label
                  htmlFor="startDate"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Start Date *
                </label>

                <input
                  id="startDate"
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(event) =>
                    updateField("startDate", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  End Date *
                </label>

                <input
                  id="endDate"
                  type="date"
                  required
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={(event) =>
                    updateField("endDate", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="bookingDeadline"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Booking Deadline
                </label>

                <input
                  id="bookingDeadline"
                  type="date"
                  max={form.startDate || undefined}
                  value={form.bookingDeadline}
                  onChange={(event) =>
                    updateField("bookingDeadline", event.target.value)
                  }
                  className={inputClass}
                />

                <p className="mt-1 text-xs text-gray-500">
                  Optional. Must be on or before the start date.
                </p>
              </div>

            </div>
          </section>

          {/* CAPACITY AND STATUS */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Capacity and Status
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">

              <div>
                <label
                  htmlFor="capacity"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Passenger Capacity *
                </label>

                <input
                  id="capacity"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.capacity}
                  onChange={(event) =>
                    updateField("capacity", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Initial Status
                </label>

                <select
                  id="status"
                  value={form.status}
                  onChange={(event) =>
                    updateField("status", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

            </div>

            <div className="mt-5">
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                Internal Notes
              </label>

              <textarea
                id="notes"
                rows={4}
                value={form.notes}
                onChange={(event) =>
                  updateField("notes", event.target.value)
                }
                placeholder="Add internal notes about this departure..."
                className={inputClass}
              />
            </div>
          </section>

          {/* PRICE OVERRIDE */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Departure Price Override
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Leave this disabled to use the experience's default price.
            </p>

            <label className="mt-5 flex items-center gap-3">
              <input
                type="checkbox"
                checked={form.usePriceOverride}
                onChange={(event) =>
                  updateField("usePriceOverride", event.target.checked)
                }
                className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
              />

              <span className="text-sm font-medium text-gray-800">
                Set a different price for this departure
              </span>
            </label>

            {form.usePriceOverride && (
              <div className="mt-6 space-y-5 border-t border-gray-100 pt-5">

                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={form.overrideEnabled}
                    onChange={(event) =>
                      updateField("overrideEnabled", event.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-emerald-700"
                  />

                  <span className="text-sm font-medium text-gray-800">
                    Enable this price override
                  </span>
                </label>

                {form.overrideEnabled && (
                  <>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

                      <div>
                        <label
                          htmlFor="currency"
                          className="mb-2 block text-sm font-medium text-gray-700"
                        >
                          Currency
                        </label>

                        <select
                          id="currency"
                          value={form.currency}
                          onChange={(event) =>
                            updateField("currency", event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="USD">USD</option>
                          <option value="NPR">NPR</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                          <option value="INR">INR</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="pricingType"
                          className="mb-2 block text-sm font-medium text-gray-700"
                        >
                          Pricing Type
                        </label>

                        <select
                          id="pricingType"
                          value={form.pricingType}
                          onChange={(event) =>
                            updateField("pricingType", event.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="fixed">Fixed Price</option>
                          <option value="pax_based">
                            Price Per Person
                          </option>
                        </select>
                      </div>

                    </div>

                    {form.pricingType === "fixed" ? (
                      <div>
                        <label
                          htmlFor="amount"
                          className="mb-2 block text-sm font-medium text-gray-700"
                        >
                          Fixed Price
                        </label>

                        <input
                          id="amount"
                          type="number"
                          min="0"
                          step="0.01"
                          value={form.amount}
                          onChange={(event) =>
                            updateField("amount", event.target.value)
                          }
                          className={inputClass}
                          placeholder="Enter price"
                        />
                      </div>
                    ) : (
                      <div>

                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-medium text-gray-900">
                              Passenger Price Tiers
                            </h3>

                            <p className="mt-1 text-xs text-gray-500">
                              Define the price per passenger for each group size.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={addPaxPrice}
                            className="rounded-lg border border-emerald-600 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            + Add Tier
                          </button>
                        </div>

                        <div className="space-y-4">
                          {form.paxPrices.map((tier, index) => (
                            <div
                              key={index}
                              className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-4"
                            >

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                  Minimum PAX
                                </label>

                                <input
                                  type="number"
                                  min="1"
                                  value={tier.minPax}
                                  onChange={(event) =>
                                    updatePaxPrice(
                                      index,
                                      "minPax",
                                      event.target.value
                                    )
                                  }
                                  className={inputClass}
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                  Maximum PAX
                                </label>

                                <input
                                  type="number"
                                  min="1"
                                  value={tier.maxPax}
                                  onChange={(event) =>
                                    updatePaxPrice(
                                      index,
                                      "maxPax",
                                      event.target.value
                                    )
                                  }
                                  placeholder="No limit"
                                  className={inputClass}
                                />
                              </div>

                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-600">
                                  Price / Person
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={tier.pricePerPax}
                                  onChange={(event) =>
                                    updatePaxPrice(
                                      index,
                                      "pricePerPax",
                                      event.target.value
                                    )
                                  }
                                  className={inputClass}
                                />
                              </div>

                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={() => removePaxPrice(index)}
                                  disabled={form.paxPrices.length === 1}
                                  className="w-full rounded-lg border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  Remove
                                </button>
                              </div>

                            </div>
                          ))}
                        </div>

                      </div>
                    )}
                  </>
                )}

              </div>
            )}
          </section>

          {/* FORM ACTIONS */}
          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">

            <Link
              href="/admin/departures"
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={submitting || loadingExperiences}
              className="rounded-lg bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Departure"}
            </button>

          </div>

        </form>
      </div>
    </main>
  );
}