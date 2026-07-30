import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="border-b border-line px-4 py-4 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Did <span className="text-accent">AI </span> Write It?
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Detection is free without an account. Sign in to rewrite text and track
              your monthly credit usage.
            </p>
          </div>
          <LoginForm />
          <p className="text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-accent hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
