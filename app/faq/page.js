import { notFound } from "next/navigation";
import Link from "next/link";
import RichTextContent from "../components/RichTextContent";

async function getFaqsPage() {
    const baseUrl = process.env.baseUrl
    const FAQ_PAGE_ID = process.env.FAQ_PAGE_ID

    const res = await fetch(
        `${baseUrl}/api/pages/${FAQ_PAGE_ID}`,
        {
            cache: "no-store",
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch Terms and Conditions");
    }

    return res.json();
}

export default async function FaqsPage() {
    const data = await getFaqsPage();

    const page = data.data;

    if (!page) {
        notFound();
    }


    return (
        <main className="min-h-screen items-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">

                {/* Page Header */}
                <div className="mb-8 text-center">


                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
                        {page.title}
                    </h1>

                    <div className="mx-auto mt-4 h-1 w-full rounded-full bg-emerald-600" />
                </div>

                {/* Description */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">

                    <section

                        className="border-b border-slate-100 px-6 py-8 last:border-b-0 sm:px-10 sm:py-10"
                    >
                        <div className="flex items-start gap-4">

                            <div className="min-w-0 flex-1">
                                Welcome to <span className="font-bold">Fusion Expeditions Pvt Ltd.</span>
                                {page.description}
                                <div className="mt-5 text-base leading-8 text-slate-600">

                                </div>
                                <br />

                            </div>


                        </div>
                    </section>


                </div>

                {/* Faqs */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                    <div className="space-y-4">

                        {page.faqs.map(
                            (faq, index) => (

                                <details
                                    key={index}
                                    className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                                >

                                    <summary className="whitespace-pre-line flex cursor-pointer list-none items-center justify-between gap-6 font-semibold text-gray-900">

                                        <span>
                                            {faq.question}
                                        </span>

                                        <span className="text-2xl text-emerald-600 transition-transform duration-300 group-open:rotate-45">
                                            +
                                        </span>

                                    </summary>

                                    {faq.answer && (

                                        <div className="mt-4 border-t border-gray-100 pt-4">

                                            <p className="whitespace-pre-line leading-7 text-gray-600">
                                              
                                                <RichTextContent content={faq.answer}/>
                                                
                                            </p>

                                        </div>

                                    )}

                                </details>

                            )
                        )}

                    </div>



                </div>



            </div>
        </main>
    );
}
