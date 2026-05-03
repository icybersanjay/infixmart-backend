"use client";

import { FaWhatsapp } from "react-icons/fa";
import { usePathname } from "next/navigation";

const HIDDEN_PATHS = ["/admin", "/checkout"];
const WA_NUMBER = "918849047148";
const WA_MESSAGE = "Hi! I need help with my order on InfixMart.";

const WhatsAppButton = () => {
  const pathname = usePathname();
  if (HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;

  const href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-[76px] right-4 md:bottom-6 md:right-6 z-50 w-[52px] h-[52px] bg-[#25D366] rounded-full shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200"
      style={{ boxShadow: "0 4px 20px rgba(37,211,102,0.45)" }}
    >
      <FaWhatsapp className="text-white text-[26px]" />
    </a>
  );
};

export default WhatsAppButton;
