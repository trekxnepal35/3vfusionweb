
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const INITIAL_FORM = {
  startDate: "",
  endDate: "",
  bookingDeadline: "",
  capacity: "",
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

const STATUS_OPTIONS = [
  "draft",
  "open",
  "full",
  "closed",
  "cancelled",
  "completed",
];

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
}

export default function EditDeparturePage() {
  const params = useParams();
  const router = useRouter();

  const id = params?.id;

  const [form, setForm] = useState(INITIAL_FORM);
  const [experience, setExperience] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    async function loadDeparture() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/admin/departures/${id}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load departure."
          );
        }

        if (!mounted) return;

        const departure = result.data;
        const override = departure.priceOverride;

        setExperience(departure.experienceId || null);

        setForm({
          startDate: formatDate(departure.startDate),
          endDate: formatDate(departure.endDate),
          bookingDeadline: formatDate(departure.bookingDeadline),
          capacity: departure.capacity ?? "",
          status: departure.status || "draft",
          notes: departure.notes || "",

          usePriceOverride: Boolean(override),
          overrideEnabled: override?.enabled !== false,
          currency: override?.currency || "USD",
          pricingType: override?.pricingType || "fixed",
          amount: override?.amount ?? "",

          paxPrices:
            Array.isArray(override?.paxPrices) &&
            override.paxPrices.length > 0
              ? override.paxPrices.map((tier) => ({
                  minPax: tier.minPax ?? 1,
                  maxPax: tier.maxPax ?? "",
                  pricePerPax: tier.pricePerPax ?? "",
                }))
              : [
                  {
                    minPax: 1,
                    maxPax: "",
                    pricePerPax: "",
                  },
                ],
        });
      } catch (err) {
        if (mounted) {
          setError(err.message || "Something went wrong.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadDeparture();

    return () => {
      mounted = false;
    };
  }, [id]);

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleTierChange(index, field, value) {
    setForm((prev) => ({
      ...prev,
      paxPrices: prev.paxPrices.map((tier, i) =>
        i === index
          ? {
              ...tier,
              [field]: value,
            }
          : tier
      ),
    }));
  }

  function addTier() {
    setForm((prev) => ({
      ...prev,
      paxPrices: [
        ...prev.paxPrices,
        {
          minPax: 1,
          maxPax: "",
          pricePerPax: "",
        },
      ],
    }));
  }

  function removeTier(index) {
    setForm((prev) => ({
      ...prev,
      paxPrices: prev.paxPrices.filter((_, i) => i !== index),
    }));
  }

  function validateForm() {
    if (!form.startDate || !form.endDate || !form.bookingDeadline) {
      return "Please provide all departure dates.";
    }

    if (new Date(form.endDate) < new Date(form.startDate)) {
      return "End date cannot be before start date.";
    }

    if (new Date(form.bookingDeadline) > new Date(form.startDate)) {
      return "Booking deadline cannot be after the departure start date.";
    }

    if (!form.capacity || Number(form.capacity) < 1) {
      return "Capacity must be at least 1.";
    }

    if (
      form.usePriceOverride &&
      form.overrideEnabled
    ) {
      if (form.pricingType === "fixed") {
        if (form.amount === "" || Number(form.amount) < 0) {
          return "Please enter a valid fixed price.";
        }
      }

      if (form.pricingType === "pax_based") {
        if (!form.paxPrices.length) {
          return "Please add at least one pricing tier.";
        }

        for (const tier of form.paxPrices) {
          if (
            tier.minPax === "" ||
            tier.pricePerPax === "" ||
            Number(tier.minPax) < 1 ||
            Number(tier.pricePerPax) < 0
          ) {
            return "Please complete all pricing tier fields.";
          }

          if (
            tier.maxPax !== "" &&
            Number(tier.maxPax) < Number(tier.minPax)
          ) {
            return "Maximum pax cannot be less than minimum pax.";
          }
        }
      }
    }

    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = {
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        bookingDeadline: new Date(
          form.bookingDeadline
        ).toISOString(),
        capacity: Number(form.capacity),
        status: form.status,
        notes: form.notes,
        priceOverride: form.usePriceOverride
          ? {
              enabled: form.overrideEnabled,
              currency: form.currency,
              pricingType: form.pricingType,
              ...(form.pricingType === "fixed"
                ? {
                    amount: Number(form.amount),
                  }
                : {
                    paxPrices: form.paxPrices.map((tier) => ({
                      minPax: Number(tier.minPax),
                      maxPax:
                        tier.maxPax === ""
                          ? null
                          : Number(tier.maxPax),
                      pricePerPax: Number(tier.pricePerPax),
                    })),
                  }),
            }
          : null,
      };

      const response = await fetch(
        `/api/admin/departures/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to update departure."
        );
      }

      setSuccess("Departure updated successfully.");

      setTimeout(() => {
        router.push("/admin/departures");
      }, 1000);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-gray-600">Loading departure...</p>
      </div>
    );
  }

  if (error && !experience) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>

        <Link
          href="/admin/departures"
          className="mt-4 inline-block text-emerald-700 hover:underline"
        >
          Back to departures
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit Departure
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Update departure dates, capacity, status, and pricing.
          </p>
        </div>

        <Link
          href="/admin/departures"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to departures
        </Link>
      </div>

      {experience && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Experience
          </p>

          <h2 className="mt-1 font-semibold text-gray-900">
            {experience.title || "Selected experience"}
          </h2>

          {experience.slug && (
            <p className="mt-1 text-sm text-gray-600">
              /{experience.slug}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Departure dates */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Departure Information
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Start Date *
              </label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                End Date *
              </label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Booking Deadline *
              </label>
              <input
                type="date"
                name="bookingDeadline"
                value={form.bookingDeadline}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Capacity *
              </label>
              <input
                type="number"
                name="capacity"
                min="1"
                value={form.capacity}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Price override */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Price Override
          </h2>

          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.usePriceOverride}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  usePriceOverride: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600"
            />
            Use a custom price for this departure
          </label>

          {form.usePriceOverride && (
            <div className="mt-5 space-y-4 border-t border-gray-100 pt-4">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={form.overrideEnabled}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      overrideEnabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600"
                />
                Enable this price override
              </label>

              {form.overrideEnabled && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Currency
                      </label>
                      <select
                        value={form.currency}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            currency: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      >
                        <option value="USD">USD</option>
                        <option value="NPR">NPR</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Pricing Type
                      </label>
                      <select
                        value={form.pricingType}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            pricingType: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Fixed Amount *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.amount}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            amount: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg border border-gray-300 px-3 py-2"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-800">
                          Pax Pricing Tiers
                        </h3>

                        <button
                          type="button"
                          onClick={addTier}
                          className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          + Add Tier
                        </button>
                      </div>

                      {form.paxPrices.map((tier, index) => (
                        <div
                          key={index}
                          className="grid gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-3"
                        >
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                              Minimum Pax
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={tier.minPax}
                              onChange={(e) =>
                                handleTierChange(
                                  index,
                                  "minPax",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                              Maximum Pax
                            </label>
                            <input
                              type="number"
                              min="1"
                              placeholder="No limit"
                              value={tier.maxPax}
                              onChange={(e) =>
                                handleTierChange(
                                  index,
                                  "maxPax",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                              Price Per Person
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={tier.pricePerPax}
                              onChange={(e) =>
                                handleTierChange(
                                  index,
                                  "pricePerPax",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-gray-300 px-3 py-2"
                            />
                          </div>

                          {form.paxPrices.length > 1 && (
                            <div className="sm:col-span-3">
                              <button
                                type="button"
                                onClick={() => removeTier(index)}
                                className="text-sm font-medium text-red-600 hover:text-red-700"
                              >
                                Remove tier
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {/* Notes */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Internal Notes
          </h2>

          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Add internal notes about this departure..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Link
            href="/admin/departures"
            className="rounded-lg border border-gray-300 px-5 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving Changes..." : "Update Departure"}
          </button>
        </div>
      </form>
    </div>
  );
}
