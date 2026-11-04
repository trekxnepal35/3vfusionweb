
// models/Departure.js

import mongoose from "mongoose";

/*
==================================================
DEPARTURE PRICE OVERRIDE
==================================================
*/

const departurePriceSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },

    currency: {
      type: String,
      default: "USD",
      uppercase: true,
      trim: true,
    },

    pricingType: {
      type: String,
      enum: ["fixed", "pax_based"],
      default: "fixed",
    },

    amount: {
      type: Number,
      min: 0,
      default: 0,
    },

    paxPrices: {
      type: [
        {
          minPax: {
            type: Number,
            required: true,
            min: 1,
            validate: {
              validator: Number.isInteger,
              message: "Minimum PAX must be a whole number.",
            },
          },

          maxPax: {
            type: Number,
            default: null,
            min: 1,
            validate: {
              validator: (value) =>
                value === null || Number.isInteger(value),
              message: "Maximum PAX must be a whole number.",
            },
          },

          pricePerPax: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],
      default: [],
    },
  },
  {
    _id: false,
  }
);

/*
==================================================
DEPARTURE SCHEMA
==================================================
*/

const departureSchema = new mongoose.Schema(
  {
    experienceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    bookingDeadline: {
      type: Date,
      default: null,
    },

    /*
    CAPACITY / RESERVED PAX
    */

    capacity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "Capacity must be a whole number.",
      },
    },

    reservedPax: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Reserved PAX must be a whole number.",
      },
    },

    /*
    STATUS
    */

    status: {
      type: String,
      enum: [
        "draft",
        "open",
        "full",
        "closed",
        "cancelled",
        "completed",
      ],
      default: "draft",
    },

    /*
    DEPARTURE-SPECIFIC PRICING
    */

    priceOverride: {
      type: departurePriceSchema,
      default: () => ({
        enabled: false,
        currency: "USD",
        pricingType: "fixed",
        amount: 0,
        paxPrices: [],
      }),
    },

    /*
    ADMIN NOTES
    */

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 5000,
    },

    /*
    AUDIT FIELDS
    */

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

/*
==================================================
AVAILABLE PAX
==================================================
*/

departureSchema.virtual("availablePax").get(function () {
  return Math.max(
    0,
    Number(this.capacity || 0) -
      Number(this.reservedPax || 0)
  );
});

/*
==================================================
VALIDATION
==================================================
*/

departureSchema.pre("validate", function () {
  // End date must not be before start date.
  if (
    this.startDate &&
    this.endDate &&
    this.endDate < this.startDate
  ) {
    this.invalidate(
      "endDate",
      "End date must be on or after the start date."
    );
  }

  // Booking deadline cannot be after departure start.
  if (
    this.bookingDeadline &&
    this.startDate &&
    this.bookingDeadline > this.startDate
  ) {
    this.invalidate(
      "bookingDeadline",
      "Booking deadline cannot be after the departure start date."
    );
  }

  // Capacity cannot be below already reserved passengers.
  if (
    this.capacity !== undefined &&
    this.reservedPax > this.capacity
  ) {
    this.invalidate(
      "capacity",
      "Capacity cannot be lower than the already reserved PAX."
    );
  }

  // Validate departure-specific PAX pricing.
  if (
    this.priceOverride?.enabled &&
    this.priceOverride.pricingType === "pax_based"
  ) {
    const tiers = this.priceOverride.paxPrices || [];

    if (tiers.length === 0) {
      this.invalidate(
        "priceOverride.paxPrices",
        "Add at least one PAX pricing tier when departure-specific PAX pricing is enabled."
      );

      return;
    }

    const sortedTiers = [...tiers].sort(
      (a, b) => a.minPax - b.minPax
    );

    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];

      // Maximum PAX must not be below minimum PAX.
      if (
        tier.maxPax !== null &&
        tier.maxPax !== undefined &&
        tier.maxPax < tier.minPax
      ) {
        this.invalidate(
          "priceOverride.paxPrices",
          "Each maximum PAX must be greater than or equal to its minimum PAX."
        );

        break;
      }

      // Tiers must not overlap.
      // An unlimited tier must always be the last tier.
      if (i < sortedTiers.length - 1) {
        const nextTier = sortedTiers[i + 1];

        if (
          tier.maxPax === null ||
          tier.maxPax === undefined ||
          tier.maxPax >= nextTier.minPax
        ) {
          this.invalidate(
            "priceOverride.paxPrices",
            "PAX pricing tiers must not overlap, and an unlimited tier must be last."
          );

          break;
        }
      }
    }
  }
});

/*
==================================================
INDEXES
==================================================
*/

// Experience departure searches.
departureSchema.index({
  experienceId: 1,
  startDate: 1,
});

// Admin status filtering and departure date sorting.
departureSchema.index({
  status: 1,
  startDate: 1,
});

/*
==================================================
CREATE / REUSE MODEL
==================================================
*/

const Departure =
  mongoose.models.Departure ||
  mongoose.model("Departure", departureSchema);

export default Departure;
