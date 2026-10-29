"use client";
import { useEffect, useSyncExternalStore } from "react";
import { disposeWalking, getWalking, initWalking, subscribeWalking, WALKING_EMPTY } from "@/lib/walking";
export function useWalking() { return useSyncExternalStore(subscribeWalking, getWalking, () => WALKING_EMPTY); }
export default function WalkingRuntime() { useEffect(() => { initWalking(); return disposeWalking; }, []); return null; }
