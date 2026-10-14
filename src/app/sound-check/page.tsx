import type { Metadata } from "next";
import SoundCheck from "./SoundCheck";

export const metadata: Metadata = {
  title: "모바일 소리 확인 | 화두",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <SoundCheck />;
}
