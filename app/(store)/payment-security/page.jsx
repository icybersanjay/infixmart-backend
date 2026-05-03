import LegalPage from "../_legal/LegalPage.jsx";

export const metadata = {
  title: "Payment Security",
  description:
    "InfixMart uses industry-standard encryption and secure payment gateways. Your payment details are always safe with us.",
  robots: { index: true, follow: true },
};

export default function Page() {
  return <LegalPage slug="payment-security" path="/payment-security" />;
}
