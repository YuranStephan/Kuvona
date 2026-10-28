import type { PaymentProviderId } from "../db/schema";
import { sandboxEnabled } from "../config";
import type { PaymentSettings } from "../settings";

export type ProviderOption = {
  id: PaymentProviderId;
  label: string;
  /** manual: the student pays the academy's wallet and submits the transaction ID for staff verification. */
  kind: "manual" | "simulated";
  description: string;
  wallet?: { number: string; accountName: string };
};

/**
 * Payment methods offered at checkout. A real gateway (USSD push + signed webhook) plugs in here as
 * another provider once a contract and credentials exist; until then nothing pretends to be one.
 */
export function availableProviders(settings: PaymentSettings): ProviderOption[] {
  const options: ProviderOption[] = [];
  if (settings.mpesa.number) {
    options.push({
      id: "manual_mpesa",
      label: "M-Pesa",
      kind: "manual",
      description: "Envia o valor por M-Pesa e indica o ID da transação. A equipa confirma no extrato.",
      wallet: settings.mpesa,
    });
  }
  if (settings.emola.number) {
    options.push({
      id: "manual_emola",
      label: "e-Mola",
      kind: "manual",
      description: "Envia o valor por e-Mola e indica o ID da transação. A equipa confirma no extrato.",
      wallet: settings.emola,
    });
  }
  if (sandboxEnabled()) {
    options.push({
      id: "sandbox",
      label: "Simulador de pagamento",
      kind: "simulated",
      description: "Apenas para testes locais: imita um pedido de confirmação no telemóvel. Não movimenta dinheiro.",
    });
  }
  return options;
}

export function providerOption(settings: PaymentSettings, id: PaymentProviderId) {
  return availableProviders(settings).find((p) => p.id === id) ?? null;
}
