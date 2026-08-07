"use client";

import Script from "next/script";
import { useEffect, useEffectEvent, useId, useRef, useState } from "react";

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

  // Stable event callbacks so the widget mounts once per script-ready
  // transition, not on every parent re-render (e.g. every keystroke in the
  // form above it, which would otherwise pass a new inline onExpire each time
  // and tear down/recreate the challenge mid-solve).
  const onVerifyEvent = useEffectEvent(onVerify);
  const onExpireEvent = useEffectEvent(onExpire);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
    const id = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => onVerifyEvent(token),
      "expired-callback": () => onExpireEvent(),
      theme: "auto",
    });
    widgetIdRef.current = id;
    return () => {
      window.turnstile?.remove(id);
      widgetIdRef.current = null;
    };
  }, [scriptReady]);

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
