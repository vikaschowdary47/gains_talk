import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { CONTACT_EMAIL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of service · GainsTalk" };

export default function Terms() {
  return (
    <LegalPage title="Terms of service">
      <p>
        These terms apply to anyone using GainsTalk (gainstalk.com). By using GainsTalk you agree to them. If you
        don&apos;t agree, don&apos;t use the service.
      </p>

      <h2>What GainsTalk does</h2>
      <p>
        GainsTalk collects messages from the apps a coach connects, drafts replies, and sends only the replies the coach
        approves. The coach is always the one who decides what gets sent.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 18 and able to agree to these terms.</li>
        <li>Keep your login safe. You&apos;re responsible for what happens in your account.</li>
        <li>Only connect accounts and phone numbers that you own or are allowed to use.</li>
      </ul>

      <h2>Your clients and your messages</h2>
      <ul>
        <li>You&apos;re responsible for the messages you send through GainsTalk, including AI drafts you choose to send. Read drafts before sending.</li>
        <li>Only message people who have contacted you or agreed to hear from you. Don&apos;t use GainsTalk for spam, bulk marketing or anything illegal.</li>
        <li>Follow the rules of the apps you connect, including the WhatsApp Business Messaging Policy and Meta&apos;s Platform Terms.</li>
        <li>GainsTalk isn&apos;t medical advice. If a client describes a medical problem, point them to a professional.</li>
      </ul>

      <h2>Your data</h2>
      <p>
        Your messages and client information are yours. We use them only to run GainsTalk for you, as described in our{" "}
        <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>Availability</h2>
      <p>
        We work to keep GainsTalk running, but it&apos;s provided as is. Connected apps can change or go down, and messages
        can be delayed. Don&apos;t rely on GainsTalk for emergencies.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can stop using GainsTalk at any time and ask us to delete your data. We may suspend accounts that break these
        terms or the rules of a connected app.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, GainsTalk isn&apos;t liable for indirect or lost-profit damages, or for messages
        delayed, lost or sent by a connected app.
      </p>

      <h2>Changes</h2>
      <p>If we change these terms, we&apos;ll update the date at the top and tell coaches in the app before the change takes effect.</p>

      <h2>Contact</h2>
      <p>Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
