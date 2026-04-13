// Server component wrapper — enables generateMetadata + JSON-LD for SEO
import BlogDetailPage from "../../../_legacy/Pages/Blog/BlogDetail.jsx";
import { getBlogPublic } from "../../../../lib/server/services/blogs.js";

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

async function fetchBlog(slug) {
  try {
    const result = await getBlogPublic(slug);
    return result?.blog ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const blog = await fetchBlog(slug);

  if (!blog) {
    return {
      title: "Blog Post Not Found",
      robots: { index: false, follow: false },
    };
  }

  const description = blog.excerpt
    ? String(blog.excerpt).slice(0, 160)
    : blog.content
    ? stripHtml(blog.content)
    : `Read ${blog.title} on InfixMart Blog.`;

  const imageUrl = blog.image
    ? blog.image.startsWith("http")
      ? blog.image
      : `${siteUrl}${blog.image}`
    : null;

  const canonicalUrl = `${siteUrl}/blog/${blog.slug}`;

  return {
    title: blog.title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: blog.title,
      description,
      url: canonicalUrl,
      type: "article",
      publishedTime: blog.createdAt ? new Date(blog.createdAt).toISOString() : undefined,
      modifiedTime: blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
      authors: blog.author ? [`${siteUrl}`] : undefined,
      ...(imageUrl && { images: [{ url: imageUrl, alt: blog.title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: blog.title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const blog = await fetchBlog(slug);

  let jsonLd = null;
  if (blog) {
    const imageUrl = blog.image
      ? blog.image.startsWith("http")
        ? blog.image
        : `${siteUrl}${blog.image}`
      : null;

    jsonLd = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: blog.title,
      description: blog.excerpt || undefined,
      image: imageUrl ? [imageUrl] : undefined,
      author: {
        "@type": "Person",
        name: blog.author || "InfixMart",
      },
      publisher: {
        "@type": "Organization",
        name: "InfixMart",
        url: siteUrl,
      },
      datePublished: blog.createdAt ? new Date(blog.createdAt).toISOString() : undefined,
      dateModified: blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
      url: `${siteUrl}/blog/${blog.slug}`,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `${siteUrl}/blog/${blog.slug}`,
      },
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
      <BlogDetailPage />
    </>
  );
}
