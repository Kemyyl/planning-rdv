export type Statut = 'confirme' | 'annule' | 'en_attente';
export type StatutTicket = 'ouvert' | 'en_cours' | 'clos';

export interface Client {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  date_consentement?: string;
  created_at?: string;
}

export interface Prestation {
  id: number;
  nom: string;
  nom_en?: string;
  description?: string;
  description_en?: string;
  duree: number;
  prix?: number;
  couleur: string;
  actif: boolean;
  visible_client: boolean;
  ordre: number;
}

export interface Horaire {
  id: number;
  jour: number;
  ouverture?: string;
  fermeture?: string;
  ouverture_aprem?: string;
  fermeture_aprem?: string;
  actif: boolean;
}

export interface RendezVous {
  id: number;
  client_id?: number;
  prestation_id?: number;
  debut: string;
  fin: string;
  statut: Statut;
  commentaire?: string;
  titre?: string;
  lien_meet?: string;
  resume_url?: string;
  google_event_id?: string;
  jeton_annulation?: string;
  created_at?: string;
  client?: Client;
  prestation?: Prestation;
}

export interface Creneau {
  debut: string;
  fin: string;
  disponible: boolean;
}

export interface Ticket {
  id: number;
  auteur: string;
  email: string;
  sujet: string;
  message: string;
  statut: StatutTicket;
  created_at?: string;
  updated_at?: string;
}

export interface CreerRdvInput {
  prestation_id: string;
  debut: string;
  client: {
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    consentement: boolean;
  };
}

export interface LoginInput {
  email: string;
  mot_de_passe: string;
}

export interface NoteSeance {
  id: number;
  rdv_id: number;
  client_id: number;
  admin_id?: number;
  contenu: string;
  created_at?: string;
  updated_at?: string;
  rdv?: RendezVous;
}

export interface ClientAccount extends Client {
  compte_actif: boolean;
}
