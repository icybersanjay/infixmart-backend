"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import adminAxios from "./utils/adminAxios";

export default function AdminGuard({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(null);
  const router = useRouter();

  useEffect(() => {
    adminAxios
      .get("/api/user/user-details")
      .then((res) => {
        setIsAuthorized(res.data?.user?.role === "admin");
      })
      .catch(() => {
        setIsAuthorized(false);
      });
  }, []);

  useEffect(() => {
    if (isAuthorized === false) {
      router.replace("/admin/login");
    }
  }, [isAuthorized, router]);

  if (isAuthorized === null || isAuthorized === false) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: "9999px", border: "4px solid #dbeafe", borderTopColor: "#1565C0", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return children;
}
