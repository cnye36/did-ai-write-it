import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc, type LegalSection } from "@/components/marketing/legal-doc";
import {
  LEGAL_EFFECTIVE_DATE,
  SITE_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "The rules for using Did AI Write It? including accounts, acceptable use, billing, and limits on our liability.",
  alternates: { canonical: "/terms" },
};

const sections: LegalSection[] = [
  {
    id: "agreement",
    title: "Agreement",
    body: (
      <>
        <p>
          These Terms of Use (“Terms”) govern access to and use of{" "}
          <strong>{SITE_NAME}</strong> at{" "}
          <a href={SITE_URL}>{SITE_URL.replace(/^https:\/\//, "")}</a> and
          related services (the “Service”). By using the Service, creating an
          account, or clicking to accept these Terms, you agree to them.
        </p>
        <p>
          If you use the Service on behalf of an organization, you represent that
          you have authority to bind that organization, and “you” includes that
          organization.
        </p>
        <p>
          Our <Link href="/privacy">Privacy Policy</Link> explains how we handle
          personal information and is incorporated by reference.
        </p>
      </>
    ),
  },
  {
    id: "the-service",
    title: "The Service",
    body: (
      <>
        <p>
          {SITE_NAME} provides tools to help you evaluate text for signs of AI
          writing, overlapping sources (plagiarism), and claim support
          (fact-checking). Scores and reports are generated using third-party
          detection providers and, where shown, our own heuristic signals.
        </p>
        <p>
          <strong>Scores are signals, not verdicts.</strong> No detector is
          certain on every input. You are responsible for how you interpret and
          act on results, especially on short drafts or edge cases.
        </p>
        <p>
          Features, plan limits, and availability may change as we improve the
          product. Some capabilities described in marketing may be marked
          “coming soon” and are not part of the current Service until shipped.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Accounts and eligibility",
    body: (
      <>
        <ul>
          <li>You must provide a valid email and keep your credentials secure.</li>
          <li>
            You are responsible for activity under your account. Tell us promptly
            if you suspect unauthorized access.
          </li>
          <li>
            Free and paid plans include monthly credit allowances and per-request
            size limits described on{" "}
            <Link href="/pricing">Pricing</Link>. Exceeding those limits may
            block further checks until the period resets or you upgrade.
          </li>
          <li>
            We may suspend or terminate accounts that violate these Terms or
            create risk to the Service or other users.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>
            Use the Service for unlawful purposes, or to harass, defraud, or
            harm others
          </li>
          <li>
            Upload content you do not have the right to submit, or that
            infringes someone else’s rights
          </li>
          <li>
            Attempt to bypass quotas, rate limits, security controls, or payment
            requirements
          </li>
          <li>
            Reverse engineer, scrape at scale, or interfere with the Service or
            its providers, except where applicable law allows
          </li>
          <li>
            Misrepresent detection results as a guarantee of originality,
            authenticity, or academic compliance
          </li>
          <li>
            Use the Service primarily to evade academic integrity policies or
            other honesty requirements you are bound by
          </li>
        </ul>
        <p>
          The Service is positioned for professional and marketing drafts. You
          remain solely responsible for complying with your school, employer, or
          publisher rules.
        </p>
      </>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    body: (
      <>
        <p>
          You retain ownership of text you submit. You grant us a limited
          license to process that text solely to provide the Service (including
          sending it to detection providers, storing successful runs in your
          history when signed in, and enforcing quotas).
        </p>
        <p>
          You represent that you have the rights needed to submit the content
          and that doing so does not violate law or third-party rights.
        </p>
        <p>
          We do not claim ownership of your drafts. We do not use your submitted
          text to train our own foundation models.
        </p>
      </>
    ),
  },
  {
    id: "billing",
    title: "Subscriptions and billing",
    body: (
      <>
        <p>
          Paid plans are billed through Stripe on the interval you select
          (monthly or annual). Prices and included credits are shown at checkout
          and on Pricing. Taxes may apply.
        </p>
        <p>
          You can manage payment methods and cancel through the Stripe customer
          portal linked from Billing in the app. Cancellation stops future
          renewals; access generally continues through the end of the paid
          period unless otherwise stated at cancellation.
        </p>
        <p>
          Except where required by law, fees already paid are non-refundable.
          If you believe a charge is in error, contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> promptly.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    body: (
      <>
        <p>
          The Service depends on third parties (for example auth and database
          hosting, payment processing, and detection APIs). Their availability,
          accuracy, and policies are outside our full control. Outages or
          changes at a provider may affect features or scores without notice.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <>
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM
          EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR
          IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
          AND NON-INFRINGEMENT.
        </p>
        <p>
          We do not warrant that scores will be accurate, complete, or suitable
          for any particular decision (hiring, publishing, academic grading, or
          otherwise). Detection technology has false positives and false
          negatives.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR SUPPLIERS WILL NOT
          BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
          PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA, OR GOODWILL,
          ARISING FROM YOUR USE OF THE SERVICE.
        </p>
        <p>
          OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT
          EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE SERVICE IN
          THE TWELVE MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS
          (US$100).
        </p>
        <p>
          Some jurisdictions do not allow certain limitations. In those places,
          our liability is limited to the fullest extent allowed by law.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <>
        <p>
          You will defend and indemnify us against claims, damages, and expenses
          (including reasonable attorneys’ fees) arising from your content, your
          use of the Service, or your violation of these Terms or applicable
          law.
        </p>
      </>
    ),
  },
  {
    id: "changes-termination",
    title: "Changes and termination",
    body: (
      <>
        <p>
          We may update these Terms by posting a new version with a revised
          effective date. Material changes may also be communicated by email.
          Continued use after changes take effect constitutes acceptance.
        </p>
        <p>
          You may stop using the Service at any time. We may suspend or end
          access if you breach these Terms, if required by law, or if we
          discontinue the Service. Provisions that by nature should survive
          (including ownership, disclaimers, liability limits, and indemnity)
          will survive termination.
        </p>
      </>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <>
        <p>
          These Terms are the entire agreement between you and us regarding the
          Service and supersede prior agreements on that subject. If a provision
          is unenforceable, the rest remains in effect. Our failure to enforce a
          provision is not a waiver. You may not assign these Terms without our
          consent; we may assign them in connection with a merger, acquisition,
          or sale of assets.
        </p>
        <p>
          These Terms are governed by the laws of the United States, without
          regard to conflict-of-law rules. Courts of competent jurisdiction in
          the United States will have exclusive venue for disputes, except where
          applicable consumer law requires otherwise.
        </p>
        <p>
          Contact: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          Related: <Link href="/privacy">Privacy Policy</Link>. Effective{" "}
          {LEGAL_EFFECTIVE_DATE}.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalDoc
      title="Terms of Use"
      description="The ground rules for using the detector, your account, paid plans, and what we can and cannot promise about AI-detection scores."
      sections={sections}
    />
  );
}
