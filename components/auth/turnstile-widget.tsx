"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Cloudflare Turnstile challenge. Supabase Auth verifies the resulting token
 *  server-side against the secret key configured in the Supabase dashboard
 *  (Authentication -> Attack Protection), so this component's only job is to
 *  render the widget and hand the token up to the form. Renders nothing when
 *  no site key is configured, so local dev without Turnstile set up still
 *  works, same "never a hard dependency" contract lib/winston.ts uses. */
export function TurnstileWidget({
  onVerify,
  onExpire,
}: {
  onVerify: (token: string) => void;
  onExpire: () => void;
}) {
  const containerId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
    const id = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: onVerify,
      "expired-callback": onExpire,
      theme: "auto",
    });
    widgetIdRef.current = id;
    return () => {
      window.turnstile?.remove(id);
      widgetIdRef.current = null;
    };
  }, [scriptReady, onVerify, onExpire]);

  if (!SITE_KEY) return null;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} id={containerId} />
    </>
  );
}
