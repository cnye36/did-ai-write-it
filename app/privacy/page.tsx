import type { Metadata } from "next";
import Link from "next/link";
import { LegalDoc, type LegalSection } from "@/components/marketing/legal-doc";
import {
  LEGAL_EFFECTIVE_DATE,
  PRIVACY_EMAIL,
  SITE_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Did AI Write It? collects, uses, and shares information when you check text for AI writing, plagiarism, or facts.",
  alternates: { canonical: "/privacy" },
};

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          This Privacy Policy explains how <strong>{SITE_NAME}</strong> (
          <a href={SITE_URL}>{SITE_URL.replace(/^https:\/\//, "")}</a>) collects,
          uses, and shares information when you use our website and tools.
        </p>
        <p>
          Questions or privacy requests:{" "}
          <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>. General
          support: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "What we collect",
    body: (
      <>
        <p>Depending on how you use the service, we may process:</p>
        <ul>
          <li>
            <strong>Account data.</strong> Email address and authentication
            credentials when you sign up. Passwords are handled by our auth
            provider and are not stored by us in plaintext.
          </li>
          <li>
            <strong>Content you submit.</strong> Text you paste or upload for
            AI detection, plagiarism checking, or fact-checking. If you are
            signed in and a check succeeds, we save that text and the result in
            your report history so you can reopen it later.
          </li>
          <li>
            <strong>Usage and billing.</strong> Plan tier, monthly credit usage,
            and Stripe customer or subscription identifiers when you subscribe.
          </li>
          <li>
            <strong>Technical data.</strong> For anonymous homepage scans, we
            store a hashed or raw IP address solely to enforce a daily rate
            limit. We also receive standard server logs (timestamps, routes,
            error codes) needed to run and secure the product.
          </li>
          <li>
            <strong>Device preferences.</strong> Theme choice (light, dark, or
            system) is stored in your browser via local storage. Text handed from
            the homepage into the signed-in app uses session storage on your
            device and is not sent to our servers until you run a check.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "How we use information",
    body: (
      <>
        <p>We use the information above to:</p>
        <ul>
          <li>Provide AI detection, plagiarism, and fact-checking results</li>
          <li>Create and manage accounts, quotas, and subscriptions</li>
          <li>Save and display your report history when you are signed in</li>
          <li>Prevent abuse (including rate-limiting anonymous scans)</li>
          <li>Respond to support requests and enforce our Terms</li>
          <li>Improve reliability and fix bugs</li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal information. We do not
          use your submitted drafts to train our own AI models.
        </p>
      </>
    ),
  },
  {
    id: "processors",
    title: "Who processes data for us",
    body: (
      <>
        <p>
          We rely on service providers to operate the product. Text you check is
          sent to the providers needed for that specific check:
        </p>
        <ul>
          <li>
            <strong>Supabase.</strong> Authentication, database, and related
            infrastructure for accounts, usage, and saved reports.
          </li>
          <li>
            <strong>Stripe.</strong> Payment processing when you subscribe or
            manage billing. Card details are handled by Stripe, not stored on
            our servers.
          </li>
          <li>
            <strong>Detection infrastructure.</strong> AI detection, plagiarism,
            and fact-checking systems that process submitted text to produce the
            scores and reports we show you.
          </li>
          <li>
            <strong>OpenAI or Anthropic.</strong> Only if you use rewrite or
            humanize features when those are enabled. Submitted text is sent to
            the configured model provider for that request.
          </li>
          <li>
            <strong>Hosting and edge infrastructure.</strong> Our app is served
            through standard web hosting providers that may process IP addresses
            and request metadata to deliver pages securely.
          </li>
        </ul>
        <p>
          These providers process data under their own terms and privacy
          policies, limited to what is needed to provide their services to us.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies and similar technologies",
    body: (
      <>
        <p>
          We use <strong>essential cookies</strong> to keep you signed in and to
          secure authenticated sessions (via our auth provider). These are
          required for the account features to work.
        </p>
        <p>
          We also use <strong>local storage</strong> for your theme preference
          and <strong>session storage</strong> for a one-time handoff of text
          from the homepage into the app. Those are stored on your device, not
          as third-party tracking cookies.
        </p>
        <p>
          We do <strong>not</strong> currently use advertising cookies,
          cross-site trackers, or third-party analytics pixels. If that changes,
          we will update this policy and, where required, ask for consent before
          setting non-essential cookies.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep data",
    body: (
      <>
        <ul>
          <li>
            <strong>Account and billing records</strong> are kept while your
            account is active and as needed for accounting, fraud prevention,
            and legal obligations after closure.
          </li>
          <li>
            <strong>Saved reports</strong> remain until you delete them or
            delete your account.
          </li>
          <li>
            <strong>Anonymous rate-limit records</strong> are kept only as long
            as needed to enforce the daily homepage scan limit.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your choices and rights",
    body: (
      <>
        <p>You can:</p>
        <ul>
          <li>Access and update your account email through the signed-in app</li>
          <li>Delete individual reports from your report history</li>
          <li>
            Manage or cancel a paid subscription through the Stripe billing
            portal linked from Billing
          </li>
          <li>
            Request account deletion or a copy of your data by emailing{" "}
            <a href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>
          </li>
        </ul>
        <p>
          Depending on where you live (for example under GDPR or CCPA/CPRA), you
          may have additional rights to access, correct, delete, or restrict
          processing of personal data, or to object to certain processing. We
          will respond to verified requests within the time required by
          applicable law.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <>
        <p>
          We use industry-standard protections appropriate to a hosted web app:
          encrypted transport (HTTPS), access-controlled databases with
          row-level security for user-owned data, and service credentials kept
          on the server. No method of transmission or storage is perfectly
          secure. If you believe your account has been compromised, contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> right away.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <>
        <p>
          The service is aimed at adults and professional users. We do not
          knowingly collect personal information from children under 13 (or the
          equivalent minimum age in your jurisdiction). If you believe a child
          has provided us information, contact us and we will delete it.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <>
        <p>
          We may update this Privacy Policy from time to time. The effective
          date at the top of the page will change when we do. Material changes
          will be highlighted on this page or, where appropriate, by email to
          your account address. Continued use after an update means you accept
          the revised policy.
        </p>
        <p>
          Related documents:{" "}
          <Link href="/terms">Terms of Use</Link>. Last updated{" "}
          {LEGAL_EFFECTIVE_DATE}.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalDoc
      title="Privacy Policy"
      description="What we collect when you paste a draft, how we use it to score AI writing, plagiarism, and facts, and the choices you have."
      sections={sections}
    />
  );
}
