"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaRegUser, FaRegHeart, FaMapMarkerAlt } from "react-icons/fa";
import { LuClipboardCheck } from "react-icons/lu";
import { MdAccountBalanceWallet } from "react-icons/md";

const MOBILE_NAV = [
  { href: "/my-account", icon: FaRegUser,              label: "Profile" },
  { href: "/my-orders",  icon: LuClipboardCheck,       label: "Orders" },
  { href: "/my-list",    icon: FaRegHeart,             label: "Wishlist" },
  { href: "/my-address", icon: FaMapMarkerAlt,         label: "Addresses" },
  { href: "/referral",   icon: MdAccountBalanceWallet, label: "Wallet" },
];

export default function AccountMobileNav() {
  const pathname = usePathname();
  return (
    <div className="md:hidden bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
      <div className="flex overflow-x-auto scrollbar-hide">
        {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-4 py-3 flex-shrink-0 text-[11px] font-[600] transition-colors border-b-2 ${
                active
                  ? "text-[#1565C0] border-[#1565C0] bg-[#F0F5FF]"
                  : "text-gray-500 border-transparent hover:text-[#1565C0] hover:bg-gray-50"
              }`}
            >
              <Icon className="text-[18px]" />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
