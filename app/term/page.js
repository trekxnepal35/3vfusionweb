// import { base64url } from "jose";
import Link from "next/link";
import RichTextContent from "../components/RichTextContent";

async function getTermsPage() {
    const baseUrl = process.env.baseUrl
    const TERM_PAGE_ID = process.env.TERM_PAGE_ID

    const res = await fetch(
        `${baseUrl}/api/pages/${TERM_PAGE_ID}`,
        {
            cache: "no-store",
        }
    );

    if (!res.ok) {
        throw new Error("Failed to fetch Terms and Conditions");
    }

    return res.json();
}

export default async function TermsPage() {
    const data = await getTermsPage();

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

                            <div className="whitespace-pre-line text-justify min-w-0 flex-1">
                            Welcome to <span className="font-bold">Fusion Expeditions Pvt Ltd.</span> 
                                {page.description}
                                <div className="mt-5 text-base leading-8 text-slate-600">

                                </div>
                             <br/>

                            </div>


                        </div>
                    </section>


                </div>

                {/* Terms */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">

                    {page.faqs.map((item, index) => (
                        <section
                            key={item.title || index}
                            className="border-b border-slate-100 px-6 py-8 last:border-b-0 sm:px-10 sm:py-10"
                        >
                            <div className="flex items-start gap-4">

                                <div className="min-w-0 flex-1">

                                    <h5 className="text-justify text-16 font-bold text-slate-900 sm:text-22">
                                        {item.question}
                                    </h5>

                                    <div className="whitespace-pre-line text-justify mt-5 text-base leading-8 text-slate-600">
                                       
                                        <RichTextContent content={item.answer}/>
                                    </div>
                                    <br />

                                </div>


                            </div>
                        </section>
                    ))}

                </div>



            </div>
        </main>
    );
}
