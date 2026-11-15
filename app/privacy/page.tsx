import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { CONTACT_EMAIL } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy policy · GainsTalk" };

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <p>
        GainsTalk (gainstalk.com) helps fitness and wellness coaches keep up with client messages. It collects new
        messages from the apps a coach already uses, such as WhatsApp, Instagram and Facebook Messenger, and drafts
        replies the coach can edit and send. This policy explains what we collect, why, and how to have it deleted.
      </p>

      <h2>Who this covers</h2>
      <p>
        <strong>Coaches</strong> who sign up for GainsTalk, and <strong>their clients</strong>, whose messages to the
        coach pass through GainsTalk. Clients don&apos;t install or sign up for anything; they keep messaging their coach
        the way they already do.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>From coaches:</strong> name, email, the accounts you connect, which contacts are your clients, and the texting-style settings you choose.</li>
        <li><strong>From clients a coach has chosen:</strong> name, phone number or username on the connected app, messages to the coach (text, photos, voice notes), and the replies the coach sends.</li>
        <li><strong>From anyone else who messages the coach:</strong> only their name and phone number or username, kept so the coach can decide whether they&apos;re a client. The message itself is dropped the moment it arrives and never saved. If the coach says they aren&apos;t a client, later messages from them are dropped too.</li>
        <li><strong>Basic technical data:</strong> times of webhook deliveries and errors, so we can keep the service working. These records don&apos;t include message text.</li>
      </ul>

      <h2>WhatsApp, Instagram and Messenger data</h2>
      <p>
        When a coach connects a WhatsApp Business number, Instagram professional account or Facebook Page, Meta sends
        GainsTalk the messages that people send to that account, and GainsTalk sends the replies the coach approves. We
        use this data only to show the coach their client messages, draft replies, send the replies the coach approves,
        and remind the coach of things they promised. Nothing is sent without the coach&apos;s approval. We don&apos;t
        send marketing messages, and we don&apos;t sell, rent or share this data with advertisers.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>Show each coach their client messages in one place.</li>
        <li>Draft replies in the coach&apos;s own style. Drafts are made with an AI service (Anthropic). The coach reviews every draft before anything is sent.</li>
        <li>Remind the coach of promises they made and clients who have gone quiet.</li>
      </ul>
      <p>Client messages are never used to train AI models, ours or anyone else&apos;s.</p>

      <h2>Who processes it for us</h2>
      <ul>
        <li><strong>Vercel</strong>: hosts the app.</li>
        <li><strong>Upstash</strong>: stores the app&apos;s data.</li>
        <li><strong>Anthropic</strong>: writes reply drafts. Anthropic doesn&apos;t use this data to train its models.</li>
        <li><strong>Meta</strong>: delivers WhatsApp, Instagram and Messenger messages.</li>
      </ul>
      <p>We share data with no one else, unless the law requires it.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep a coach&apos;s data for as long as their account is open. When a coach deletes a client, or closes their
        account, we delete the related messages within 30 days. Names and handles of people who aren&apos;t clients are
        removed as soon as the coach decides.
      </p>

      <h2>Deleting your data</h2>
      <p>
        Anyone can ask us to delete their data: email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Clients can
        also ask their coach. We confirm and finish deletion within 30 days. See <Link href="/data-deletion">how to delete your data</Link>.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit. Access to messages is limited to the coach&apos;s account. Webhooks from Meta are
        checked with Meta&apos;s signature so only genuine messages are accepted.
      </p>

      <h2>Children</h2>
      <p>GainsTalk is for coaches who are adults. It isn&apos;t meant for children under 13, and we don&apos;t knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we&apos;ll update the date at the top and tell coaches in the app before the change takes effect.</p>

      <h2>Contact</h2>
      <p>Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </LegalPage>
  );
}
