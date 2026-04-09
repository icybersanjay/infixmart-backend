import BlogListingPage from "../../_legacy/Pages/Blog/index.jsx";

export const metadata = {
  title: "Blog",
  description:
    "Explore tips, guides, and news on wholesale buying, business growth, and product trends on the InfixMart Blog.",
  keywords: ["wholesale tips", "bulk buying guide", "InfixMart blog", "business tips India"],
  openGraph: {
    title: "Blog | InfixMart Wholesale",
    description:
      "Tips, guides, and news on wholesale buying and business growth.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog | InfixMart Wholesale",
    description: "Tips, guides, and news on wholesale buying and business growth.",
  },
};

export default function Page() {
  return <BlogListingPage />;
}
