import BlogListingPage from "../../_legacy/Pages/Blog/index.jsx";

export const metadata = {
  title: "Wholesale Tips, Guides & Business Insights",
  description:
    "Explore tips, guides, and news on wholesale buying, business growth, and product trends on the InfixMart Blog.",
  keywords: ["wholesale tips", "bulk buying guide", "InfixMart blog", "business tips India"],
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Wholesale Tips, Guides & Insights | InfixMart Blog",
    description:
      "Tips, guides, and news on wholesale buying and business growth.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wholesale Tips, Guides & Insights | InfixMart Blog",
    description: "Tips, guides, and news on wholesale buying and business growth.",
  },
};

export default function Page() {
  return <BlogListingPage />;
}
