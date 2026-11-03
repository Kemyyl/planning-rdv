import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RdvInfo {
  debut: string;
  fin?: string;
  prestation?: { nom: string };
  lien_meet?: string;
  jeton_annulation?: string;
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
  const cancelUrl = rdv.jeton_annulation ? `${appUrl}/mes-rdv?jeton=${rdv.jeton_annulation}` : '';

  await makeTransport().sendMail({
    from: process.env.EMAIL_FROM || 'noreply@synego.fr',
    to,
    subject: `Confirmation – ${rdv.prestation?.nom || 'Séance'}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0A1D35">
      <div style="background:#0A1D35;padding:24px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Synégo</h1>
        <p style="color:#6CAED6;margin:4px 0 0">Accompagnement thérapeutique</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E7DCCD;border-top:none;border-radius:0 0 16px 16px">
        <h2 style="margin-top:0">Votre rendez-vous est confirmé ✓</h2>
        <p>Bonjour <strong>${prenom}</strong>,</p>
        <p>Votre séance <strong>${rdv.prestation?.nom}</strong> est confirmée :</p>
        <div style="background:#F7F2EB;border-radius:12px;padding:16px 20px;margin:20px 0">
          <p style="margin:0;font-size:18px;font-weight:bold">${dateStr}</p>
        </div>
        ${rdv.lien_meet ? `
        <p style="margin-bottom:8px">Lien pour rejoindre la séance :</p>
        <a href="${rdv.lien_meet}" style="display:inline-block;background:#6CAED6;color:#0A1D35;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold">
          Rejoindre la séance
        </a>` : ''}
        ${cancelUrl ? `<p style="margin-top:24px;font-size:13px;color:#56627A">
          Vous pouvez <a href="${cancelUrl}" style="color:#56627A">annuler gratuitement jusqu'à 24h avant</a>.
        </p>` : ''}
        <p style="margin-top:32px;color:#56627A">À bientôt,<br><strong>L'équipe Synégo</strong></p>
      </div>
    </div>`,
  });
}

export async function sendInviteEmail(to: string, prenom: string, inviteUrl: string) {
  if (!isConfigured()) return;
  await makeTransport().sendMail({
    from: process.env.EMAIL_FROM || 'noreply@synego.fr',
    to,
    subject: 'Bienvenue sur Synégo – Activez votre compte',
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0A1D35">
      <div style="background:#0A1D35;padding:24px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Synégo</h1>
        <p style="color:#6CAED6;margin:4px 0 0">Accompagnement thérapeutique</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E7DCCD;border-top:none;border-radius:0 0 16px 16px">
        <h2 style="margin-top:0">Bienvenue, ${prenom} !</h2>
        <p>Un compte a été créé pour vous sur Synégo.</p>
        <p>Cliquez sur le bouton ci-dessous pour définir votre mot de passe et accéder à votre espace :</p>
        <div style="margin:24px 0">
          <a href="${inviteUrl}" style="display:inline-block;background:#0A1D35;color:white;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px">
            Activer mon compte
          </a>
        </div>
        <p style="font-size:13px;color:#56627A">Ce lien est valable 7 jours. Si vous n'avez pas demandé ce compte, ignorez cet e-mail.</p>
        <p style="margin-top:32px;color:#56627A">À bientôt,<br><strong>L'équipe Synégo</strong></p>
      </div>
    </div>`,
  });
}

export async function sendReminderEmail(to: string, prenom: string, rdv: RdvInfo) {
  if (!isConfigured()) return;
  const dateStr = format(new Date(rdv.debut), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr });

  await makeTransport().sendMail({
    from: process.env.EMAIL_FROM || 'noreply@synego.fr',
    to,
    subject: `Rappel – Votre séance demain à ${format(new Date(rdv.debut), 'HH:mm')}`,
    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#0A1D35">
      <div style="background:#0A1D35;padding:24px 32px;border-radius:16px 16px 0 0">
        <h1 style="color:white;margin:0;font-size:22px">Synégo</h1>
        <p style="color:#6CAED6;margin:4px 0 0">Accompagnement thérapeutique</p>
      </div>
      <div style="background:white;padding:32px;border:1px solid #E7DCCD;border-top:none;border-radius:0 0 16px 16px">
        <h2 style="margin-top:0">Rappel de votre rendez-vous</h2>
        <p>Bonjour <strong>${prenom}</strong>,</p>
        <p>Rappel : votre séance <strong>${rdv.prestation?.nom}</strong> a lieu demain :</p>
        <div style="background:#F7F2EB;border-radius:12px;padding:16px 20px;margin:20px 0">
          <p style="margin:0;font-size:18px;font-weight:bold">${dateStr}</p>
        </div>
        ${rdv.lien_meet ? `
        <a href="${rdv.lien_meet}" style="display:inline-block;background:#6CAED6;color:#0A1D35;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold">
          Rejoindre la séance
        </a>` : ''}
        <p style="margin-top:32px;color:#56627A">À bientôt,<br><strong>L'équipe Synégo</strong></p>
      </div>
    </div>`,
  });
}
