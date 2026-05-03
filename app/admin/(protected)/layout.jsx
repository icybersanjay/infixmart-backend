"use client";

import AdminGuard from "./_components/AdminGuard.jsx";
import AdminLayout from "./_components/AdminLayout.jsx";

export default function ProtectedAdminLayout({ children }) {
  return (
    <AdminGuard>
      <AdminLayout>{children}</AdminLayout>
    </AdminGuard>
  );
}
