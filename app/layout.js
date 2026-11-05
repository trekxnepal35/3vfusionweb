import "./globals.css";

import Navbar from "./components/Navbar";
import { getMenus } from "@/lib/getMenus";
import Link from "next/link";
import AssistantChat from "./components/AssistantChat";
import {
  FaYoutube,
  FaWhatsapp,
  FaViber,
  FaTripadvisor,
  FaFacebookF,
  FaInstagram,
} from "react-icons/fa";


/*
=========================================
WEBSITE METADATA
=========================================
*/

export const metadata = {

  title: {
    default:
      "FUSION EXPEDITIONS | Himalayan Treks & Tours",
    template:
      "%s | FUSION EXPEDITIONS",
  },


  description:
    "Discover unforgettable trekking adventures, cultural tours and Himalayan experiences across Nepal.",


  keywords: [
    "Nepal trekking",
    "Nepal tours",
    "Everest Base Camp Trek",
    "Annapurna Trek",
    "Langtang Trek",
    "Manaslu Trek",
    "Kangchenjunga Trek",
    "Himalayan trekking",
    "Nepal travel",
    "Nepal adventure",
  ],


  authors: [
    {
      name: "FUSION EXPEDITIONS",
    },
  ],


  creator:
    "FUSION EXPEDITIONS",


  publisher:
    "FUSION EXPEDITIONS",


  metadataBase:
    new URL(
      process.env.NEXT_PUBLIC_SITE_URL ||
      "http://localhost:3000"
    ),


  alternates: {
    canonical: "/",
  },


  openGraph: {

    type: "website",

    locale: "en_US",

    siteName:
      " Fusion Expeditions ",

    title:
      " Fusion Expeditions | Himalayan Treks & Tours",

    description:
      "Explore Nepal's Himalayas through unforgettable treks, tours and authentic travel experiences.",

    url: "/",
  },


  twitter: {

    card:
      "summary_large_image",

    title:
      "Fusion Expeditions | Himalayan Treks & Tours",

    description:
      "Discover unforgettable adventures across Nepal's Himalayas.",
  },


  robots: {

    index: true,

    follow: true,

    googleBot: {

      index: true,

      follow: true,

      "max-image-preview":
        "large",

      "max-snippet":
        -1,

      "max-video-preview":
        -1,
    },
  },
};


/*
=========================================
ROOT LAYOUT
=========================================
*/
export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}) {
  const menus = await getMenus();

  return (

    <html lang="en">

      <body className="min-h-screen bg-white text-slate-900 antialiased">




        {/* =================================
            NAVBAR
        ================================= */}

        <Navbar menus={menus} />
        <div className="h-20" />

        {/* =================================
            MAIN CONTENT
        ================================= */}

        <main className="min-h-screen">


          {children}

        </main>


        {/* =================================
            FOOTER
        ================================= */}

        <footer className="bg-slate-950 text-white">

          <div className="mx-auto max-w-full px-6 py-16 lg:px-8">

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">


              {/* BRAND */}

              <div className="lg:col-span-2">
                <Link href="/" className="transition hover:text-white">
                  <div className="flex items-center gap-3">

                    <div>

                      <div className="text-xl font-black">

                        Fusion Expeditions

                      </div>

                      <div className="text-xs text-slate-400">
                        Himalayan Adventures
                      </div>

                    </div>

                  </div>
                </Link>


                <p className="mt-6 max-w-md leading-7 text-slate-400">

                  Discover the mountains, culture and
                  extraordinary landscapes of Nepal through
                  unforgettable trekking and travel experiences.

                </p>




              </div>


              {/* EXPLORE */}

              <div>

                <h3 className="font-black">
                  Explore
                </h3>


                <ul className="mt-5 space-y-3 text-sm text-slate-400">

                  <li>
                    <Link href="/treks" className="transition hover:text-white">

                      Treks
                    </Link>

                  </li>


                  <li>
                    <Link href="/tours" className="transition hover:text-white">
                      Tours
                    </Link>
                  </li>


                  <li>
                    <Link href="/contact" className="transition hover:text-white">
                      Contact
                    </Link>
                  </li>

                </ul>

              </div>
              <div>

                <h3 className="font-black">
                  Useful Links
                </h3>


                <ul className="mt-5 space-y-3 text-sm text-slate-400">

                  <li>
                    <Link href="/term" className="transition hover:text-white">
                      Terms and Conditions
                    </Link>
                  </li>


                  <li>
                    <Link href="/faq" className="transition hover:text-white">
                      FAQs
                    </Link>
                  </li>


                  <li>
                    <Link href="/blog" className="transition hover:text-white">
                      Blog
                    </Link>
                  </li>

                </ul>

              </div>


              {/* CONTACT */}

              <div>

                <h3 className="font-black">

                  <Link href="/contact" className="transition hover:text-white">
                    Contact
                  </Link>
                </h3>


                <ul className="mt-5 space-y-4 text-sm text-slate-400">

                  <li>
                    📍Thamel, Kathmandu, Nepal
                  </li>


                  <li>
                    ✉️ fusionexpeditions@gmail.com
                  </li>


                  <li>
                    📞 +977 9851432432
                  </li>

                </ul>

                <div className="flex items-center gap-4">

                  {/* Facebook */}
                  <Link
                    href="https://www.facebook.com/FusionExpeditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold uppercase transition hover:bg-emerald-500"
                    // className="text-blue-600 text-2xl hover:scale-110 transition-transform"
                  >
                    <span>
                      <FaFacebookF />
                    </span>
                  </Link>

                  {/* Instagram */}
                  <Link
                    href="https://www.instagram.com/fusionexpeditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-600 text-2xl hover:scale-110 transition-transform"
                  >
                    <span>
                      <FaInstagram />
                    </span>
                  </Link>

                  {/* YouTube */}
                  <Link
                    href="https://www.youtube.com/@FusionExpeditions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 text-2xl hover:scale-110 transition-transform"
                  >
                    <span>
                      <FaYoutube />
                    </span>
                  </Link>

                  {/* WhatsApp */}
                  <Link
                    href="https://api.whatsapp.com/send?phone=9851432432"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-500 text-2xl hover:scale-110 transition-transform"
                  >
                    <span>
                      <FaWhatsapp />
                    </span>
                  </Link>

                  {/* Viber */}
                  <Link
                    href="viberp://chat/?number=9851432432"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 text-2xl hover:scale-110 transition-transform"
                  >
                    <span>
                      <FaViber />
                    </span>
                  </Link>

                  {/* TripAdvisor */}
                  <Link
                    href="https://www.tripadvisor.com/Attraction_Review-g293890-d26247521-Reviews-Fusion_Expeditions-Kathmandu_Kathmandu_Valley_Bagmati_Zone_Central_Region.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-500 text-2xl hover:scale-110 transition-transform"
                  >
                    <span>
                      <FaTripadvisor />
                    </span>
                  </Link>

                </div>

              </div>

            </div>


            {/* FOOTER BOTTOM */}

            <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">

              <p className="transition hover:text-white" >
                © {new Date().getFullYear()} Fusion Expeditions Pvt Ltd. Nepal,
                All rights reserved.
              </p>


              <div className="flex gap-6">

                <Link href="/term" className="transition hover:text-white">

                  Privacy Policy
                </Link>


                <Link href="/term" className="transition hover:text-white">

                  Terms
                </Link>

              </div>

            </div>

          </div>

        </footer>

          {/* Floating AI Assistant */}
          <AssistantChat />



        {/* =================================
            ORGANIZATION JSON-LD
        ================================= */}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({

              "@context":
                "https://schema.org",

              "@type":
                "TravelAgency",

              name:
                "Fusion Expeditions",

              description:
                "Fusion Expeditions trekking and tour company offering Himalayan adventures and travel experiences.",

              url:
                process.env.NEXT_PUBLIC_SITE_URL ||
                "http://localhost:3000",

              address: {

                "@type":
                  "PostalAddress",

                addressLocality:
                  "Kathmandu",

                addressCountry:
                  "NP",
              },

            }),
          }}
        />

      </body>

    </html>
  );
}


/*
=========================================
SOCIAL LINK
=========================================
*/

function SocialLink({
  label,
  href,
  target,
}) {

  return (

    <a
      href={href}
      aria-label={label}
      target={target}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold uppercase transition hover:bg-emerald-500"
    >

      {label}


    </a>

  );
}
