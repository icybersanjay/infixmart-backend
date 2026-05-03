// Server component — renders a static legal/policy page from a slug. No
// hooks, no client state. Each route under app/(store)/<policy-slug>/ pulls
// this in and passes its slug.
import Link from "next/link";
import { LEGAL_CONTENT } from "./legal-content.js";

export function getLegalContent(slug) {
  return LEGAL_CONTENT[slug] || null;
}

export function getLegalDescription(slug) {
  const content = getLegalContent(slug);
  if (!content) return "";
  return content.sections?.[0]?.body?.slice(0, 155) || `${content.title} for InfixMart.`;
}

export default function LegalPage({ slug, path }) {
  const content = getLegalContent(slug);

  if (!content) {
    return (
      <section className="py-20 text-center">
        <h1 className="text-[22px] font-[700] text-gray-800 mb-3">Page Not Found</h1>
        <Link href="/" className="text-[#1565C0] hover:underline text-[14px]">← Back to Home</Link>
      </section>
    );
  }

  const description = getLegalDescription(slug);

  // JSON-LD blocks ship in the SSR'd HTML, so search engines see them without
  // executing client JS.
  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: content.title,
    description,
    url: path,
  };
  const breadcrumbsLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: content.title, item: path },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsLd) }}
      />
      <section className="w-full py-10">
        <div className="container max-w-[860px] mx-auto">
          {/* Breadcrumb */}
          <nav className="text-[12px] text-gray-400 mb-6 flex items-center gap-1.5">
            <Link href="/" className="hover:text-[#1565C0] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-gray-600">{content.title}</span>
          </nav>

          {/* Header */}
          <div className="bg-[#EEF4FF] border border-[#C5D9F5] rounded-xl px-6 py-5 mb-8">
            <h1 className="text-[24px] font-[800] text-[#1565C0] mb-1">{content.title}</h1>
            <p className="text-[13px] text-gray-500">Last updated: {content.lastUpdated}</p>
          </div>

          {/* Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-7">
            {content.sections.map((section, i) => (
              <div key={i}>
                <h2 className="text-[15px] font-[700] text-gray-800 mb-2">{section.heading}</h2>
                <p className="text-[14px] text-gray-600 leading-relaxed whitespace-pre-line">
                  {section.body}
                </p>
              </div>
            ))}
          </div>

          {/* Contact strip */}
          <div className="mt-8 bg-[#F5F8FF] border border-[#C5D9F5] rounded-xl p-5 text-center">
            <p className="text-[14px] text-gray-600">
              Have questions about this policy?{" "}
              <a href="mailto:support@infixmart.com" className="text-[#1565C0] font-[600] hover:underline">
                support@infixmart.com
              </a>
              {" "}or WhatsApp{" "}
              <a href="https://wa.me/918849047148" className="text-[#1565C0] font-[600] hover:underline">
                +91 88490 47148
              </a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
