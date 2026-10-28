import { getDb } from "@/server/db/client";
import { getSetting } from "@/server/settings";

const logos: Record<string, string> = {
  mozal: "mozal.png", "millennium bim": "millennium-bim.svg", bci: "bci.svg",
  vodacom: "vodacom.webp", movitel: "movitel.png", cfm: "cfm.webp",
  edm: "edm.png", "standard bank": "standard-bank.svg",
};

export async function PartnerStrip() {
  const partners = await getSetting(await getDb(), "partners");
  if (!partners.names.length) return null;
  return (
    <section className="partners" aria-label="Parceiros">
      <div className="container">
        <div className="partners-head">
          <span>{partners.heading}</span>
          {partners.isDemo && <span className="badge badge-warning" style={{ letterSpacing: 0, textTransform: "none" }}>Demonstração para pitch — parcerias por confirmar</span>}
        </div>
        <div className="partner-marquee">
          <input className="partner-pause" type="checkbox" id="partner-pause" />
          <label className="partner-pause-label" htmlFor="partner-pause">
            <span className="partner-pause-text">Pausar animação</span>
            <span className="partner-resume-text">Retomar animação</span>
          </label>
          <div className="partner-window">
            <div className="partner-track">
              {[0, 1].map((copy) => (
                <div className="partner-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
                  {partners.names.map((name, i) => {
                    const key = name.trim().toLocaleLowerCase("pt");
                    const logo = logos[key];
                    return (
                      <span className={`partner-mark${key === "millennium bim" || key === "standard bank" || key === "bci" ? " partner-mark-dark" : ""}`} key={`${name}-${i}`}>
                        {logo ? <img src={`/partners/${logo}`} alt={copy === 0 ? name : ""} width="160" height="64" /> : name}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
