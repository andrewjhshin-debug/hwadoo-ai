import { closeInProduction } from "@/lib/devOnly";

export default function Layout({ children }: { children: React.ReactNode }) {
  closeInProduction();
  return children;
}
