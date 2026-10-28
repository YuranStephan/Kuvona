import { getDb } from "@/server/db/client";
import { isLocalMode } from "@/server/config";
import { getSetting } from "@/server/settings";

/**
 * Discreet floating WhatsApp link (bottom-right). Opens a chat with the academy number from
 * Gestão → Definições. A support agent can later answer on that same number (WhatsApp Business API)
 * without changing this component.
 */
export async function WhatsAppButton() {
  const school = await getSetting(await getDb(), "school");
  if (!school.whatsapp && !isLocalMode()) return null;
  const text = encodeURIComponent(school.whatsappGreeting);
  const href = school.whatsapp ? `https://wa.me/${school.whatsapp}?text=${text}` : `https://wa.me/?text=${text}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="wa-fab"
      aria-label="Falar connosco no WhatsApp"
      title={school.whatsapp ? "Falar connosco no WhatsApp" : "WhatsApp: configura o número em Gestão → Definições"}
    >
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3.5 20.5 4.8 16A8.5 8.5 0 1 1 8 19.2l-4.5 1.3Z" />
        <path d="M9 8.6c.2-.5.5-.6.8-.6h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c.6 1.2 1.6 2.1 2.8 2.7l.6-.6c.2-.2.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3-.1.6-.6.8-.8.4-1.9.4-3.2-.2a8.6 8.6 0 0 1-3.9-3.9c-.6-1.3-.6-2.4-.2-3Z" />
      </svg>
    </a>
  );
}
