/** Support contact line. Set SUPPORT_EMAIL to publish an email address on legal pages. */
export function Contact() {
  const email = process.env.SUPPORT_EMAIL?.trim();
  return email ? (
    <a className="font-medium text-ink underline underline-offset-4" href={`mailto:${email}`}>
      {email}
    </a>
  ) : (
    <span>our support team</span>
  );
}
