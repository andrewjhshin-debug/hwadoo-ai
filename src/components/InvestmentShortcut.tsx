"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mandala } from "./icons";
export default function InvestmentShortcut() {
  const path = usePathname();
  if (path === "/tamjinchi" || path?.startsWith("/admin")) return null;
  return <Link href="/tamjinchi" className="investment-shortcut" aria-label="불심 투자" title="불심 투자"><Mandala className="investment-dancheong" /></Link>;
}
