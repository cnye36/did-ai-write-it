import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="border-b border-line px-4 py-4 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          letaiwriteit<span className="text-accent">.com</span>
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Create an account</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Free, 500 humanized words a month. No card required.
            </p>
          </div>
          <SignupForm />
          <p className="text-sm text-muted">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
