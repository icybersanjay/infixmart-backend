// Server component wrapper — enables generateMetadata + JSON-LD for SEO
import ProductDetailsPage from "../../../_legacy/Pages/ProductDetails/index.jsx";
import { getProductBySlugValue, getSingleProduct } from "../../../../lib/server/services/products.js";

export const dynamic = "force-dynamic";

const siteUrl =
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://infixmart.com";

function stripHtml(html = "") {
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

async function fetchProduct(productParam) {
  try {
    const isId = /^\d+$/.test(productParam);
    const result = isId
      ? await getSingleProduct(productParam)
      : await getProductBySlugValue(productParam);
    return result?.product ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { productParam } = await params;
  const product = await fetchProduct(productParam);

  if (!product) {
    return {
      title: "Product Not Found",
      robots: { index: false, follow: false },
    };
  }

  const description =
    product.description
      ? stripHtml(product.description)
      : `Buy ${product.name} at wholesale price on InfixMart. Best bulk deals in India.`;

  const firstImage = product.images?.[0];
  const ogImage = firstImage
    ? firstImage.startsWith("http")
      ? firstImage
      : `${siteUrl}${firstImage}`
    : null;

  const canonicalUrl = `${siteUrl}/product/${product.slug || product.id}`;

  return {
    title: product.name,
    description,
    keywords: [
      product.name,
      product.brand,
      product.catName,
      "wholesale",
      "bulk buy India",
    ].filter(Boolean),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: product.name,
      description,
      url: canonicalUrl,
      type: "website",
      ...(ogImage && { images: [{ url: ogImage, alt: product.name, width: 800, height: 800 }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  };
}

export default async function Page({ params }) {
  const { productParam } = await params;
  const product = await fetchProduct(productParam);

  let jsonLd = null;
  if (product) {
    const firstImage = product.images?.[0];
    const imageUrl = firstImage
      ? firstImage.startsWith("http")
        ? firstImage
        : `${siteUrl}${firstImage}`
      : null;

    jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description ? stripHtml(product.description) : undefined,
      sku: product.sku || undefined,
      brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
      image: imageUrl ? [imageUrl] : undefined,
      url: `${siteUrl}/product/${product.slug || product.id}`,
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        price: product.price,
        availability:
          product.countInStock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        seller: { "@type": "Organization", name: "InfixMart" },
      },
      ...(product.rating > 0 && {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: product.rating,
          bestRating: 5,
          worstRating: 1,
        },
      }),
    };
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProductDetailsPage />
    </>
  );
}
