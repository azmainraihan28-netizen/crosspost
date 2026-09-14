import { APP_NAME } from "@/lib/brand";
import { Contact } from "../contact";

export const metadata = { title: "Data Deletion" };
export const dynamic = "force-dynamic";

export default function DataDeletionPage() {
  return (
    <>
      <h1>Data deletion</h1>
      <p>You can remove your data from {APP_NAME} yourself at any time. No need to contact us.</p>

      <h2>Delete your whole account</h2>
      <ul>
        <li>Log in and open <strong>Plan &amp; billing</strong>.</li>
        <li>Under <strong>Delete account</strong>, enter your password, type DELETE, and confirm.</li>
        <li>
          We immediately and permanently delete your account, connected social accounts and their access tokens, posts, drafts,
          uploaded images and analytics, and cancel any active subscription.
        </li>
        <li>Posts already published to social networks stay there. Delete them on each platform if you want them removed.</li>
      </ul>

      <h2>Disconnect a single social account</h2>
      <ul>
        <li>Open <strong>Accounts</strong> and click the <strong>×</strong> next to the account. Its access tokens and profile details are deleted immediately.</li>
        <li>
          You can also revoke access from the platform itself: Facebook <strong>Settings → Business integrations</strong>, Instagram{" "}
          <strong>Settings → Apps and websites</strong>, Threads <strong>Settings → Account → Website permissions</strong>, X{" "}
          <strong>Settings → Security and account access → Apps and sessions</strong>, LinkedIn{" "}
          <strong>Settings → Data privacy → Permitted services</strong>.
        </li>
      </ul>

      <h2>Can&apos;t log in?</h2>
      <p>
        If you can no longer access your account, contact <Contact /> from the email address you signed up with and we&apos;ll delete it
        within 30 days.
      </p>
    </>
  );
}
