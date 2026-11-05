import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

/*
====================================================
GET SCRIPT DIRECTORY
====================================================
*/

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);


/*
====================================================
LOAD .env.local
====================================================

This always loads .env.local from the
PROJECT ROOT, regardless of where the
command is executed from.
*/

dotenv.config({
  path: path.resolve(
    __dirname,
    "../.env.local"
  ),
});


/*
====================================================
CHECK MONGODB_URI
====================================================
*/

if (!process.env.MONGODB_URI) {

  console.error("");

  console.error(
    "========================================"
  );

  console.error(
    "MONGODB_URI IS NOT DEFINED"
  );

  console.error(
    "========================================"
  );

  console.error("");

  console.error(
    "Make sure .env.local exists in the project root."
  );

  console.error("");

  console.error(
    "Expected structure:"
  );

  console.error("");

  console.error(
    "your-project/"
  );

  console.error(
    "├── app/"
  );

  console.error(
    "├── components/"
  );

  console.error(
    "├── lib/"
  );

  console.error(
    "├── models/"
  );

  console.error(
    "├── scripts/"
  );

  console.error(
    "│   └── create-admin.js"
  );

  console.error(
    "├── .env.local"
  );

  console.error(
    "└── package.json"
  );

  console.error("");

  process.exit(1);
}


/*
====================================================
READ ADMIN ENVIRONMENT VARIABLES
====================================================
*/

const adminName =
  process.env.ADMIN_NAME?.trim();

const adminEmail =
  process.env.ADMIN_EMAIL
    ?.trim()
    .toLowerCase();

const adminPassword =
  process.env.ADMIN_PASSWORD;


/*
====================================================
VALIDATE ADMIN NAME
====================================================
*/

if (!adminName) {

  throw new Error(
    "ADMIN_NAME is not defined in .env.local"
  );

}


/*
====================================================
VALIDATE ADMIN EMAIL
====================================================
*/

if (!adminEmail) {

  throw new Error(
    "ADMIN_EMAIL is not defined in .env.local"
  );

}


/*
====================================================
VALIDATE ADMIN PASSWORD
====================================================
*/

if (!adminPassword) {

  throw new Error(
    "ADMIN_PASSWORD is not defined in .env.local"
  );

}


if (adminPassword.length < 8) {

  throw new Error(
    "ADMIN_PASSWORD must contain at least 8 characters."
  );

}


/*
====================================================
DYNAMIC IMPORTS
====================================================

IMPORTANT:

These must happen AFTER dotenv.config().

Otherwise lib/mongodb.js may read
process.env.MONGODB_URI before dotenv
has loaded .env.local.
*/

const {
  default: connectDB,
} = await import(
  "../lib/mongodb.js"
);


const {
  default: Admin,
} = await import(
  "../models/Admin.js"
);


const {
  default: bcrypt,
} = await import(
  "bcryptjs"
);


/*
====================================================
CREATE ADMIN FUNCTION
====================================================
*/

async function createAdmin() {

  try {

    console.log("");

    console.log(
      "========================================"
    );

    console.log(
      "CREATE ADMIN USER"
    );

    console.log(
      "========================================"
    );

    console.log("");


    /*
    ========================================
    CONNECT DATABASE
    ========================================
    */

    console.log(
      "Connecting to MongoDB..."
    );

    await connectDB();

    console.log(
      "MongoDB connected successfully."
    );

    console.log("");


    /*
    ========================================
    CHECK EXISTING ADMIN
    ========================================
    */

    console.log(
      `Checking admin email: ${adminEmail}`
    );

    const existingAdmin =
      await Admin.findOne({
        email: adminEmail,
      });


    if (existingAdmin) {

      console.log("");

      console.log(
        "========================================"
      );

      console.log(
        "ADMIN ALREADY EXISTS"
      );

      console.log(
        "========================================"
      );

      console.log(
        `Name: ${existingAdmin.name}`
      );

      console.log(
        `Email: ${existingAdmin.email}`
      );

      console.log(
        `Role: ${existingAdmin.role}`
      );

      console.log(
        "========================================"
      );

      console.log("");

      await mongoose.connection.close();

      process.exit(0);

    }


    /*
    ========================================
    HASH PASSWORD
    ========================================
    */

    console.log(
      "Hashing password..."
    );

    const hashedPassword =
      await bcrypt.hash(
        adminPassword,
        12
      );


    /*
    ========================================
    CREATE ADMIN
    ========================================
    */

    console.log(
      "Creating admin user..."
    );

    const admin =
      await Admin.create({

        name:
          adminName,

        email:
          adminEmail,

        password:
          hashedPassword,

        role:
          "admin",

      });


    /*
    ========================================
    SUCCESS
    ========================================
    */

    console.log("");

    console.log(
      "========================================"
    );

    console.log(
      "ADMIN CREATED SUCCESSFULLY"
    );

    console.log(
      "========================================"
    );

    console.log(
      `Name: ${admin.name}`
    );

    console.log(
      `Email: ${admin.email}`
    );

    console.log(
      `Role: ${admin.role}`
    );

    console.log(
      "========================================"
    );

    console.log("");

    console.log(
      "You can now login at:"
    );

    console.log(
      "/admin/login"
    );

    console.log("");


    /*
    ========================================
    CLOSE DATABASE
    ========================================
    */

    await mongoose.connection.close();

    console.log(
      "MongoDB connection closed."
    );

    console.log("");

    process.exit(0);

  } catch (error) {

    console.error("");

    console.error(
      "========================================"
    );

    console.error(
      "FAILED TO CREATE ADMIN"
    );

    console.error(
      "========================================"
    );

    console.error(
      error.message
    );

    console.error(
      "========================================"
    );

    console.error("");


    /*
    ========================================
    TRY TO CLOSE DATABASE
    ========================================
    */

    try {

      await mongoose.connection.close();

    } catch (closeError) {

      // Ignore database close errors

    }


    process.exit(1);

  }

}


/*
====================================================
RUN
====================================================
*/

createAdmin();