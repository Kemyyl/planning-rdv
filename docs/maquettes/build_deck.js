const pptxgen = require("pptxgenjs");
const { applyTheme } = require("/root/.claude/skills/synced/3716dea9-784a-44dc-8f63-689002f01293_74b5995a-8a7c-4532-8fa8-12574f5705d3/pptx/scripts/apply_theme.js");

const THEME = {
  name: "Planning RDV",
  headFontFace: "Calibri",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "0A1D35", lt1: "FFFFFF", dk2: "1C3352", lt2: "F7F2EB",
    accent1: "6CAED6", accent2: "D9C9B4", accent3: "D0E7F5", accent4: "1E6B4A",
    accent5: "56627A", accent6: "F2E8DC", hlink: "1C3352", folHlink: "56627A",
  },
};

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
pres.title = "Maquettes Planning RDV";
pres.author = "Équipe projet Planning RDV";
pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace };
const C = pres.SchemeColor;

// Layouts
pres.defineSlideMaster({
  title: "COVER",
  background: { color: C.text1 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.8, y: 2.6, w: 8.2, h: 1.6, fontSize: 48, bold: true, color: C.background1, valign: "bottom", align: "left", margin: 0 }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.8, y: 4.35, w: 8.2, h: 1.0, fontSize: 20, color: C.accent2, valign: "top", align: "left", margin: 0 }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "SCREEN",
  background: { color: C.background2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.6, y: 0.35, w: 12.1, h: 0.8, fontSize: 32, bold: true, color: C.text1, valign: "middle", align: "left", margin: 0 }, text: "" } },
    { text: { text: "Maquettes Planning RDV · v1 · 02/11/2026", options: { x: 0.6, y: 7.0, w: 6, h: 0.3, fontSize: 10, color: C.accent5, margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.0, w: 0.5, h: 0.3, fontSize: 10, color: C.accent5, align: "right" },
});

const shadow = () => ({ type: "outer", color: "0A1D35", opacity: 0.12, blur: 12, offset: 3, angle: 90 });

// Frame an image (px dims) into a box, keeping its ratio; returns placed rect.
function placeImage(slide, path, pxW, pxH, box, name) {
  const r = pxW / pxH;
  let w = box.w, h = box.w / r;
  if (h > box.h) { h = box.h; w = h * r; }
  const x = box.x + (box.w - w) / 2, y = box.y + (box.h - h) / 2;
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, rectRadius: 0.12, fill: { color: C.background1 }, line: { color: "E7DCCD", width: 0.75 }, shadow: shadow(), objectName: name + " cadre" });
  slide.addImage({ path, x, y, w, h, altText: name, objectName: name });
  return { x, y, w, h };
}

// Right-hand commentary: eyebrow + numbered points
function addNotesColumn(slide, x, y, w, eyebrow, points) {
  slide.addText(eyebrow.toUpperCase(), { x, y, w, h: 0.35, fontSize: 12, bold: true, color: C.accent5, charSpacing: 1.5, margin: 0, isTextBox: true, objectName: "Intertitre" });
  let cy = y + 0.55;
  points.forEach((p, i) => {
    slide.addShape(pres.shapes.OVAL, { x, y: cy, w: 0.42, h: 0.42, fill: { color: C.text1 }, line: { type: "none" }, objectName: `Pastille ${i + 1}` });
    slide.addText(String(i + 1), { x, y: cy, w: 0.42, h: 0.42, fontSize: 14, bold: true, color: C.background1, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: `Numéro ${i + 1}` });
    slide.addText([
      { text: p[0], options: { bold: true, fontSize: 16, color: C.text1, breakLine: true } },
      { text: p[1], options: { fontSize: 14, color: C.text2 } },
    ], { x: x + 0.6, y: cy - 0.05, w: w - 0.6, h: 1.15, valign: "top", margin: 0, paraSpaceAfter: 4, isTextBox: true, objectName: `Point ${i + 1}` });
    cy += 1.35;
  });
}

// 1. Couverture
pres.addSection({ title: "Introduction" });
let s = pres.addSlide({ masterName: "COVER", sectionTitle: "Introduction" });
s.addShape(pres.shapes.OVAL, { x: 9.35, y: 1.75, w: 3.5, h: 3.5, fill: { color: C.background2 }, line: { type: "none" }, objectName: "Fond du logo" });
s.addImage({ path: "logo.png", x: 9.6, y: 2.0, w: 3.0, h: 3.0, altText: "Logo : diamant dans un cadran d'horloge", objectName: "Logo" });
s.addText("Maquettes du site de prise de rendez-vous", { placeholder: "title" });
s.addText("Parcours client et espace administrateur · version 1 · 2 novembre 2026", { placeholder: "body" });
s.addNotes("Présentation des maquettes v1 au client. Le PO (Dylan) présente, l'équipe commente les choix.");

// 2. Parti pris
s = pres.addSlide({ masterName: "SCREEN", sectionTitle: "Introduction" });
s.addText("Un site simple, rapide et à vos couleurs", { placeholder: "title" });
const principles = [
  ["Réserver sur une seule page", "Prestation, jour, horaire et coordonnées s'enchaînent sans changer d'écran."],
  ["De grands boutons lisibles", "Jours et horaires en grandes cases, faciles à repérer et à cliquer."],
  ["Le récapitulatif reste visible", "Le client voit toujours ce qu'il réserve avant de confirmer."],
];
addNotesColumn(s, 0.6, 1.55, 6.2, "Nos trois principes", principles);
s.addText("PALETTE DE LA CHARTE", { x: 7.4, y: 1.55, w: 5.3, h: 0.35, fontSize: 12, bold: true, color: C.accent5, charSpacing: 1.5, margin: 0, isTextBox: true, objectName: "Intertitre palette" });
const swatches = [["0A1D35", "Bleu profond", "Textes, boutons"], ["F2E8DC", "Ivoire", "Fonds"], ["6CAED6", "Bleu clair", "Champs actifs"], ["D9C9B4", "Champagne", "Accents"], ["D0E7F5", "Bleu diamant", "Sélection"]];
swatches.forEach((sw, i) => {
  const y = 2.1 + i * 0.82;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.4, y, w: 0.65, h: 0.65, rectRadius: 0.1, fill: { color: sw[0] }, line: { color: "D9C9B4", width: 0.75 }, objectName: `Pastille ${sw[1]}` });
  s.addText([{ text: sw[1], options: { bold: true, fontSize: 15, color: C.text1, breakLine: true } }, { text: `#${sw[0]} · ${sw[2]}`, options: { fontSize: 12, color: C.accent5 } }], { x: 8.25, y: y - 0.02, w: 4.4, h: 0.7, valign: "middle", margin: 0, isTextBox: true, objectName: `Couleur ${sw[1]}` });
});
s.addNotes("Les couleurs viennent de la charte graphique du client. Le bleu clair sert uniquement de signal (champ actif), jamais pour du texte, pour garder un bon contraste.");

// Écrans
const screens = [
  { sec: "Parcours client", title: "Réservation : tout se fait sur une page", img: "01-reservation.png", px: [2880, 2600], eyebrow: "Ce que voit le client", pts: [
    ["Choisir la prestation", "Trois cartes claires avec la durée. La sélection est cochée."],
    ["Choisir le jour et l'heure", "Les jours affichent le nombre de places libres ; complets et fermés sont barrés."],
    ["Confirmer", "Quatre champs seulement, puis le bouton dans le récapitulatif."],
  ], notes: "Écran principal. Démo : un rendez-vous pris en moins d'une minute. Les créneaux occupés dans Google Agenda sont automatiquement barrés." },
  { sec: "Parcours client", title: "Si le créneau vient d'être pris", img: "13-creneau-pris.png", px: [2880, 2000], eyebrow: "Aucune mauvaise surprise", pts: [
    ["Message clair", "Le client comprend tout de suite ce qui s'est passé."],
    ["Horaires proches proposés", "Les créneaux libres les plus proches sont mis en avant."],
    ["Jamais deux clients au même horaire", "Le site bloque la double réservation."],
  ], notes: "Cas où deux personnes réservent le même créneau en même temps : le second voit ce message au lieu d'une erreur." },
  { sec: "Parcours client", title: "Confirmation immédiate", img: "02-confirmation.png", px: [2880, 1640], eyebrow: "Après la réservation", pts: [
    ["Message rassurant", "Le client sait tout de suite que c'est réservé et où arrive l'e-mail."],
    ["Ajouter à son agenda", "Un clic pour l'enregistrer sur son téléphone ou son ordinateur."],
    ["Modifier ou annuler", "Sans appeler, avec le même lien que dans l'e-mail."],
  ], notes: "Écran de confirmation. Le même récapitulatif est envoyé par e-mail avec un lien d'annulation." },
  { sec: "Parcours client", title: "L'e-mail de confirmation", img: "11-email.png", px: [2880, 1640], eyebrow: "Dans la boîte du client", pts: [
    ["Aux couleurs de l'enseigne", "Logo, couleurs et récapitulatif du rendez-vous."],
    ["Ajouter à son agenda", "Le rendez-vous s'ajoute en un clic."],
    ["Modifier ou annuler", "Un lien direct, sans créer de compte."],
  ], notes: "Envoyé automatiquement après chaque réservation. Un rappel du même style part la veille." },
  { sec: "Parcours client", title: "Annuler en deux clics", img: "12-annulation.png", px: [2880, 1640], eyebrow: "Côté client", pts: [
    ["Proposer d'abord un autre horaire", "Le client peut déplacer au lieu d'annuler."],
    ["Confirmation explicite", "Le bouton rouge évite les annulations par erreur."],
    ["Créneau libéré aussitôt", "Il redevient disponible pour d'autres clients."],
  ], notes: "L'annulation libère le créneau sur le site et dans Google Agenda." },
  { sec: "Espace administrateur", title: "Connexion à l'espace pro", img: "08-admin-connexion.png", px: [2880, 1800], eyebrow: "Accès réservé", pts: [
    ["Seulement pour votre équipe", "Les clients n'ont jamais accès à cet espace."],
    ["Message d'erreur utile", "On sait quoi faire si le mot de passe est faux."],
    ["Mot de passe oublié", "Réinitialisation par e-mail."],
  ], notes: "Accès admin protégé (mot de passe chiffré, connexion HTTPS)." },
  { sec: "Espace administrateur", title: "Planning de la semaine", img: "05-admin-planning.png", px: [2880, 1920], eyebrow: "Pour l'équipe", pts: [
    ["Vue semaine, jour ou liste", "Chaque prestation a sa couleur ; la ligne rouge indique l'heure actuelle."],
    ["Relié à votre Google Agenda", "Vos absences notées dans l'agenda bloquent les créneaux."],
    ["Prochain rendez-vous", "Le client suivant et les nouveautés, toujours à droite."],
  ], notes: "Écran d'accueil de l'espace pro, accessible uniquement après connexion." },
  { sec: "Espace administrateur", title: "Ajouter un rendez-vous pris par téléphone", img: "10-admin-nouveau-rdv.png", px: [2880, 1920], eyebrow: "Pour l'équipe", pts: [
    ["Client retrouvé en tapant son nom", "Ou création d'une nouvelle fiche."],
    ["Disponibilité vérifiée", "Le site confirme que le créneau est libre, agenda compris."],
    ["Aperçu dans le planning", "Le futur rendez-vous apparaît en pointillés."],
  ], notes: "Pour les rendez-vous pris au téléphone ou sur place : ils apparaissent aussi dans Google Agenda." },
  { sec: "Espace administrateur", title: "Fiche client et historique", img: "06-admin-clients.png", px: [2880, 1920], eyebrow: "Base de données clients", pts: [
    ["Recherche rapide", "Par nom, e-mail ou téléphone."],
    ["Historique complet", "Tous les rendez-vous passés et à venir, avec leur statut."],
    ["Informations protégées", "Seule votre équipe peut les consulter, avec l'accord du client."],
  ], notes: "Les données clients ne sont accessibles qu'à l'équipe (accès par VPN côté technique), conformément au RGPD." },
  { sec: "Espace administrateur", title: "Prestations et horaires", img: "09-admin-prestations.png", px: [2880, 1920], eyebrow: "Vous gardez la main", pts: [
    ["Prestations modifiables", "Ajouter, renommer, changer la durée ou masquer."],
    ["Horaires par jour", "Avec la pause de midi ; dimanche fermé."],
    ["Fermetures exceptionnelles", "Congés et formations bloquent les réservations."],
  ], notes: "Tout réglage est enregistré automatiquement et appliqué tout de suite sur le site." },
];

let current = null;
screens.forEach((sc) => {
  if (sc.sec !== current) { pres.addSection({ title: sc.sec }); current = sc.sec; }
  const sl = pres.addSlide({ masterName: "SCREEN", sectionTitle: sc.sec });
  sl.addText(sc.title, { placeholder: "title" });
  const box = { x: 0.7, y: 1.45, w: 8.0, h: 5.35 };
  if (sc.mobile) {
    const h = 5.3, w = h * 780 / 1688;
    placeImage(sl, "03-mobile-reservation.png", 780, 1688, { x: 1.2, y: 1.45, w: w + 0.2, h: 5.35 }, "Mobile réservation");
    placeImage(sl, "04-mobile-rdv.png", 780, 1688, { x: 1.2 + w + 0.9, y: 1.45, w: w + 0.2, h: 5.35 }, "Mobile mon rendez-vous");
  } else {
    placeImage(sl, sc.img, sc.px[0], sc.px[1], box, sc.title);
  }
  addNotesColumn(sl, 9.15, 1.55, 3.6, sc.eyebrow, sc.pts);
  sl.addNotes(sc.notes);
});

// Fin
pres.addSection({ title: "Suite" });
s = pres.addSlide({ masterName: "COVER", sectionTitle: "Suite" });
s.addShape(pres.shapes.OVAL, { x: 9.35, y: 1.75, w: 3.5, h: 3.5, fill: { color: C.background2 }, line: { type: "none" }, objectName: "Fond du logo" });
s.addImage({ path: "logo.png", x: 9.6, y: 2.0, w: 3.0, h: 3.0, altText: "Logo", objectName: "Logo" });
s.addText("Vos retours sur ces maquettes", { placeholder: "title" });
s.addText("Prochaine étape : valider les écrans, puis développer la réservation en ligne", { placeholder: "body" });

(async () => {
  await pres.writeFile({ fileName: "Maquettes_Planning_RDV.pptx" });
  await applyTheme("Maquettes_Planning_RDV.pptx", THEME);
  console.log("ok");
})();
