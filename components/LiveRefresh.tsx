"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Keeps the page up to date: new messages show up within a few seconds, no reload needed. */
export default function LiveRefresh({ every = 5000 }: { every?: number }) {
  const router = useRouter();
  const last = useRef<string | null>(null);
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const { v } = (await fetch("/api/pulse", { cache: "no-store" }).then((r) => r.json())) as { v: string };
        if (last.current !== null && v !== last.current && !stop) router.refresh();
        last.current = v;
      } catch {
        /* offline for a moment; try again next tick */
      }
    };
    tick();
    const id = setInterval(tick, every);
    const onShow = () => tick();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      stop = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [every, router]);
  return null;
}
