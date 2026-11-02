"use client";

import { useEffect } from "react";
import { usePalmier } from "@/lib/palmier/store";

export function PalmierToast() {
  const toast = usePalmier((s) => s.toast);
  const clear = usePalmier((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clear, 3500);
    return () => clearTimeout(t);
  }, [toast, clear]);

  if (!toast) return null;
  return (
    <div
      role="status"
      className="fade-in-up fixed top-4 right-4 z-50 max-w-sm rounded-md border border-[var(--border-primary)] bg-[var(--bg-prominent)] px-4 py-3 shadow-lg"
      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}
    >
      <div className="text-[12px] font-medium text-white">{toast.title}</div>
      {toast.description ? (
        <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">{toast.description}</div>
      ) : null}
    </div>
  );
}
