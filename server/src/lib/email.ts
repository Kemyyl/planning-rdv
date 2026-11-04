import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RdvInfo {
  debut: string;
  fin?: string;
  titre?: string;
  duree?: number;
  prestation?: { nom: string };
  lien_meet?: string;
  jeton_annulation?: string;
}

/**
 * Échappe les caractères HTML pour éviter l'injection quand on interpole des
 * valeurs user-controlled dans un template email. À appliquer sur TOUTE
 * variable non maîtrisée (noms, messages, commentaires…).
 */
function esc(v: string | number | null | undefined): string {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function makeTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function isConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendConfirmationEmail(to: string, prenom: string, rdv: RdvInfo) {
  if (!isConfigured()) return;
  const dateStr = format(new Date(rdv.debut), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const cancelUrl = rdv.jeton_annulation ? `${appUrl}/mes-rdv?jeton=${encodeURIComponent(rdv.jeton_annulation)}` : '';
  const seanceNom = rdv.prestation?.nom || rdv.titre || 'Séance';

  await makeTransport().sendMail({
    from: `Synégo <${process.env.EMAIL_FROM || 'noreply@synego.fr'}>`,
    to,
    subject: `Confirmation – ${seanceNom}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0A1D35">
      <div style="background:#0A1D35;padding:24px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Synégo</h1>
        <p style="color:#6CAED6;margin:4px 0 0">Accompagnement thérapeutique</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E7DCCD;border-top:none;border-radius:0 0 16px 16px">
        <h2 style="margin-top:0">Votre rendez-vous est confirmé ✓</h2>
        <p>Bonjour <strong>${esc(prenom)}</strong>,</p>
        <p>Votre séance <strong>${esc(seanceNom)}</strong> est confirmée :</p>
        <div style="background:#F7F2EB;border-radius:12px;padding:16px 20px;margin:20px 0">
          <p style="margin:0;font-size:18px;font-weight:bold">${esc(dateStr)}${rdv.duree ? ` · ${rdv.duree} min` : ''}</p>
        </div>
        ${rdv.lien_meet ? `
        <p style="margin-bottom:8px">Lien pour rejoindre la séance :</p>
        <a href="${esc(rdv.lien_meet)}" style="display:inline-block;background:#6CAED6;color:#0A1D35;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold">
          Rejoindre la séance
        </a>` : ''}
        ${cancelUrl ? `<p style="margin-top:24px;font-size:13px;color:#56627A">
          Vous pouvez <a href="${esc(cancelUrl)}" style="color:#56627A">annuler gratuitement jusqu'à 24h avant</a>.
        </p>` : ''}
        <p style="margin-top:32px;color:#56627A">À bientôt,<br><strong>L'équipe Synégo</strong></p>
      </div>
    </div>`,
  });
}

export async function sendInviteEmail(to: string, prenom: string, inviteUrl: string) {
  if (!isConfigured()) return;
  await makeTransport().sendMail({
    from: `Synégo <${process.env.EMAIL_FROM || 'noreply@synego.fr'}>`,
    to,
    subject: 'Bienvenue sur Synégo – Activez votre compte',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0A1D35">
      <div style="background:#0A1D35;padding:24px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Synégo</h1>
        <p style="color:#6CAED6;margin:4px 0 0">Accompagnement thérapeutique</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E7DCCD;border-top:none;border-radius:0 0 16px 16px">
        <h2 style="margin-top:0">Bienvenue, ${esc(prenom)} !</h2>
        <p>Un compte a été créé pour vous sur Synégo.</p>
        <p>Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace :</p>
        <div style="margin:24px 0">
          <a href="${esc(inviteUrl)}" style="display:inline-block;background:#0A1D35;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px">
            Activer mon compte
          </a>
        </div>
        <p style="font-size:13px;color:#56627A">Ce lien est valable 7 jours. Si vous n'avez pas demandé ce compte, ignorez cet e-mail.</p>
        <p style="margin-top:32px;color:#56627A">À bientôt,<br><strong>L'équipe Synégo</strong></p>
      </div>
    </div>`,
  });
}

export async function sendDevisEmail(data: {
  prenom: string; nom: string; email: string; telephone?: string;
  type_accompagnement?: string; message: string;
}) {
  if (!isConfigured()) return;
  const to = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || 'noreply@synego.fr';
  await makeTransport().sendMail({
    from: `Synégo <${process.env.EMAIL_FROM || 'noreply@synego.fr'}>`,
    to,
    replyTo: data.email,
    subject: `Nouvelle demande de devis — ${esc(data.prenom)} ${esc(data.nom)}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0A1D35">
      <div style="background:#0A1D35;padding:24px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Synégo</h1>
        <p style="color:#6CAED6;margin:4px 0 0">Nouvelle demande de devis</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E7DCCD;border-top:none;border-radius:0 0 16px 16px">
        <h2 style="margin-top:0">Demande de devis reçue</h2>
        <div style="background:#F7F2EB;border-radius:12px;padding:16px 20px;margin:16px 0">
          <p style="margin:0 0 8px"><strong>Nom :</strong> ${esc(data.prenom)} ${esc(data.nom)}</p>
          <p style="margin:0 0 8px"><strong>Email :</strong> <a href="mailto:${esc(data.email)}">${esc(data.email)}</a></p>
          ${data.telephone ? `<p style="margin:0 0 8px"><strong>Téléphone :</strong> ${esc(data.telephone)}</p>` : ''}
          ${data.type_accompagnement ? `<p style="margin:0"><strong>Type :</strong> ${esc(data.type_accompagnement)}</p>` : ''}
        </div>
        <h3 style="color:#56627A;font-size:14px;text-transform:uppercase;letter-spacing:0.05em">Message</h3>
        <p style="background:#F7F2EB;border-radius:12px;padding:16px 20px;white-space:pre-wrap">${esc(data.message)}</p>
        <p style="color:#56627A;font-size:13px;margin-top:24px">Répondez directement à cet email pour contacter ${esc(data.prenom)}.</p>
      </div>
    </div>`,
  });
}

export async function sendDevisConfirmEmail(to: string, prenom: string) {
  if (!isConfigured()) return;
  await makeTransport().sendMail({
    from: `Synégo <${process.env.EMAIL_FROM || 'noreply@synego.fr'}>`,
    to,
    subject: 'Votre demande a bien été reçue — Synégo',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0A1D35">
      <div style="background:#0A1D35;padding:24px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Synégo</h1>
        <p style="color:#6CAED6;margin:4px 0 0">Accompagnement thérapeutique</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E7DCCD;border-top:none;border-radius:0 0 16px 16px">
        <h2 style="margin-top:0">Demande reçue, ${esc(prenom)} ✓</h2>
        <p>Merci pour votre demande. Nous l'avons bien reçue et vous contacterons dans les 24h.</p>
        <p style="margin-top:24px;color:#56627A">À très bientôt,<br><strong>L'équipe Synégo</strong></p>
      </div>
    </div>`,
  });
}

export async function sendDevisPdfEmail(data: {
  to: string;
  prenom: string;
  devisNum: string;
  prestationNom: string;
  duree: number;
  nbSeances: number;
  prixParSeance: number;
  total: number;
  notes?: string;
  validiteDate: string;
  pdfBuffer: Buffer;
}) {
  if (!isConfigured()) return;
  const totalStr = data.total % 1 === 0 ? `${data.total} €` : `${data.total.toFixed(2)} €`;
  await makeTransport().sendMail({
    from: `Synégo <${process.env.EMAIL_FROM || 'noreply@synego.fr'}>`,
    to: data.to,
    subject: `Votre devis Synégo — ${esc(data.devisNum)}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0A1D35">
      <div style="background:#0A1D35;padding:24px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Synégo</h1>
        <p style="color:#6CAED6;margin:4px 0 0">Accompagnement thérapeutique</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E7DCCD;border-top:none;border-radius:0 0 16px 16px">
        <h2 style="margin-top:0">Votre devis personnalisé</h2>
        <p>Bonjour <strong>${esc(data.prenom)}</strong>,</p>
        <p>Veuillez trouver ci-joint votre devis personnalisé pour votre accompagnement.</p>
        <div style="background:#F7F2EB;border-radius:12px;padding:20px 24px;margin:20px 0">
          <p style="margin:0 0 6px;font-weight:bold;font-size:15px">${esc(data.prestationNom)}</p>
          <p style="margin:0 0 4px;color:#56627A;font-size:13px">${data.nbSeances} séance${data.nbSeances > 1 ? 's' : ''} · ${data.duree} min chacune</p>
          <p style="margin:10px 0 0;font-size:22px;font-weight:bold;color:#0A1D35">${totalStr}</p>
        </div>
        <p style="font-size:13px;color:#56627A">Ce devis est valable jusqu'au <strong>${esc(data.validiteDate)}</strong>.</p>
        <p style="font-size:12px;color:#9BA8B8;margin-top:4px">Réf. ${esc(data.devisNum)}</p>
        <p style="margin-top:32px;color:#56627A">À bientôt,<br><strong>L'équipe Synégo</strong></p>
      </div>
    </div>`,
    attachments: [{
      filename: `devis-${data.devisNum}.pdf`,
      content: data.pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
}

export async function sendResetPasswordEmail(to: string, prenom: string, resetUrl: string) {
  if (!isConfigured()) return;
  await makeTransport().sendMail({
    from: `Synégo <${process.env.EMAIL_FROM || 'noreply@synego.fr'}>`,
    to,
    subject: 'Réinitialisation de votre mot de passe — Synégo',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0A1D35">
      <div style="background:#0A1D35;padding:24px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Synégo</h1>
        <p style="color:#6CAED6;margin:4px 0 0">Accompagnement thérapeutique</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E7DCCD;border-top:none;border-radius:0 0 16px 16px">
        <h2 style="margin-top:0">Réinitialisation de mot de passe</h2>
        <p>Bonjour <strong>${esc(prenom)}</strong>,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
        <div style="margin:24px 0">
          <a href="${esc(resetUrl)}" style="display:inline-block;background:#0A1D35;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="font-size:13px;color:#56627A">Ce lien est valable 1 heure. Si vous n'avez pas fait cette demande, ignorez cet e-mail.</p>
        <p style="margin-top:32px;color:#56627A">À bientôt,<br><strong>L'équipe Synégo</strong></p>
      </div>
    </div>`,
  });
}

export async function sendFacturePdfEmail(data: {
  to: string;
  prenom: string;
  factureNum: string;
  prestationNom: string;
  duree: number;
  nbSeances: number;
  prixParSeance: number;
  total: number;
  factureDate: string;
  pdfBuffer: Buffer;
}) {
  if (!isConfigured()) return;
  const totalStr = data.total % 1 === 0 ? `${data.total} €` : `${data.total.toFixed(2)} €`;
  await makeTransport().sendMail({
    from: `Synégo <${process.env.EMAIL_FROM || 'noreply@synego.fr'}>`,
    to: data.to,
    subject: `Votre facture Synégo — ${esc(data.factureNum)}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0A1D35">
      <div style="background:#0A1D35;padding:24px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Synégo</h1>
        <p style="color:#6CAED6;margin:4px 0 0">Accompagnement thérapeutique</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E7DCCD;border-top:none;border-radius:0 0 16px 16px">
        <h2 style="margin-top:0">Votre facture</h2>
        <p>Bonjour <strong>${esc(data.prenom)}</strong>,</p>
        <p>Veuillez trouver ci-joint votre facture pour votre accompagnement.</p>
        <div style="background:#F7F2EB;border-radius:12px;padding:20px 24px;margin:20px 0">
          <p style="margin:0 0 6px;font-weight:bold;font-size:15px">${esc(data.prestationNom)}</p>
          <p style="margin:0 0 4px;color:#56627A;font-size:13px">${data.nbSeances} séance${data.nbSeances > 1 ? 's' : ''} · ${data.duree} min chacune</p>
          <p style="margin:10px 0 0;font-size:22px;font-weight:bold;color:#0A1D35">${totalStr}</p>
        </div>
        <p style="font-size:13px;color:#56627A">Facture émise le <strong>${esc(data.factureDate)}</strong>.</p>
        <p style="font-size:12px;color:#9BA8B8;margin-top:4px">Réf. ${esc(data.factureNum)}</p>
        <p style="margin-top:32px;color:#56627A">À bientôt,<br><strong>L'équipe Synégo</strong></p>
      </div>
    </div>`,
    attachments: [{
      filename: `facture-${data.factureNum}.pdf`,
      content: data.pdfBuffer,
      contentType: 'application/pdf',
    }],
  });
}

export async function sendReminderEmail(to: string, prenom: string, rdv: RdvInfo) {
  if (!isConfigured()) return;
  const dateStr = format(new Date(rdv.debut), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });
  const seanceNom = rdv.prestation?.nom || rdv.titre || 'Séance';

  await makeTransport().sendMail({
    from: `Synégo <${process.env.EMAIL_FROM || 'noreply@synego.fr'}>`,
    to,
    subject: `Rappel – Votre séance demain à ${format(new Date(rdv.debut), 'HH:mm')}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0A1D35">
      <div style="background:#0A1D35;padding:24px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Synégo</h1>
        <p style="color:#6CAED6;margin:4px 0 0">Accompagnement thérapeutique</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E7DCCD;border-top:none;border-radius:0 0 16px 16px">
        <h2 style="margin-top:0">Rappel de votre rendez-vous</h2>
        <p>Bonjour <strong>${esc(prenom)}</strong>,</p>
        <p>Rappel : votre séance <strong>${esc(seanceNom)}</strong> a lieu demain :</p>
        <div style="background:#F7F2EB;border-radius:12px;padding:16px 20px;margin:20px 0">
          <p style="margin:0;font-size:18px;font-weight:bold">${esc(dateStr)}</p>
        </div>
        ${rdv.lien_meet ? `
        <a href="${esc(rdv.lien_meet)}" style="display:inline-block;background:#6CAED6;color:#0A1D35;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold">
          Rejoindre la séance
        </a>` : ''}
        <p style="margin-top:32px;color:#56627A">À bientôt,<br><strong>L'équipe Synégo</strong></p>
      </div>
    </div>`,
  });
}
