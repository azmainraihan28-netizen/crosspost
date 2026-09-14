import { APP_NAME } from "@/lib/brand";
import { Contact } from "../contact";

export const metadata = { title: "Privacy Policy" };
export const dynamic = "force-dynamic";

export default function PrivacyPage() {
  return (
    <>
      <p className="eyebrow">Last updated September 14, 2026</p>
      <h1>Privacy Policy</h1>
      <p>
        {APP_NAME} (&quot;we&quot;, &quot;us&quot;) helps you write, schedule and publish posts to your social media accounts. This
        policy explains what we collect, why, and the choices you have.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li><strong>Account information:</strong> your name, email address, a securely hashed password, and your timezone.</li>
        <li>
          <strong>Connected social accounts:</strong> when you connect X, LinkedIn, Instagram, Facebook or Threads, we receive the
          account ID, username, display name and profile picture, plus access tokens issued by that platform. We never see or store
          your social media passwords.
        </li>
        <li><strong>Content you create:</strong> post text, images you upload, schedules and drafts.</li>
        <li>
          <strong>Post performance:</strong> engagement numbers (such as views, likes, comments and shares) for posts published
          through {APP_NAME}, retrieved from the platforms.
        </li>
        <li><strong>Billing:</strong> payments are processed by Stripe. We store your subscription status, not your card details.</li>
      </ul>

      <h2>How we use information</h2>
      <ul>
        <li>To publish and schedule posts to the accounts you connect, only when you ask us to.</li>
        <li>To show previews, your calendar, and analytics for your posts.</li>
        <li>To generate post suggestions with AI when you use AI features. The text you submit is sent to our AI provider to produce the result.</li>
        <li>To run, secure and improve the service, and to manage your subscription.</li>
      </ul>
      <p>We do not sell your personal information, and we do not use your social media data for advertising.</p>

      <h2>Platform data</h2>
      <p>
        Data obtained from Meta (Facebook, Instagram, Threads), X and LinkedIn is used only to provide the features you request in
        {" "}{APP_NAME}, in line with each platform&apos;s developer terms. Access tokens are encrypted at rest. You can disconnect an
        account at any time from the Accounts page, which deletes its stored tokens.
      </p>

      <h2>Service providers</h2>
      <p>
        We rely on trusted providers to operate the service: hosting (Vercel), database (Turso), file storage (Vercel Blob),
        payments (Stripe), and AI generation (OpenAI). They process data on our behalf only as needed to provide their services.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        We keep your data while your account is active. You can delete posts and disconnect accounts at any time, and you can
        permanently delete your account and all associated data yourself from <strong>Plan &amp; billing → Delete account</strong>.
        See our <a className="text-ink underline" href="/data-deletion">data deletion page</a> for details.
      </p>

      <h2>Security</h2>
      <p>Passwords are hashed, social tokens are encrypted with AES-256-GCM, and all traffic uses HTTPS.</p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, export or delete your personal data. Contact us at{" "}
        <Contact /> and we will respond within 30 days.
      </p>

      <h2>Changes</h2>
      <p>If we make material changes to this policy, we will update the date above and notify you by email or in the app.</p>
    </>
  );
}
