import LegalPage from "../_legal/LegalPage.jsx";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Read InfixMart's Privacy Policy. Learn how we collect, use, and protect your personal information on our wholesale platform.",
  robots: { index: true, follow: true },
};

export default function Page() {
  return <LegalPage slug="privacy" path="/privacy-policy" />;
}
