import type { Metadata } from "next";
import LegalPage, { CONTACT_EMAIL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Delete your data · GainsTalk" };

export default function DataDeletion() {
  return (
    <LegalPage title="Delete your data">
      <p>You can have your GainsTalk data deleted at any time. Here&apos;s how.</p>

      <h2>If you&apos;re a client of a coach</h2>
      <ol>
        <li>Ask your coach to remove you from GainsTalk. This deletes your messages from their account.</li>
        <li>Or email <a href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20data`}>{CONTACT_EMAIL}</a> with the phone number or username you message your coach from, and your coach&apos;s name.</li>
      </ol>

      <h2>If you&apos;re a coach</h2>
      <ol>
        <li>To remove one client, open them in Clients and remove them.</li>
        <li>To close your account and delete everything, email <a href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20account`}>{CONTACT_EMAIL}</a> from the email on your account.</li>
      </ol>

      <h2>If you removed GainsTalk from Facebook or Instagram</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}?subject=Delete%20my%20data`}>{CONTACT_EMAIL}</a> with your name and the
        account you used, and we&apos;ll delete the data we received from it.
      </p>

      <h2>What happens next</h2>
      <p>
        We reply to confirm we got your request, then delete your messages, name, and phone number or username within 30
        days. Messages that people who aren&apos;t clients send to a coach are never saved in the first place.
      </p>
    </LegalPage>
  );
}
