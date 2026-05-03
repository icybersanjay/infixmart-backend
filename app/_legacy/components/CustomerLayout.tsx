"use client";
import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import WhatsAppButton from "./WhatsAppButton";
import CompareBar from "./CompareBar";
import ExitIntentPopup from "./ExitIntentPopup";
import usePushNotifications from "../hooks/usePushNotifications";

interface CustomerLayoutProps {
  children: ReactNode;
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  usePushNotifications();
  return (
    <>
      <Header />
      {children}
      <Footer />
      <BottomNav />
      <WhatsAppButton />
      <CompareBar />
      <ExitIntentPopup />
    </>
  );
}
