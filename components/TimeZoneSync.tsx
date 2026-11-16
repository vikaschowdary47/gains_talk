"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Saves the coach's time zone from the browser, so times aren't shown in server (UTC) time. */
export default function TimeZoneSync({ saved }: { saved?: string }) {
  const router = useRouter();
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone || zone === saved) return;
    fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ timeZone: zone }) })
      .then((r) => r.ok && router.refresh())
      .catch(() => {});
  }, [saved, router]);
  return null;
}
