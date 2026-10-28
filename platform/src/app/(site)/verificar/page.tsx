import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";

export const metadata: Metadata = { title: "Verificar certificado" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
  const codigo = (await searchParams).codigo?.trim();
  if (codigo) redirect(`/verificar/${encodeURIComponent(codigo.toUpperCase())}`);
  return (
    <div className="container-narrow section stack" style={{ ["--gap" as string]: "20px", maxWidth: 640 }}>
      <span className="eyebrow">Verificação pública</span>
      <h1 className="display-2">Verificar um certificado</h1>
      <p className="lead">Introduz o código impresso no certificado (formato KVC-XXXX-XXXX) para confirmar que foi emitido pela Academia Kuvona.</p>
      <form className="hero-search" role="search">
        <input name="codigo" placeholder="KVC-XXXX-XXXX" aria-label="Código do certificado" className="mono" required style={{ textTransform: "uppercase" }} />
        <button className="btn btn-accent" type="submit">
          <Icon name="shield" size={18} /> Verificar
        </button>
      </form>
    </div>
  );
}
