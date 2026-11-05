import { NextResponse } from "next/server";

import bcrypt from "bcryptjs";

import jwt from "jsonwebtoken";

import connectDB from "@/lib/mongodb";

import Admin from "@/models/Admin";


export async function POST(request) {

  try {

    // =====================================================
    // CONNECT DATABASE
    // =====================================================

    await connectDB();


    // =====================================================
    // READ REQUEST
    // =====================================================

    const body =
      await request.json();


    const {
      email,
      password,
    } = body;


    // =====================================================
    // VALIDATION
    // =====================================================

    if (
      !email?.trim() ||
      !password
    ) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Email and password are required.",
        },
        {
          status: 400,
        }
      );

    }


    const cleanEmail =
      email
        .trim()
        .toLowerCase();


    // =====================================================
    // FIND ADMIN
    // =====================================================

    const admin =
      await Admin.findOne({
        email: cleanEmail,
      });


    if (!admin) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid email or password.",
        },
        {
          status: 401,
        }
      );

    }


    // =====================================================
    // CHECK PASSWORD
    // =====================================================

    const passwordMatch =
      await bcrypt.compare(
        password,
        admin.password
      );


    if (!passwordMatch) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid email or password.",
        },
        {
          status: 401,
        }
      );

    }


    // =====================================================
    // CHECK JWT SECRET
    // =====================================================

    if (!process.env.JWT_SECRET) {

      console.error(
        "JWT_SECRET is not configured."
      );


      return NextResponse.json(
        {
          success: false,
          message:
            "Server authentication configuration error.",
        },
        {
          status: 500,
        }
      );

    }


    // =====================================================
    // CREATE JWT
    // =====================================================

    const token =
      jwt.sign(
        {
          id:
            String(admin._id),

          email:
            admin.email,

          role:
            admin.role,
        },

        process.env.JWT_SECRET,

        {
          expiresIn:
            "1d",
        }
      );


    // =====================================================
    // CREATE RESPONSE
    // =====================================================

    const response =
      NextResponse.json({

        success: true,

        message:
          "Login successful.",

        data: {

          id:
            String(admin._id),

          name:
            admin.name,

          email:
            admin.email,

          role:
            admin.role,

        },

      });


    // =====================================================
    // SET ADMIN COOKIE
    // =====================================================

    const forwardedProto = request.headers.get("x-forwarded-proto");

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: forwardedProto === "https",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });


    // =====================================================
    // DEBUG SERVER LOG
    // =====================================================

    console.log(
      "ADMIN LOGIN SUCCESS:",
      admin.email
    );

    console.log(
      "ADMIN TOKEN COOKIE SET: true"
    );


    // =====================================================
    // RETURN RESPONSE
    // =====================================================

    return response;


  } catch (error) {

    console.error(
      "Admin login error:",
      error
    );


    return NextResponse.json(
      {
        success: false,
        message:
          "Login failed.",
      },
      {
        status: 500,
      }
    );

  }

}