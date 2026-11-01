import Link from "next/link";

/** The chosen open lotus: one central petal and two quietly spreading outer petals. */
export function HwaduLotusMark({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 40 36" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 30C12 25 12 16 20 6c8 10 8 19 0 24Z" />
    <path d="M13.9 16.8 8 11.7l-.3 8.1-5.9-1.4C3.8 27 10.7 31.1 20 30" />
    <path d="m26.1 16.8 5.9-5.1.3 8.1 5.9-1.4C36.2 27 29.3 31.1 20 30" />
  </svg>;
}

export default function HwaduBrand() {
  return <Link href="/" aria-label="화두 홈" className="hip-home hwadu-brand"><HwaduLotusMark /><b>화두</b></Link>;
}
