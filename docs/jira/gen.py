import csv
rows=[]; n=0
def add(typ, summary, desc, label, prio="Medium", parent="", assignee="", sp=""):
    global n; n+=1; rows.append([str(n), parent, typ, summary, desc, prio, label, assignee, sp]); return str(n)

def story(summary, desc, prio, sp, dev, net):
    s = add("Story", summary, desc, "Mixte", prio, sp=sp)
    for t, who in dev: add("Sub-task", t, "", "Dev", prio, s, who)
    for t, who in net: add("Sub-task", t, "", "Réseau", prio, s, who)

# Organisation
add("Task","Configurer le board Scrum (étiquettes Dev / Réseau / Mixte)","Board, colonnes À faire / En cours / En revue / Terminé, étiquettes obligatoires sur chaque carte.","Mixte","High",assignee="Kemyl")
add("Task","Donner l'accès Jira au client","Le client doit pouvoir consulter l'outil dès le premier jour.","Mixte","Highest",assignee="Kemyl")
add("Task","Définir le Sprint Goal et la Definition of Done","Voir l'onglet Sprint Goal & DoD du Google Doc.","Mixte","Highest",assignee="Dylan")
add("Task","[Obstacle] En attente de l'e-mail du client avec les détails du projet","Ouvert le 02/11. Responsable : PO (Dylan). Action : relancer le client au point quotidien.","Mixte","Highest",assignee="Dylan")
add("Task","Compte rendu Daily 1 (lundi 02/11)","Lancement du projet. Rôles : Dylan PO, Kemyl Scrum Master, Anthony, Walid, Estéban (dev), Lucas (réseau). Obstacle : e-mail client attendu.","Mixte","Medium",assignee="Kemyl")

story("Mes visiteurs accèdent à mon site à une adresse simple",
 "En tant que professionnel, je veux que mes clients trouvent mon site à une adresse simple, afin qu'ils puissent prendre rendez-vous facilement.\n\nPreuve : le site s'ouvre depuis un téléphone en 4G à l'adresse choisie.",
 "Highest","5",
 [("Initialiser le projet React + TypeScript et l'API Node.js","Walid"),("Créer une première page d'accueil déployable","Anthony")],
 [("Installer et sécuriser le VPS Linux (mises à jour, clé SSH) puis installer Coolify","Lucas"),("Configurer le nom de domaine et le déploiement GitHub dans Coolify","Lucas")])
story("Mes visiteurs peuvent me faire confiance",
 "En tant que professionnel, je veux un site sécurisé et à mes couleurs, afin que mes clients aient confiance.\n\nPreuve : cadenas HTTPS valide, logo et palette de la charte graphique.",
 "Highest","3",
 [("Appliquer la charte graphique (logo, couleurs, typo)","Anthony")],
 [("Activer le HTTPS automatique du proxy Coolify (Let's Encrypt)","Lucas"),("Pare-feu : 80, 443 et 51820/UDP ouverts, ports Coolify 8000/6001/6002 et SSH fermés côté Internet","Lucas")])
story("Mes clients prennent rendez-vous en ligne en quelques clics",
 "En tant que client, je veux choisir une prestation, une date et un créneau libre, afin de réserver sans appeler.\n\nPreuve : un rendez-vous est pris en direct pendant la démo.",
 "Highest","8",
 [("Page de prise de RDV (prestation, date, créneau)","Anthony"),("API : calcul des créneaux libres et réservation sans doublon","Walid"),("Formulaire client et page de confirmation","Estéban")],
 [("Déployer l'API dans Coolify et l'exposer en HTTPS sur /api","Lucas")])
story("Mes rendez-vous arrivent automatiquement dans mon Google Agenda",
 "En tant que professionnel, je veux voir chaque nouveau rendez-vous dans mon Google Agenda, afin de ne rien manquer.\n\nPreuve : un RDV pris sur le site apparaît dans l'agenda.",
 "High","5",
 [("Connecter l'API à Google Calendar (création, annulation)","Walid"),("Bloquer les créneaux déjà occupés dans l'agenda","Estéban")],
 [("Stocker les identifiants Google dans les variables secrètes de Coolify","Lucas")])
story("Je retrouve mes clients et l'historique de leurs rendez-vous",
 "En tant que professionnel, je veux consulter la fiche de chaque client et ses rendez-vous, afin de mieux le suivre.\n\nPreuve : la fiche d'un client affiche ses RDV passés et à venir.",
 "High","5",
 [("Créer le schéma de la base (clients, prestations, rendez_vous, horaires, admins, tickets)","Walid"),("Pages admin : liste et fiche client","Estéban")],
 [("Créer la base PostgreSQL dans Coolify et un compte applicatif aux droits limités","Lucas")])
story("Seule mon équipe peut voir les informations de mes clients",
 "En tant que professionnel, je veux que les données de mes clients ne soient accessibles qu'à mon équipe, afin de les protéger.\n\nPreuve : la base est inaccessible sans VPN, accessible avec.",
 "High","5",
 [("Connexion sécurisée à l'espace admin (mot de passe haché, JWT)","Walid")],
 [("Installer le VPN WireGuard et créer les accès de l'équipe","Lucas"),("Fermer l'accès direct à la base depuis Internet","Lucas")])
story("Je ne perds jamais les informations de mes clients",
 "En tant que professionnel, je veux que mes données soient sauvegardées, afin de pouvoir les récupérer en cas de problème.\n\nPreuve : une donnée supprimée volontairement est restaurée devant le client.",
 "High","3",
 [("Préparer un jeu de données de test pour la démo de restauration","Estéban")],
 [("Planifier la sauvegarde quotidienne dans Coolify vers un stockage S3","Lucas"),("Tester et documenter la restauration","Lucas")])
story("Je vois d'un coup d'œil mes rendez-vous du jour et de la semaine",
 "En tant que professionnel, je veux un planning clair, afin d'organiser ma journée.\n\nPreuve : le planning admin affiche les RDV du jour et de la semaine.",
 "Medium","3",
 [("Page planning jour / semaine dans l'espace admin","Anthony"),("API : liste des RDV par période","Walid")],
 [("Vérifier que l'espace admin n'est joignable qu'en HTTPS","Lucas")])
story("Mes clients reçoivent une confirmation et un rappel par e-mail",
 "En tant que client, je veux recevoir une confirmation et un rappel, afin de ne pas oublier mon rendez-vous.\n\nPreuve : l'e-mail de confirmation arrive pendant la démo.",
 "Medium","3",
 [("Modèles d'e-mails et envoi à la réservation","Estéban"),("Tâche planifiée de rappel J-1","Walid")],
 [("Configurer le service d'envoi d'e-mails (SMTP) et les enregistrements DNS","Lucas")])
story("On peut signaler un problème et suivre sa résolution",
 "En tant qu'utilisateur, je veux déposer une demande et suivre son traitement, afin d'obtenir de l'aide.\n\nPreuve : une demande est déposée, suivie, puis clôturée. Usage à clarifier avec le client.",
 "Medium","5",
 [("Formulaire de dépôt de ticket et suivi des statuts","Anthony")],
 [("Choisir et justifier la solution (développée ou existante, ex. Jira Service Management)","Lucas")])
story("Je suis prévenu quand quelque chose ne va pas",
 "En tant que professionnel, je veux être alerté si le site tombe, afin de réagir vite.\n\nPreuve : on coupe le service, l'alerte arrive.",
 "Medium","3",
 [("Ajouter une route /api/health pour la supervision","Walid")],
 [("Déployer Uptime Kuma comme service Coolify et configurer l'alerte e-mail","Lucas")])
story("Les données de mes clients sont protégées et conformes à la loi",
 "En tant que professionnel, je veux respecter le RGPD, afin d'éviter tout problème légal.\n\nPreuve : case de consentement, page de confidentialité, suppression d'un client possible.",
 "Low","3",
 [("Consentement au formulaire, mentions légales et politique de confidentialité","Estéban"),("Suppression et export des données d'un client","Walid")],
 [("Documenter qui a accès à quoi (règles d'accès)","Lucas")])

with open("backlog_jira_G4.csv","w",newline="",encoding="utf-8-sig") as f:
    w=csv.writer(f); w.writerow(["Issue ID","Parent ID","Issue Type","Summary","Description","Priority","Labels","Assignee","Story Points"]); w.writerows(rows)
import collections
print(len(rows), collections.Counter(r[2] for r in rows), collections.Counter(r[6] for r in rows))
