"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Jeoul } from "./icons";
export default function InvestmentShortcut() {
  const path = usePathname();
  if (path === "/tamjinchi" || path?.startsWith("/admin")) return null;
  return <Link href="/tamjinchi" className="investment-shortcut" aria-label="불심 투자" title="불심 투자"><Jeoul className="h-5 w-5" /></Link>;
}
