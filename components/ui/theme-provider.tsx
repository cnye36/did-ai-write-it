"use client";

import { useEffect, useRef } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";

function AuthIdentity({ children }: { children: React.ReactNode }) {
  const distinctId = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        distinctId.current = null;
        posthog.reset();
        return;
      }

      if ((event === "INITIAL_SESSION" || event === "SIGNED_IN") && session?.user) {
        if (distinctId.current && distinctId.current !== session.user.id) {
          posthog.reset();
        }
        distinctId.current = session.user.id;
        posthog.identify(session.user.id, { email: session.user.email });
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthIdentity>{children}</AuthIdentity>
    </NextThemesProvider>
  );
}
