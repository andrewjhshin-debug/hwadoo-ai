"use client";
// Same Google Analytics command queue already installed by the root layout.
// Only fixed event names are sent: no account IDs, photo data or message text.
export type FlowEvent = "sign_up" | "login" | "profile_saved" | "photo_registered" | "photo_retry" | "photo_failed" | "like_sent" | "match_created" | "conversation_opened" | "first_message_sent" | "message_sent" | "lotus_viewed" | "checkout_started" | "order_submitted" | "practice_started";
export function flowEvent(name: FlowEvent) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1") return;
  try {
    const target = window as Window & { dataLayer?: unknown[] };
    const layer = target.dataLayer ??= [];
    // gtag commands use an arguments object, including before its script loads.
    // eslint-disable-next-line prefer-rest-params -- Match the existing gtag command protocol.
    (function queue(..._args: unknown[]) { layer.push(arguments); })("event", name);
  } catch { /* Metrics never block an action. */ }
}
