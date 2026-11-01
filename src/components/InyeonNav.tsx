import Link from "next/link";
import "./inyeon-nav.css";

export default function InyeonNav({ active, secondary = true }: { active?: "new" | "likes" | "letters"; secondary?: boolean }) {
  return <nav className="inyeon-nav" aria-label="인연 메뉴">
    <div className="inyeon-nav-main">
      {([ ["new", "/gathering/yeon", "새 인연"], ["likes", "/gathering/likes", "받은 호감"], ["letters", "/letters", "쪽지"] ] as const).map(([id, href, label]) => <Link key={id} href={href} aria-current={active === id ? "page" : undefined}>{label}</Link>)}
    </div>
    {secondary && <div className="inyeon-nav-sub"><Link href="/gathering">게시판</Link><Link href="/gathering/me">내 프로필</Link></div>}
  </nav>;
}
