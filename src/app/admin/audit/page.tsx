"use client";

import dynamic from "next/dynamic";

const AuditLog = dynamic(() => import("@/components/admin/AuditLog"), {
  ssr: false,
});

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <AuditLog />
    </div>
  );
}

