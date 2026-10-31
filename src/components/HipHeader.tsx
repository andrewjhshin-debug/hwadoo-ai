"use client";
import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
const subscribe = () => () => {};
const client = () => true;
const server = () => false;

// Keep the original row's space, but paint it in the root viewport layer.
// Page widths, pull-to-refresh transforms and scrolling cannot move the controls.
export default function HipHeader({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribe, client, server);
  return <>
    <span className="hip-header-slot" aria-hidden="true" />
    {ready && createPortal(<header className="hip-screen-top hip-app-header">{children}</header>, document.getElementById("hip-header-layer") ?? document.body)}
  </>;
}
