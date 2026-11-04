
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    /*
    ========================================
    EXPERIENCE
    ========================================
    */

    experience: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
      required: true,
    },

    /*
    ========================================
    EXPERIENCE TYPE
    ========================================
    */

    experienceType: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    experienceTitle: {
      type: String,
      required: true,
      trim: true,
    },

    /*
    ========================================
    DEPARTURE

    Optional reference.
    Existing bookings without departures
    continue working.
    ========================================
    */

    departure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Departure",
      default: null,
    },

    departureStartDate: {
      type: Date,
      default: null,
    },

    departureEndDate: {
      type: Date,
      default: null,
    },

    /*
    ========================================
    PRICE SNAPSHOT
    ========================================
    */

    packagePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    packageCurrency: {
      type: String,
      default: "USD",
      trim: true,
      uppercase: true,
    },

    packagePriceType: {
      type: String,
      enum: ["fixed", "pax_based"],
      default: "fixed",
    },

    estimatedTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
    ========================================
    CUSTOMER
    ========================================
    */

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    ========================================
    BOOKING DETAILS
    ========================================
    */

    numberOfPeople: {
      type: Number,
      required: true,
      min: 1,
    },

    preferredDate: {
      type: String,
      default: "",
      trim: true,
    },

    message: {
      type: String,
      default: "",
      trim: true,
    },

    acceptTerms: {
      type: Boolean,
      default: false,
      required: true,
    },
    /*
    ========================================
    SEAT RESERVATION TRACKING

    True means this booking has already
    reserved seats in its departure.

    This also supports older bookings that
    were created before immediate reservation.
    ========================================
    */
    seatsReserved: {
      type: Boolean,
      default: false,
     
    },

    /*
    ========================================
    STATUS
    ========================================
    */

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "cancelled",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

      
    /*
=========================================
INDEXES
=========================================

Improve common admin booking queries.
=========================================
*/

bookingSchema.index({
  departure: 1,
  status: 1,
});

bookingSchema.index({
  experience: 1,
  createdAt: -1,
});

bookingSchema.index({
  status: 1,
  createdAt: -1,
});

/*
=========================================
BOOKING MODEL
=========================================
*/

const Booking =
  mongoose.models.Booking ||
  mongoose.model("Booking", bookingSchema);

export default Booking;
