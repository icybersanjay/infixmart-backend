import { Suspense } from "react";
import TrackOrderClient from "./TrackOrderClient";

export const metadata = {
  title: "Track Your Order — InfixMart",
  description:
    "Track your InfixMart order using your order ID and the email or phone number used at checkout. No login required.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TrackOrderClient />
    </Suspense>
  );
}
