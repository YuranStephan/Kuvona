import type { Metadata } from "next";
import { ContentSettingsForm } from "@/components/content-settings";
import {
  addCategoryAction,
  deleteCategoryAction,
  savePartnersAction,
  savePaymentSettingsAction,
  saveSchoolSettingsAction,
} from "@/actions/admin";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/forms";
import { PageHeader } from "@/components/workspace";
import { Notice } from "@/components/ui";
import { listCategories } from "@/server/catalog/queries";
import { isLocalMode, sandboxEnabled } from "@/server/config";
import { getDb } from "@/server/db/client";
import { getSetting } from "@/server/settings";

export const metadata: Metadata = { title: "Definições" };

export default async function SettingsPage() {
  const db = await getDb();
  const [payments, school, partners, cats, content] = await Promise.all([
    getSetting(db, "payments"),
    getSetting(db, "school"),
    getSetting(db, "partners"),
    listCategories(db),
    getSetting(db, "content"),
  ]);
  const exampleWallets =
    payments.mpesa.accountName.includes("exemplo") ||
    payments.emola.accountName.includes("exemplo");
  return (
    <>
      <PageHeader eyebrow="Gestão" title="Definições" />
      <nav className="row small" aria-label="Secções das definições">
        <a className="link" href="#pagamentos">
          Pagamentos
        </a>
        <a className="link" href="#conteudos">
          Conteúdos do site
        </a>
        <a className="link" href="#categorias">
          Categorias
        </a>
      </nav>

      <section className="form-section" id="pagamentos">
        <h2>Pagamentos M-Pesa e e-Mola</h2>
        {exampleWallets && (
          <Notice tone="warning">
            Os números atuais são exemplos. Substitui pelos números reais da
            academia antes de vender.
          </Notice>
        )}
        <p className="small muted">
          O estudante envia o valor para estes números e indica o ID da
          transação; a gestão confirma no extrato. Deixa um número vazio para
          esconder esse método.{" "}
          {sandboxEnabled() &&
            "O simulador de pagamentos está ativo porque estás em modo local."}
        </p>
        <ActionForm action={savePaymentSettingsAction} className="stack">
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="mpesaNumber">
                Número M-Pesa
              </label>
              <input
                className="input"
                id="mpesaNumber"
                name="mpesaNumber"
                defaultValue={payments.mpesa.number}
                placeholder="84 000 0000"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="mpesaName">
                Titular M-Pesa
              </label>
              <input
                className="input"
                id="mpesaName"
                name="mpesaName"
                defaultValue={payments.mpesa.accountName}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="emolaNumber">
                Número e-Mola
              </label>
              <input
                className="input"
                id="emolaNumber"
                name="emolaNumber"
                defaultValue={payments.emola.number}
                placeholder="86 000 0000"
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="emolaName">
                Titular e-Mola
              </label>
              <input
                className="input"
                id="emolaName"
                name="emolaName"
                defaultValue={payments.emola.accountName}
              />
            </div>
          </div>
          <div className="form-grid">
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label" htmlFor="instructions">
                Instruções extra para o estudante
              </label>
              <input
                className="input"
                id="instructions"
                name="instructions"
                defaultValue={payments.instructions}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="orderTtlHours">
                Prazo para pagar (horas)
              </label>
              <input
                className="input"
                id="orderTtlHours"
                name="orderTtlHours"
                type="number"
                min={1}
                max={336}
                defaultValue={payments.orderTtlHours}
              />
              <span className="hint">
                Pedidos já indicados como pagos nunca expiram sozinhos.
              </span>
            </div>
          </div>
          <div>
            <SubmitButton>Guardar pagamentos</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="form-section" id="academia">
        <h2>Academia, apoio e WhatsApp</h2>
        <ActionForm action={saveSchoolSettingsAction} className="stack">
          <div className="form-grid">
            <div className="field">
              <label className="label" htmlFor="legalName">
                Nome legal
              </label>
              <input
                className="input"
                id="legalName"
                name="legalName"
                defaultValue={school.legalName}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="nuit">
                NUIT
              </label>
              <input
                className="input"
                id="nuit"
                name="nuit"
                defaultValue={school.nuit}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="supportEmail">
                Email de apoio
              </label>
              <input
                className="input"
                id="supportEmail"
                name="supportEmail"
                type="email"
                defaultValue={school.supportEmail}
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="supportPhone">
                Telefone de apoio
              </label>
              <input
                className="input"
                id="supportPhone"
                name="supportPhone"
                defaultValue={school.supportPhone}
              />
            </div>
            <div className="field" id="whatsapp">
              <label className="label" htmlFor="whatsapp-number">
                WhatsApp (botão flutuante)
              </label>
              <input
                className="input"
                id="whatsapp-number"
                name="whatsapp"
                defaultValue={school.whatsapp}
                placeholder="258841234567"
                inputMode="tel"
              />
              <span className="hint">
                Formato internacional, sem “+”. Vazio = botão escondido
                {isLocalMode()
                  ? " (em modo local fica visível para testes)"
                  : ""}
                .
              </span>
            </div>
            <div className="field">
              <label className="label" htmlFor="whatsappGreeting">
                Mensagem inicial
              </label>
              <input
                className="input"
                id="whatsappGreeting"
                name="whatsappGreeting"
                defaultValue={school.whatsappGreeting}
              />
            </div>
          </div>
          <div>
            <SubmitButton>Guardar dados da academia</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="form-section" id="parceiros">
        <h2>Parceiros (página inicial)</h2>
        <p className="small muted">
          Mostrados como marcas de texto discretas. Só lista empresas com
          parceria confirmada; para uma apresentação, marca “demonstração” e a
          página indica que as parcerias estão por confirmar. Lista vazia =
          secção escondida.
        </p>
        <ActionForm action={savePartnersAction} className="stack">
          <div className="field">
            <label className="label" htmlFor="partners-heading">
              Título
            </label>
            <input
              className="input"
              id="partners-heading"
              name="heading"
              defaultValue={partners.heading}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="partners-names">
              Empresas (uma por linha, até 16)
            </label>
            <textarea
              className="textarea"
              id="partners-names"
              name="names"
              defaultValue={partners.names.join("\n")}
            />
          </div>
          <label className="check">
            <input
              type="checkbox"
              name="isDemo"
              defaultChecked={partners.isDemo}
            />
            <span className="small">
              Demonstração para pitch (mostra “parcerias por confirmar”)
            </span>
          </label>
          <div>
            <SubmitButton>Guardar parceiros</SubmitButton>
          </div>
        </ActionForm>
      </section>

      <section className="form-section" id="categorias">
        <h2>Categorias</h2>
        <div className="table-wrap">
          <table className="table">
            <tbody>
              {cats.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <div className="xsmall muted">{c.description}</div>
                  </td>
                  <td className="num">{c.courseCount} cursos</td>
                  <td className="num">
                    {c.courseCount === 0 && (
                      <ActionForm
                        action={deleteCategoryAction.bind(null, c.id)}
                      >
                        <ConfirmSubmit
                          label="Apagar"
                          className="btn btn-ghost btn-xs"
                          title={`Apagar “${c.name}”?`}
                          confirmLabel="Apagar"
                        />
                      </ActionForm>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ActionForm
          action={addCategoryAction}
          className="form-grid"
          resetOnSuccess
        >
          <div className="field">
            <label className="label" htmlFor="cat-name">
              Nova categoria
            </label>
            <input
              className="input"
              id="cat-name"
              name="name"
              required
              minLength={2}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="cat-desc">
              Descrição curta
            </label>
            <input className="input" id="cat-desc" name="description" />
          </div>
          <div style={{ alignSelf: "end" }}>
            <SubmitButton className="btn btn-soft">Adicionar</SubmitButton>
          </div>
        </ActionForm>
      </section>
      <ContentSettingsForm content={content} />
    </>
  );
}
