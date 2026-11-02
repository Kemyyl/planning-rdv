"""Génère le schéma d'architecture en SVG et en .drawio (éditable dans draw.io)."""
from xml.sax.saxutils import escape
import html

NAVY, IVORY, LIGHT, CHAMP, DIAM = "#0A1D35", "#F2E8DC", "#6CAED6", "#D9C9B4", "#D0E7F5"
W, H = 1600, 1060

# Zones : id, x, y, w, h, titre, remplissage, contour, pointillés
ZONES = [
    ("z_net", 30, 100, 300, 860, "INTERNET", DIAM, LIGHT, False),
    ("z_vps", 540, 100, 680, 860, "VPS LINUX (DEBIAN)", "#FFFFFF", NAVY, False),
    ("z_priv", 585, 470, 615, 300, "ZONE PRIVÉE : ACCESSIBLE UNIQUEMENT PAR LE VPN", IVORY, NAVY, True),
    ("z_ext", 1250, 100, 320, 860, "SERVICES EXTERNES", "#F7F1E8", CHAMP, False),
]

# Boîtes : id, x, y, w, h, titre, sous-titre
BOXES = [
    ("visit", 55, 200, 250, 90, "Visiteurs et clients", "Navigateur, mobile ou ordinateur"),
    ("team", 55, 515, 250, 90, "Équipe du client et équipe projet", "Poste équipé du client WireGuard"),
    ("dns", 350, 200, 170, 90, "rdv.exemple.fr", "DNS + certificat HTTPS"),
    ("nginx", 605, 195, 240, 80, "Nginx", "Reverse proxy HTTPS"),
    ("front", 925, 195, 260, 80, "Site React + TypeScript", "Fichiers statiques"),
    ("api", 605, 345, 240, 90, "API Node.js + TypeScript", "RDV, clients, prestations"),
    ("tickets", 925, 345, 260, 90, "Espace de tickets", "Module de l'API"),
    ("wg", 605, 520, 240, 80, "Serveur VPN WireGuard", "Réseau privé 10.8.0.0/24"),
    ("pg", 925, 520, 260, 80, "PostgreSQL", "Écoute sur 127.0.0.1, droits limités"),
    ("ssh", 605, 665, 240, 80, "SSH administration", "Clé uniquement, via le VPN"),
    ("backup", 925, 665, 260, 80, "Sauvegarde automatique", "pg_dump quotidien (cron)"),
    ("monit", 605, 830, 580, 80, "Supervision (Uptime Kuma)", "Surveille le site, l'API et la base de données"),
    ("gcal", 1275, 255, 270, 80, "Google Calendar API", "Création et lecture des créneaux"),
    ("smtp", 1275, 350, 270, 80, "Service d'e-mails (SMTP)", "Confirmations et rappels"),
    ("store", 1275, 665, 270, 80, "Stockage externe", "Copies des sauvegardes"),
    ("alert", 1275, 830, 270, 80, "Alertes à l'équipe", "E-mail en cas de panne"),
]

# Flux : points, libellé, (lx, ly), type ("pub", "priv", "out")
EDGES = [
    ([(305, 245), (350, 245)], "", None, "pub"),
    ([(520, 245), (530, 245), (530, 235), (605, 235)], "HTTPS 443", (568, 222), "pub"),
    ([(845, 235), (925, 235)], "", None, "pub"),
    ([(725, 275), (725, 345)], "/api", (745, 313), "pub"),
    ([(845, 390), (925, 390)], "", None, "pub"),
    ([(805, 435), (805, 460), (1015, 460), (1015, 520)], "SQL en local", (905, 452), "priv"),
    ([(1095, 435), (1095, 520)], "", None, "priv"),
    ([(305, 560), (605, 560)], "WireGuard 51820/UDP", (455, 548), "priv"),
    ([(845, 560), (925, 560)], "admin", (885, 548), "priv"),
    ([(725, 600), (725, 665)], "", None, "priv"),
    ([(1055, 600), (1055, 665)], "dump", (1078, 637), "priv"),
    ([(785, 345), (785, 310), (1230, 310), (1230, 295), (1275, 295)], "agenda", (1010, 302), "out"),
    ([(1185, 390), (1275, 390)], "e-mails", (1230, 380), "out"),
    ([(1185, 705), (1275, 705)], "copie", (1230, 695), "out"),
    ([(1185, 870), (1275, 870)], "alerte", (1230, 860), "out"),
]

STYLE = {"pub": (LIGHT, ""), "priv": (NAVY, "7,5"), "out": ("#A8926F", "")}


def svg():
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Inter, DejaVu Sans, sans-serif">',
         '<defs>']
    for k, (c, _) in STYLE.items():
        o.append(f'<marker id="a_{k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{c}"/></marker>')
    o.append('</defs>')
    o.append(f'<rect width="{W}" height="{H}" fill="#FFFFFF"/>')
    o.append(f'<text x="30" y="52" font-size="28" font-weight="700" fill="{NAVY}">Schéma d\'architecture · Planning RDV</text>')
    o.append(f'<text x="30" y="80" font-size="15" fill="#4A5A70">Mise à jour : 02/11/2026</text>')
    for _, x, y, w, h, t, fill, stroke, dash in ZONES:
        d = ' stroke-dasharray="8,6"' if dash else ""
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="{fill}" stroke="{stroke}" stroke-width="2"{d}/>')
        o.append(f'<text x="{x+16}" y="{y+28}" font-size="13" font-weight="700" letter-spacing="1" fill="{NAVY}">{escape(t)}</text>')
    # pare-feu : bande verticale sur le bord gauche du VPS
    o.append(f'<rect x="548" y="140" width="28" height="800" rx="6" fill="{CHAMP}" stroke="{NAVY}" stroke-width="1.5"/>')
    o.append(f'<text transform="translate(567,400) rotate(-90)" text-anchor="middle" font-size="13" font-weight="700" fill="{NAVY}">PARE-FEU (UFW)</text>')
    o.append(f'<text x="605" y="942" font-size="13" fill="{NAVY}"><tspan font-weight="700">Ports ouverts :</tspan> 80 et 443 (site), 51820/UDP (VPN). Tout le reste est fermé.</text>')
    for pts, lab, lp, k in EDGES:
        c, dash = STYLE[k]
        d = f' stroke-dasharray="{dash}"' if dash else ""
        p = " ".join(f"{x},{y}" for x, y in pts)
        o.append(f'<polyline points="{p}" fill="none" stroke="{c}" stroke-width="2.5"{d} marker-end="url(#a_{k})"/>')
        if lab:
            tw = len(lab) * 7 + 12
            o.append(f'<rect x="{lp[0]-tw/2}" y="{lp[1]-13}" width="{tw}" height="20" rx="4" fill="#FFFFFF" opacity="0.92"/>')
            o.append(f'<text x="{lp[0]}" y="{lp[1]+2}" text-anchor="middle" font-size="12" fill="{NAVY}">{escape(lab)}</text>')
    for _, x, y, w, h, t, s in BOXES:
        o.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="#FFFFFF" stroke="{NAVY}" stroke-width="2"/>')
        o.append(f'<text x="{x+w/2}" y="{y+h/2-4}" text-anchor="middle" font-size="15" font-weight="700" fill="{NAVY}">{escape(t)}</text>')
        o.append(f'<text x="{x+w/2}" y="{y+h/2+16}" text-anchor="middle" font-size="12" fill="#4A5A70">{escape(s)}</text>')
    # légende
    ly = 1000
    items = [("pub", "Flux public (HTTPS)"), ("priv", "Flux privé (VPN ou local au serveur)"), ("out", "Flux sortant vers un service externe")]
    x = 30
    o.append(f'<text x="{x}" y="{ly+5}" font-size="13" font-weight="700" fill="{NAVY}">LÉGENDE</text>')
    x += 90
    for k, lab in items:
        c, dash = STYLE[k]
        d = f' stroke-dasharray="{dash}"' if dash else ""
        o.append(f'<line x1="{x}" y1="{ly}" x2="{x+40}" y2="{ly}" stroke="{c}" stroke-width="2.5"{d} marker-end="url(#a_{k})"/>')
        o.append(f'<text x="{x+52}" y="{ly+5}" font-size="13" fill="{NAVY}">{escape(lab)}</text>')
        x += 60 + len(lab) * 7.4 + 30
    o.append('</svg>')
    return "\n".join(o)


def drawio():
    cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>']
    a = lambda s: html.escape(s, quote=True)
    for i, x, y, w, h, t, fill, stroke, dash in ZONES:
        st = f"rounded=1;arcSize=3;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={stroke};strokeWidth=2;verticalAlign=top;align=left;spacingLeft=12;spacingTop=6;fontStyle=1;fontColor={NAVY};" + ("dashed=1;" if dash else "")
        cells.append(f'<mxCell id="{i}" value="{a(t)}" style="{st}" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
    cells.append(f'<mxCell id="fw" value="PARE-FEU (UFW) : ports 80, 443 et 51820/UDP ouverts, tout le reste fermé" style="rounded=1;whiteSpace=wrap;html=1;fillColor={CHAMP};strokeColor={NAVY};horizontal=0;fontStyle=1;fontColor={NAVY};" vertex="1" parent="1"><mxGeometry x="548" y="140" width="28" height="800" as="geometry"/></mxCell>')
    for i, x, y, w, h, t, s in BOXES:
        v = a(f"<b>{escape(t)}</b><br><font color='#4A5A70' style='font-size:11px'>{escape(s)}</font>")
        cells.append(f'<mxCell id="{i}" value="{v}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor={NAVY};strokeWidth=2;fontColor={NAVY};" vertex="1" parent="1"><mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
    for n, (pts, lab, _, k) in enumerate(EDGES):
        c, dash = STYLE[k]
        st = f"endArrow=block;endFill=1;html=1;strokeColor={c};strokeWidth=2.5;fontColor={NAVY};labelBackgroundColor=#FFFFFF;" + ("dashed=1;" if dash else "")
        mid = "".join(f'<mxPoint x="{x}" y="{y}"/>' for x, y in pts[1:-1])
        arr = f'<Array as="points">{mid}</Array>' if mid else ""
        cells.append(f'<mxCell id="e{n}" value="{a(lab)}" style="{st}" edge="1" parent="1"><mxGeometry relative="1" as="geometry">'
                     f'<mxPoint x="{pts[0][0]}" y="{pts[0][1]}" as="sourcePoint"/><mxPoint x="{pts[-1][0]}" y="{pts[-1][1]}" as="targetPoint"/>{arr}</mxGeometry></mxCell>')
    cells.append(f'<mxCell id="title" value="Schéma d\'architecture · Planning RDV" style="text;html=1;fontSize=24;fontStyle=1;fontColor={NAVY};align=left;" vertex="1" parent="1"><mxGeometry x="30" y="25" width="700" height="40" as="geometry"/></mxCell>')
    return ('<mxfile host="app.diagrams.net"><diagram name="Architecture"><mxGraphModel dx="1600" dy="1060" grid="1" gridSize="10" page="1" pageWidth="1600" pageHeight="1060"><root>'
            + "".join(cells) + "</root></mxGraphModel></diagram></mxfile>")


if __name__ == "__main__":
    open("architecture.svg", "w").write(svg())
    open("architecture.drawio", "w").write(drawio())
