import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Política de reembolso — rascunho",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <LegalPage kind="refunds" />;
}
