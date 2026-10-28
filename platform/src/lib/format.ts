import type { CourseLevel, CourseStatus, OrderStatus, PaymentProviderId, Role } from "@/server/db/schema";

const dateFmt = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Maputo" });
const shortFmt = new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short", timeZone: "Africa/Maputo" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Africa/Maputo",
});

export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
export const formatShortDate = (d: Date | string) => shortFmt.format(new Date(d));
export const formatDateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));

export function formatRelative(d: Date | string, now = new Date()) {
  const seconds = Math.round((new Date(d).getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("pt-PT", { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return rtf.format(seconds, "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return formatDate(d);
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export const levelLabel: Record<CourseLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Intermédio",
  advanced: "Avançado",
  all: "Todos os níveis",
};

export const courseStatusLabel: Record<CourseStatus, string> = {
  draft: "Rascunho",
  in_review: "Em revisão",
  published: "Publicado",
  archived: "Arquivado",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending: "Aguarda pagamento",
  awaiting_verification: "Em verificação",
  paid: "Pago",
  failed: "Recusado",
  cancelled: "Cancelado",
  expired: "Expirado",
  refunded: "Reembolsado",
};

export const providerLabel: Record<PaymentProviderId, string> = {
  manual_mpesa: "M-Pesa",
  manual_emola: "e-Mola",
  sandbox: "Simulador",
};

export const roleLabel: Record<Role, string> = {
  student: "Estudante",
  instructor: "Instrutor",
  admin: "Gestão",
};
