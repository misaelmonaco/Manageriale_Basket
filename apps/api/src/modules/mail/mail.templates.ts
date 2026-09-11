import { SendMailInput } from "./mail.service";

/** Subject and body of an email; the recipient is added by the caller. */
export type MailContent = Omit<SendMailInput, "to">;

const BRAND = "#df5136";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type LayoutInput = {
  title: string;
  /** Already-escaped HTML paragraphs. */
  body: string;
  action?: { label: string; url: string };
  footer?: string;
};

function layout({ title, body, action, footer }: LayoutInput) {
  const button = action
    ? `<p style="margin:24px 0"><a href="${action.url}" style="display:inline-block;padding:12px 20px;background:${BRAND};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">${escapeHtml(action.label)}</a></p>
       <p style="font-size:13px;color:#555">Se il pulsante non funziona, copia questo indirizzo nel browser:<br><span style="word-break:break-all">${action.url}</span></p>`
    : "";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#111;max-width:560px;margin:0 auto;padding:24px">
      <h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
      ${body}
      ${button}
      ${footer ? `<p style="font-size:12px;color:#777;margin-top:32px;border-top:1px solid #eee;padding-top:16px">${escapeHtml(footer)}</p>` : ""}
      <p style="font-size:12px;color:#777">CourtVision</p>
    </div>
  `;
}

function paragraph(text: string) {
  return `<p>${escapeHtml(text)}</p>`;
}

export function verifyEmailTemplate(name: string, verifyUrl: string): MailContent {
  return {
    subject: "Verifica la tua email",
    html: layout({
      title: "Conferma il tuo indirizzo email",
      body: paragraph(`Ciao ${name}, usa il link qui sotto per attivare il tuo account CourtVision.`),
      action: { label: "Verifica email", url: verifyUrl },
      footer: "Il link scade tra 24 ore.",
    }),
    text: `Ciao ${name}, verifica la tua email aprendo questo link: ${verifyUrl}`,
  };
}

export function passwordResetTemplate(name: string, resetUrl: string, expiryMinutes: number): MailContent {
  return {
    subject: "Reimposta la tua password",
    html: layout({
      title: "Reimposta la tua password",
      body:
        paragraph(`Ciao ${name}, abbiamo ricevuto una richiesta di reimpostazione della password del tuo account CourtVision.`) +
        paragraph("Se non sei stato tu, ignora questa email: la password attuale resta valida."),
      action: { label: "Reimposta password", url: resetUrl },
      footer: `Il link scade tra ${expiryMinutes} minuti e puo' essere usato una sola volta.`,
    }),
    text: `Ciao ${name}, reimposta la tua password aprendo questo link (scade tra ${expiryMinutes} minuti): ${resetUrl}`,
  };
}

export function assignmentTemplate(
  name: string,
  organizationName: string,
  teamName: string | null,
  loginUrl: string,
): MailContent {
  const where = teamName ? `${organizationName}, squadra ${teamName}` : organizationName;
  return {
    subject: `Sei stato assegnato a ${organizationName}`,
    html: layout({
      title: "Benvenuto in squadra",
      body:
        paragraph(`Ciao ${name}, il tuo profilo e' stato assegnato a ${where}.`) +
        paragraph("Da ora puoi consultare calendario, partite e documenti della societa' dal tuo account."),
      action: { label: "Vai al gestionale", url: loginUrl },
    }),
    text: `Ciao ${name}, il tuo profilo e' stato assegnato a ${where}. Accedi al gestionale: ${loginUrl}`,
  };
}

export function paymentReminderTemplate(
  name: string,
  amount: string,
  dueDate: string,
  overdue: boolean,
  loginUrl: string,
): MailContent {
  return {
    subject: overdue ? `Quota scaduta del ${dueDate}` : `Quota in scadenza il ${dueDate}`,
    html: layout({
      title: overdue ? "Hai una quota scaduta" : "Hai una quota in scadenza",
      body:
        paragraph(
          overdue
            ? `Ciao ${name}, risulta non saldata una quota di ${amount} con scadenza ${dueDate}.`
            : `Ciao ${name}, ti ricordiamo la quota di ${amount} in scadenza il ${dueDate}.`,
        ) + paragraph("Se hai gia' effettuato il pagamento puoi ignorare questo messaggio."),
      action: { label: "Vedi i pagamenti", url: loginUrl },
      footer: "Per qualsiasi dubbio contatta la segreteria della societa'.",
    }),
    text: overdue
      ? `Ciao ${name}, risulta non saldata una quota di ${amount} scaduta il ${dueDate}. Dettagli: ${loginUrl}`
      : `Ciao ${name}, quota di ${amount} in scadenza il ${dueDate}. Dettagli: ${loginUrl}`,
  };
}
