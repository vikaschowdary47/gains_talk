import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "./Logo";

export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || "privacy@gainstalk.com";
export const UPDATED = "November 15, 2026";

/** Plain, readable layout for the privacy policy, terms and data deletion pages. */
export default function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="legal">
      <header className="legal-head">
        <Link href="/" className="legal-brand" aria-label="GainsTalk home">
          <span className="legal-mark"><LogoMark size={26} variant="dark" /></span>
          <span>GainsTalk</span>
        </Link>
      </header>
      <article className="legal-body">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated {UPDATED}</p>
        {children}
      </article>
      <footer className="legal-foot">
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/terms">Terms of service</Link>
        <Link href="/data-deletion">Delete your data</Link>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </footer>
    </main>
  );
}
