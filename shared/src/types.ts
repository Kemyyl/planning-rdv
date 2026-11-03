export type Statut = 'confirme' | 'annule' | 'en_attente';
export type StatutTicket = 'ouvert' | 'en_cours' | 'clos';

export interface Client {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  date_consentement?: string;
  created_at?: string;
}

export interface Prestation {
  id: string;
  nom: string;
  nom_en?: string;
  description?: string;
  description_en?: string;
  duree: number;
  prix?: number;
  couleur: string;
  actif: boolean;
  ordre: number;
}

export interface Horaire {
  id: string;
  jour: number;
  ouverture?: string;
  fermeture?: string;
  ouverture_aprem?: string;
  fermeture_aprem?: string;
  actif: boolean;
}

export interface RendezVous {
  id: string;
  client_id?: string;
  prestation_id?: string;
  debut: string;
  fin: string;
  statut: Statut;
  commentaire?: string;
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
  id: string;
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
  id: string;
  rdv_id: string;
  client_id: string;
  admin_id?: string;
  contenu: string;
  created_at?: string;
  updated_at?: string;
  rdv?: RendezVous;
}

export interface ClientAccount extends Client {
  compte_actif: boolean;
}
