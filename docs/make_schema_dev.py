"""Génère l'architecture applicative (dev) en SVG et en .drawio."""
from xml.sax.saxutils import escape
import html

NAVY, IVORY, LIGHT, CHAMP, DIAM, GREY = "#0A1D35", "#F2E8DC", "#6CAED6", "#D9C9B4", "#D0E7F5", "#4A5A70"
W, H = 1600, 1120

ZONES = [
    ("z_front", 30, 100, 440, 710, "FRONT · REACT + TYPESCRIPT (VITE)", DIAM, LIGHT),
    ("z_back", 520, 100, 540, 710, "BACK · NODE.JS + TYPESCRIPT (EXPRESS)", "#FFFFFF", NAVY),
    ("z_data", 1110, 100, 460, 560, "DONNÉES · POSTGRESQL", IVORY, NAVY),
    ("z_ext", 1110, 700, 460, 270, "SERVICES EXTERNES", "#F7F1E8", CHAMP),
]

# id, x, y, w, h, titre, lignes
BOXES = [
    ("pub", 55, 145, 390, 135, "Pages publiques", ["Prise de rendez-vous (prestation, date, créneau)", "Confirmation", "Mon rendez-vous (consulter, annuler)", "Signaler un problème (ticket)"]),
    ("adm", 55, 300, 390, 155, "Espace administrateur", ["Connexion", "Planning jour / semaine", "Clients et historique", "Prestations et horaires d'ouverture", "Tickets"]),
    ("ui", 55, 475, 390, 115, "Composants UI", ["Calendrier, liste de créneaux, formulaires", "Thème : couleurs et typo de la charte", "Responsive, mobile d'abord"]),
    ("router", 55, 610, 390, 70, "Routage", ["React Router : routes publiques et routes admin protégées"]),
    ("apic", 55, 700, 390, 90, "Client API", ["Appels fetch vers /api", "Gestion du jeton admin et des erreurs"]),
    ("routes", 545, 145, 490, 90, "Routes", ["/api/public : prestations, créneaux, RDV, tickets", "/api/admin : planning, clients, réglages, tickets"]),
    ("mw", 545, 255, 490, 90, "Middlewares", ["Validation des données (Zod)", "Authentification admin (JWT), gestion des erreurs"]),
    ("ctrl", 545, 365, 490, 70, "Contrôleurs", ["Lisent la requête, appellent le service, renvoient le JSON"]),
    ("svc", 545, 455, 490, 135, "Services (règles métier)", ["Créneaux : calcul des disponibilités", "Rendez-vous : réservation sans doublon, annulation", "Clients, prestations, horaires, tickets", "Agenda (Google) et e-mails"]),
    ("repo", 545, 610, 490, 90, "Accès aux données", ["Requêtes SQL par table (repositories)", "Compte de base aux droits limités"]),
    ("jobs", 545, 720, 490, 70, "Tâches planifiées", ["Rappel J-1 par e-mail, purge RGPD des anciennes données"]),
    ("t_cli", 1135, 145, 200, 110, "clients", ["id, nom, prénom", "email, téléphone", "date de consentement"]),
    ("t_pre", 1350, 145, 200, 110, "prestations", ["id, nom", "description", "durée (minutes)"]),
    ("t_rdv", 1135, 275, 415, 110, "rendez_vous", ["id, client_id, prestation_id, début, fin", "statut (confirmé / annulé), commentaire", "google_event_id, jeton d'annulation"]),
    ("t_hor", 1135, 405, 200, 95, "horaires", ["jour de la semaine", "ouverture, fermeture"]),
    ("t_adm", 1350, 405, 200, 95, "admins", ["id, email", "mot de passe haché"]),
    ("t_tic", 1135, 520, 415, 110, "tickets", ["id, auteur, email, sujet, message", "statut (ouvert / en cours / clos)", "dates de création et de mise à jour"]),
    ("gcal", 1135, 745, 415, 80, "Google Calendar API", ["Création, modification et lecture des créneaux occupés"]),
    ("smtp", 1135, 860, 415, 80, "Service d'e-mails (SMTP)", ["Confirmation, rappel, annulation, suivi des tickets"]),
    ("shared", 30, 835, 1005, 105, "shared/ · types TypeScript communs au front et au back", ["RendezVous, Client, Prestation, Creneau, Ticket, schémas de validation", "Un seul endroit pour les formats de données : le front et le back restent synchronisés"]),
]

EDGES = [
    ([(445, 745), (495, 745), (495, 190), (545, 190)], "HTTP / JSON", (495, 470), "pub"),
    ([(790, 235), (790, 255)], "", None, "flow"),
    ([(790, 345), (790, 365)], "", None, "flow"),
    ([(790, 435), (790, 455)], "", None, "flow"),
    ([(790, 590), (790, 610)], "", None, "flow"),
    ([(1035, 655), (1085, 655), (1085, 330), (1135, 330)], "SQL", (1085, 495), "flow"),
    ([(1035, 540), (1070, 540), (1070, 785), (1135, 785)], "", None, "out"),
    ([(1035, 755), (1055, 755), (1055, 900), (1135, 900)], "", None, "out"),
]

STYLE = {"pub": (LIGHT, ""), "flow": (NAVY, ""), "out": ("#A8926F", "")}


def svg():
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Inter, DejaVu Sans, sans-serif">', '<defs>']
    for k, (c, _) in STYLE.items():
        o.append(f'<marker id="a_{k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>')
    o += ['</defs>', f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>',
          f'<text x="30" y="52" font-size="28" font-weight="700" fill="{NAVY}">Architecture applicative · Planning RDV</text>',
          f'<text x="30" y="80" font-size="15" fill="{GREY}">Organisation du code (front, back, base de données) · Mise à jour : 02/11/2026</text>']
    for _, x, y, w, h, t, fill, stroke in ZONES:
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{fill}" stroke="{stroke}" stroke-width="2"/>')
        o.append(f'<text x="{x+16}" y="{y+28}" font-size="13" font-weight="700" letter-spacing="1" fill="{NAVY}">{escape(t)}</text>')
    for pts, lab, lp, k in EDGES:
        c, _ = STYLE[k]
        p = " ".join(f"{x},{y}" for x, y in pts)
        o.append(f'<polyline points="{p}" fill="none" stroke="{c}" stroke-width="2.5" marker-end="url(#a_{k})"/>')
        if lab:
            tw = len(lab) * 7.5 + 14
            o.append(f'<rect x="{lp[0]-tw/2}" y="{lp[1]-13}" width="{tw}" height="22" rx="4" fill="#FFFFFF" stroke="{c}"/>')
            o.append(f'<text x="{lp[0]}" y="{lp[1]+3}" text-anchor="middle" font-size="12" font-weight="700" fill="{NAVY}">{escape(lab)}</text>')
    for i, x, y, w, h, t, lines in BOXES:
        table = i.startswith("t_")
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#FFFFFF" stroke="{NAVY}" stroke-width="2"/>')
        if table:
            o.append(f'<path d="M{x},{y+32} H{x+w}" stroke="{NAVY}" stroke-width="1.5"/>')
            o.append(f'<path d="M{x+10},{y} H{x+w-10} A10,10 0 0 1 {x+w},{y+10} V{y+32} H{x} V{y+10} A10,10 0 0 1 {x+10},{y} Z" fill="{NAVY}"/>')
            o.append(f'<text x="{x+12}" y="{y+22}" font-size="14" font-weight="700" fill="#FFFFFF" font-family="DejaVu Sans Mono, monospace">{escape(t)}</text>')
            ty = y + 52
        else:
            o.append(f'<text x="{x+14}" y="{y+24}" font-size="15" font-weight="700" fill="{NAVY}">{escape(t)}</text>')
            ty = y + 46
        for ln in lines:
            o.append(f'<text x="{x+14}" y="{ty}" font-size="12.5" fill="{GREY}">{escape(ln)}</text>')
            ty += 19
    ly = 1030
    o.append(f'<text x="30" y="{ly+5}" font-size="13" font-weight="700" fill="{NAVY}">LÉGENDE</text>')
    x = 120
    for k, lab in [("pub", "Appel du front vers l'API"), ("flow", "Ordre de traitement d'une requête dans le back"), ("out", "Appel vers un service externe")]:
        c, _ = STYLE[k]
        o.append(f'<line x1="{x}" y1="{ly}" x2="{x+40}" y2="{ly}" stroke="{c}" stroke-width="2.5" marker-end="url(#a_{k})"/>')
        o.append(f'<text x="{x+52}" y="{ly+5}" font-size="13" fill="{NAVY}">{escape(lab)}</text>')
        x += 90 + len(lab) * 7.2
    o.append(f'<text x="30" y="{ly+40}" font-size="13" fill="{GREY}">Les flèches entre les tables ne sont pas tracées : rendez_vous référence clients et prestations.</text>')
    o.append('</svg>')
    return "\n".join(o)


def drawio():
    a = lambda s: html.escape(s, quote=True)
    cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    for i, x, y, w, h, t, fill, stroke in ZONES:
        st = f"rounded=1;arcSize=3;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};strokeWidth=2;verticalAlign=top;align=left;spacingLeft=12;spacingTop=6;fontStyle=1;fontColor={NAVY};"
        cells.append(f'<mxCell id="{i}" value="{a(t)}" style="{st}" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
    for i, x, y, w, h, t, lines in BOXES:
        v = a(f"<b>{escape(t)}</b><br><font color='{GREY}' style='font-size:11px'>" + "<br>".join(escape(l) for l in lines) + "</font>")
        cells.append(f'<mxCell id="{i}" value="{v}" style="rounded=1;arcSize=6;whiteSpace=wrap;html=1;align=left;verticalAlign=top;spacingLeft=10;spacingTop=4;fillColor=#FFFFFF;strokeColor={NAVY};strokeWidth=2;fontColor={NAVY};" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
    for n, (pts, lab, _, k) in enumerate(EDGES):
        c, _ = STYLE[k]
        mid = "".join(f'<mxPoint x="{x}" y="{y}"/>' for x, y in pts[1:-1])
        arr = f'<Array as="points">{mid}</Array>' if mid else ""
        cells.append(f'<mxCell id="e{n}" value="{a(lab)}" style="endArrow=block;endFill=1;html=1;strokeColor={c};strokeWidth=2.5;fontColor={NAVY};labelBackgroundColor=#FFFFFF;" edge="1" parent="1"><mxGeometry relative="1" as="geometry">'
                     f'<mxPoint x="{pts[0][0]}" y="{pts[0][1]}" as="sourcePoint"/><mxPoint x="{pts[-1][0]}" y="{pts[-1][1]}" as="targetPoint"/>{arr}</mxGeometry></mxCell>')
    cells.append(f'<mxCell id="title" value="Architecture applicative · Planning RDV" style="text;html=1;fontSize=24;fontStyle=1;fontColor={NAVY};align=left;" vertex="1" parent="1"><mxGeometry x="30" y="25" width="700" height="40" as="geometry"/></mxCell>')
    return ('<mxfile host="app.diagrams.net"><diagram name="Architecture dev"><mxGraphModel dx="1600" dy="1120" grid="1" gridSize="10" page="1" pageWidth="1600" pageHeight="1120"><root>'
            + "".join(cells) + "</root></mxGraphModel></diagram></mxfile>")


if __name__ == "__main__":
    open("architecture-dev.svg", "w").write(svg())
    open("architecture-dev.drawio", "w").write(drawio())
