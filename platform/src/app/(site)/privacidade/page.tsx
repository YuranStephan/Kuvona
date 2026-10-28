import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacidade — rascunho",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <LegalPage kind="privacy" />;
}
