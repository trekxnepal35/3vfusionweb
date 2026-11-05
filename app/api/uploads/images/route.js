import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { verifyAdminToken } from "@/lib/auth";

import cloudinary from "@/lib/cloudinary";

import s3 from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";


export const runtime = "nodejs";


/*
==================================================
ALLOWED IMAGE TYPES
==================================================
*/

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];


/*
==================================================
MAX IMAGE SIZE
5 MB per image
==================================================
*/

const MAX_FILE_SIZE = 5 * 1024 * 1024;


/*
==================================================
CLOUDINARY UPLOAD
==================================================
*/

function uploadToCloudinary(buffer, filename, mimeType) {

  return new Promise((resolve, reject) => {

    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder: "trek-website/pages",
          resource_type: "image",
          public_id: filename
            .replace(/\.[^/.]+$/, "")
            .replace(/[^a-zA-Z0-9-_]/g, "-"),
        },

        (error, result) => {

          if (error) {

            reject(error);

            return;

          }


          resolve(result);

        }
      );


    uploadStream.end(buffer);

  });

}


/*
==================================================
POST IMAGE UPLOAD
==================================================
*/

export async function POST(request) {

  try {

    /*
    ==============================================
    1. GET ADMIN TOKEN
    ==============================================
    */

    const cookieStore = await cookies();

    const token =
      cookieStore.get("admin_token")?.value;


    /*
    ==============================================
    2. VERIFY ADMIN
    ==============================================
    */

    const admin =
      verifyAdminToken(token);


    if (!admin) {

      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        }
      );

    }

    /*
    ==============================================
    3. READ FORM DATA
    ==============================================
    */

    const formData =
      await request.formData();


    /*
    ==============================================
    4. GET STORAGE
    ==============================================
    */

    const storage =
      formData.get("storage");


    /*
    ==============================================
    5. VALIDATE STORAGE
    ==============================================
    */

    if (
      storage !== "cloudinary" &&
      storage !== "s3"
    ) {

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid image storage. Select Cloudinary or S3.",
        },
        {
          status: 400,
        }
      );

    }


    /*
    ==============================================
    6. GET FILES
    ==============================================
    */

    const files =
      formData.getAll("files");


    if (!files || files.length === 0) {

      return NextResponse.json(
        {
          success: false,
          message: "No images selected.",
        },
        {
          status: 400,
        }
      );

    }


    /*
    ==============================================
    7. MAX NUMBER OF FILES
    ==============================================
    */

    if (files.length > 20) {

      return NextResponse.json(
        {
          success: false,
          message:
            "You can upload a maximum of 20 images at once.",
        },
        {
          status: 400,
        }
      );

    }


    /*
    ==============================================
    8. UPLOAD EACH IMAGE
    ==============================================
    */

    const uploadedImages = [];


    for (const file of files) {

      /*
      ----------------------------------------------
      Make sure this is actually a File
      ----------------------------------------------
      */

      if (
        !file ||
        typeof file.arrayBuffer !== "function"
      ) {

        continue;

      }


      /*
      ----------------------------------------------
      Validate image type
      ----------------------------------------------
      */

      if (
        !ALLOWED_TYPES.includes(file.type)
      ) {

        return NextResponse.json(
          {
            success: false,
            message:
              `${file.name} is not a supported image type.`,
          },
          {
            status: 400,
          }
        );

      }


      /*
      ----------------------------------------------
      Validate file size
      ----------------------------------------------
      */

      if (file.size > MAX_FILE_SIZE) {

        return NextResponse.json(
          {
            success: false,
            message:
              `${file.name} is larger than 10 MB.`,
          },
          {
            status: 400,
          }
        );

      }


      /*
      ----------------------------------------------
      Convert File -> Buffer
      ----------------------------------------------
      */

      const arrayBuffer =
        await file.arrayBuffer();

      const buffer =
        Buffer.from(arrayBuffer);


      /*
      ==============================================
      CLOUDINARY
      ==============================================
      */

      if (storage === "cloudinary") {

        const result =
          await uploadToCloudinary(
            buffer,
            file.name,
            file.type
          );


        uploadedImages.push({
          url: result.secure_url,
          alt: "",
          storage: "cloudinary",
          publicId: result.public_id,
          key: "",
        });

      }


      /*
      ==============================================
      AWS S3
      ==============================================
      */

      if (storage === "s3") {

        const extension =
          file.name.includes(".")
            ? file.name.substring(
                file.name.lastIndexOf(".")
              )
            : "";


        const safeName =
          file.name
            .replace(/\.[^/.]+$/, "")
            .replace(/[^a-zA-Z0-9-_]/g, "-");


        const key =
          `pages/${Date.now()}-${safeName}${extension}`;



          await s3().send(
            new PutObjectCommand({
              Bucket:
                process.env.AWS_S3_BUCKET_NAME,

              Key: key,

              Body: buffer,

              ContentType: file.type,
            })
          );


        /*
        ------------------------------------------
        S3 URL
        ------------------------------------------
        */

        const url =
          `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;


        uploadedImages.push({
          url,
          alt: "",
          storage: "s3",
          publicId: "",
          key,
        });

      }

    }


    /*
    ==============================================
    9. RETURN UPLOADED IMAGES
    ==============================================
    */

    return NextResponse.json(
      {
        success: true,
        data: uploadedImages,
      },
      {
        status: 200,
      }
    );


  } catch (error) {

    console.error(
      "Image upload error:",
      error
    );


    return NextResponse.json(
      {
        success: false,
        message:
          error.message ||
          "Image upload failed.",
      },
      {
        status: 500,
      }
    );

  }

}