import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { getCurrentUser } from "@/server/auth/session";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeader user={user} />
      {user && !user.emailVerifiedAt && (
        <div className="verify-banner">
          <div className="container">
            Confirma o teu email para receberes recibos e certificados. <Link href="/conta" className="link">Reenviar confirmação</Link>
          </div>
        </div>
      )}
      <main id="conteudo">{children}</main>
      <SiteFooter />
      <WhatsAppButton />
    </>
  );
}
