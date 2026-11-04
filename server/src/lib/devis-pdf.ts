import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';

export const LOGO_PATH = (() => {
  const candidates = [
    path.resolve(__dirname, '../../../client/public/logo.png'),
    path.resolve(__dirname, '../../../../client/public/logo.png'),
    path.resolve(process.cwd(), 'client/public/logo.png'),
    path.resolve(process.cwd(), '../client/public/logo.png'),
  ];
  return candidates.find(p => fs.existsSync(p)) ?? null;
})();

export function generateDevisPdf(data: {
  devisNum: string; prenom: string; nom: string; email: string;
  prestationNom: string; duree: number; nbSeances: number;
  prixParSeance: number; total: number; notes?: string;
  validiteDate: string; emissionDate: string; isFacture?: boolean;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 50; const R = 545; const W = 495;
    const navy = '#0A1D35'; const blue = '#6CAED6';
    const grey = '#56627A'; const light = '#E7DCCD'; const bg = '#F7F2EB';
    const totalStr = data.total % 1 === 0 ? `${data.total} €` : `${data.total.toFixed(2)} €`;
    const prixStr = data.prixParSeance % 1 === 0 ? `${data.prixParSeance} €` : `${data.prixParSeance.toFixed(2)} €`;

    // ── Header ─────────────────────────────────────────────
    doc.rect(L, 40, W, 68).fill(navy);

    // Logo (white bg square so dark logo is visible)
    if (LOGO_PATH) {
      doc.rect(L + 14, 51, 36, 36).fill('white');
      doc.image(LOGO_PATH, L + 15, 52, { width: 34, height: 34 });
      doc.fontSize(20).fillColor('white').text('Synégo', L + 58, 56, { lineBreak: false });
      doc.fontSize(10).fillColor(blue).text('Accompagnement thérapeutique', L + 58, 80, { lineBreak: false });
    } else {
      doc.fontSize(20).fillColor('white').text('Synégo', L + 20, 56, { lineBreak: false });
      doc.fontSize(10).fillColor(blue).text('Accompagnement thérapeutique', L + 20, 80, { lineBreak: false });
    }

    doc.fontSize(11).fillColor('white').text(data.isFacture ? 'FACTURE' : 'DEVIS', L, 56, { width: W - 20, align: 'right', lineBreak: false });
    doc.fontSize(8).fillColor(blue).text(data.devisNum, L, 72, { width: W - 20, align: 'right', lineBreak: false });

    // ── Destinataire + dates ───────────────────────────────
    const y1 = 128;
    doc.fontSize(7).fillColor(grey).text('DESTINATAIRE', L, y1, { lineBreak: false });
    doc.fontSize(14).fillColor(navy).text(`${data.prenom} ${data.nom}`, L, y1 + 13, { lineBreak: false });
    doc.fontSize(10).fillColor(grey).text(data.email, L, y1 + 32, { lineBreak: false });

    doc.fontSize(7).fillColor(grey).text('ÉMIS LE', L, y1, { width: W, align: 'right', lineBreak: false });
    doc.fontSize(10).fillColor(navy).text(data.emissionDate, L, y1 + 13, { width: W, align: 'right', lineBreak: false });
    if (!data.isFacture) {
      doc.fontSize(7).fillColor(grey).text("VALABLE JUSQU'AU", L, y1 + 30, { width: W, align: 'right', lineBreak: false });
      doc.fontSize(10).fillColor(navy).text(data.validiteDate, L, y1 + 43, { width: W, align: 'right', lineBreak: false });
    }

    // ── Separator ─────────────────────────────────────────
    doc.moveTo(L, 192).lineTo(R, 192).strokeColor(light).lineWidth(1).stroke();

    // ── Table label ────────────────────────────────────────
    doc.fontSize(7).fillColor(grey).text('DÉTAIL DES PRESTATIONS', L, 208, { lineBreak: false });

    const th = 226;
    doc.rect(L, th, W, 26).fill(bg);
    doc.fontSize(7).fillColor(grey);
    doc.text('PRESTATION', L + 10, th + 10, { lineBreak: false });
    doc.text('DURÉE', L + 230, th + 10, { lineBreak: false });
    doc.text('SÉANCES', L + 310, th + 10, { lineBreak: false });
    doc.text('TOTAL', L, th + 10, { width: W - 10, align: 'right', lineBreak: false });

    const tr = th + 26;
    doc.moveTo(L, tr).lineTo(R, tr).strokeColor(light).lineWidth(0.5).stroke();
    doc.fontSize(11).fillColor(navy).text(data.prestationNom, L + 10, tr + 10, { width: 210, lineBreak: false });
    doc.fontSize(10).fillColor(grey);
    doc.text(`${data.duree} min`, L + 230, tr + 10, { lineBreak: false });
    doc.text(`${data.nbSeances}`, L + 310, tr + 10, { lineBreak: false });
    doc.fontSize(11).fillColor(navy).text(totalStr, L, tr + 10, { width: W - 10, align: 'right', lineBreak: false });

    const sep2 = tr + 38;
    doc.moveTo(L, sep2).lineTo(R, sep2).strokeColor(light).lineWidth(1).stroke();

    const tbX = R - 185; const tbY = sep2 + 14; const tbH = 44;
    doc.rect(tbX, tbY, 185, tbH).fill(navy);
    doc.fontSize(9).fillColor(blue).text('TOTAL TTC', tbX + 14, tbY + 9, { lineBreak: false });
    doc.fontSize(17).fillColor('white').text(totalStr, tbX, tbY + 7, { width: 175, align: 'right', lineBreak: false });
    doc.fontSize(9).fillColor(grey).text(`Prix unitaire : ${prixStr} / séance`, tbX, tbY + tbH + 10, { width: 185, align: 'right', lineBreak: false });

    if (data.notes?.trim()) {
      const notesY = tbY + tbH + 50;
      doc.moveTo(L, notesY).lineTo(R, notesY).strokeColor(light).lineWidth(1).stroke();
      doc.fontSize(7).fillColor(grey).text('NOTES', L, notesY + 16, { lineBreak: false });
      doc.fontSize(10).fillColor(navy).text(data.notes.trim(), L, notesY + 30, { width: W });
    }

    doc.moveTo(L, 762).lineTo(R, 762).strokeColor(light).lineWidth(1).stroke();
    doc.fontSize(8).fillColor('#9BA8B8')
      .text(`Synégo — Accompagnement thérapeutique — Document généré le ${data.emissionDate}`, L, 772, { width: W, align: 'center', lineBreak: false });

    doc.end();
  });
}
