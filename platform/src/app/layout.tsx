import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "@/styles/base.css";
import "@/styles/site.css";
import "@/styles/studio.css";
import "@/styles/classroom.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["SOFT", "WONK", "opsz"], display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3100"),
  title: { default: "Academia Kuvona — Aprende o que te leva mais longe", template: "%s · Academia Kuvona" },
  description:
    "Cursos práticos em português, feitos para Moçambique. Aprende ao teu ritmo no telemóvel, paga com M-Pesa ou e-Mola e recebe um certificado verificável.",
  applicationName: "Academia Kuvona",
};

export const viewport: Viewport = {
  themeColor: "#16130E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${fraunces.variable} ${instrument.variable} ${jetbrains.variable}`}>
      <body>
        <a className="skip-link" href="#conteudo">
          Saltar para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
