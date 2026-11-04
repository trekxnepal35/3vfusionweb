
import { NextResponse } from "next/server";

import connectDB from "@/lib/mongodb";
import Departure from "@/models/Departure";
import Page from "@/models/Page";

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;

    const { searchParams } = new URL(request.url);
    const experienceId = searchParams.get("experienceId");

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid departure ID.",
        },
        { status: 400 }
      );
    }

    if (
      !experienceId ||
      !/^[0-9a-fA-F]{24}$/.test(experienceId)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid experience ID.",
        },
        { status: 400 }
      );
    }

    const experience = await Page.findOne({
      _id: experienceId,
      published: true,
    })
      .populate("pageType", "slug name bookable")
      .select("_id title pageType")
      .lean();

    if (
      !experience ||
      experience.pageType?.bookable !== true
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This experience is not available for booking.",
        },
        { status: 404 }
      );
    }

    const departure = await Departure.findOne({
      _id: id,
      experienceId,
    })
      .select(
        "_id experienceId startDate endDate bookingDeadline capacity reservedPax status priceOverride"
      )
      .lean();

    if (!departure) {
      return NextResponse.json(
        {
          success: false,
          message: "Departure not found for this experience.",
        },
        { status: 404 }
      );
    }

    const now = new Date();

    const availablePax = Math.max(
      0,
      Number(departure.capacity || 0) -
        Number(departure.reservedPax || 0)
    );

    const deadlinePassed =
      departure.bookingDeadline &&
      new Date(departure.bookingDeadline) < now;

    const unavailable =
      departure.status !== "open" ||
      new Date(departure.startDate) < now ||
      deadlinePassed ||
      availablePax < 1;

    if (unavailable) {
      return NextResponse.json(
        {
          success: false,
          message: "This departure is no longer available.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        _id: String(departure._id),
        startDate: departure.startDate,
        endDate: departure.endDate,
        bookingDeadline: departure.bookingDeadline,
        capacity: departure.capacity,
        reservedPax: departure.reservedPax,
        availablePax,
        priceOverride: departure.priceOverride || null,
      },
    });
  } catch (error) {
    console.error("PUBLIC DEPARTURE GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load departure information.",
      },
      { status: 500 }
    );
  }
}
