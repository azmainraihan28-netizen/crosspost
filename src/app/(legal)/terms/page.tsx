import { APP_NAME } from "@/lib/brand";
import { Contact } from "../contact";

export const metadata = { title: "Terms of Service" };
export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <>
      <p className="eyebrow">Last updated September 14, 2026</p>
      <h1>Terms of Service</h1>
      <p>By creating an account or using {APP_NAME}, you agree to these terms.</p>

      <h2>The service</h2>
      <p>
        {APP_NAME} lets you compose, schedule and publish content to social media accounts you connect, and view engagement
        analytics. Features depend on what each platform&apos;s API allows and may change when platforms change their APIs.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You must provide accurate information and keep your password secure.</li>
        <li>You may only connect social accounts you own or are authorized to manage.</li>
        <li>You are responsible for all activity under your account.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You keep ownership of the content you create. You grant us a limited license to store, process and transmit it only to
        provide the service, including publishing it to the platforms you choose. You are responsible for your content and for
        following the rules of each platform you publish to.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>No spam, harassment, illegal content, or content that infringes others&apos; rights.</li>
        <li>No attempts to break, overload, or reverse engineer the service, or to bypass plan limits.</li>
        <li>No use that violates the terms of X, LinkedIn, Meta, or any other connected platform.</li>
      </ul>
      <p>We may suspend accounts that violate these terms.</p>

      <h2>AI features</h2>
      <p>AI-generated suggestions can be inaccurate. Review everything before publishing; you are responsible for what you post.</p>

      <h2>Plans and billing</h2>
      <p>
        Paid plans are billed monthly through Stripe and renew automatically until cancelled. You can cancel anytime from the
        billing page; you keep paid features until the end of the current period. Fees are non-refundable except where required by law.
      </p>

      <h2>Availability</h2>
      <p>
        We work to publish posts on time, but delivery can be delayed or fail because of platform outages, API limits, expired
        permissions, or other factors outside our control. The service is provided &quot;as is&quot; without warranties.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent permitted by law, {APP_NAME} is not liable for indirect or consequential damages, lost profits, or lost data.
        Our total liability is limited to the amount you paid us in the 12 months before the claim.
      </p>

      <h2>Changes and contact</h2>
      <p>
        We may update these terms and will notify you of material changes. Questions? Contact <Contact />.
      </p>
    </>
  );
}
