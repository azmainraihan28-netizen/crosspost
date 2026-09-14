import { Suspense } from "react";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <h1 className="font-display text-5xl leading-none">Start posting everywhere.</h1>
      <p className="mt-3 mb-8 text-ink-2">Free forever on Starter. No card required.</p>
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </>
  );
}
