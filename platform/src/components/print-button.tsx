"use client";

import { Icon } from "./icon";

export function PrintButton({ label = "Imprimir / guardar PDF" }: { label?: string }) {
  return (
    <button type="button" className="btn" onClick={() => window.print()}>
      <Icon name="printer" size={18} /> {label}
    </button>
  );
}
