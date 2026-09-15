import { Suspense } from "react";
import { AuthForm } from "../auth-form";
import { googleConfigured } from "@/lib/google-auth";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="font-display text-5xl leading-none">Welcome back.</h1>
      <p className="mt-3 mb-8 text-ink-2">Log in to see your queue and calendar.</p>
      <Suspense>
        <AuthForm mode="login" googleEnabled={googleConfigured()} />
      </Suspense>
    </>
  );
}
