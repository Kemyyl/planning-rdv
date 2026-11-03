import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useDateLocale, useTimeFormat } from '../hooks/useDateLocale';
import { X, Save, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import type { ClientAccount, RendezVous } from '@synego/shared';

interface ClientWithStats extends ClientAccount {
  seances_count?: number;
  has_notes?: boolean;
  seances_objectif?: number;
}

interface Props {
  client: ClientWithStats;
  readOnly?: boolean;
  onClose: () => void;
  onUpdated: (c: ClientWithStats) => void;
}

const STATUT_STYLE: Record<string, string> = {
  confirme: 'bg-[#DCEFE4] text-[#1E6B4A]',
  en_attente: 'bg-[#F6E7C8] text-[#8A5A12]',
  annule: 'bg-[#F7DDD8] text-[#9B2C1F]',
};
const STATUT_LABEL: Record<string, string> = {
  confirme: 'Confirmé', en_attente: 'En attente', annule: 'Annulé',
};

export default function ClientPanel({ client, readOnly = false, onClose, onUpdated }: Props) {
  const { token } = useAuth();
  const dateLocale = useDateLocale();
  const { timeFormat } = useTimeFormat();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [prenom, setPrenom] = useState(client.prenom);
  const [nom, setNom] = useState(client.nom);
  const [email, setEmail] = useState(client.email);
  const [telephone, setTelephone] = useState(client.telephone || '');
  const [actif, setActif] = useState(client.compte_actif);
  const [saving, setSaving] = useState(false);
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);

  const dirty = prenom !== client.prenom || nom !== client.nom || email !== client.email
    || telephone !== (client.telephone || '') || actif !== client.compte_actif;

  useEffect(() => {
    fetch(`/api/admin/clients/${client.id}/rdvs`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => setRdvs(Array.isArray(data) ? data : []));
  }, [client.id]);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/clients/${client.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ prenom, nom, email, telephone: telephone || null, compte_actif: actif }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Client mis à jour');
      onUpdated({ ...client, prenom, nom, email, telephone: telephone || undefined, compte_actif: actif });
      onClose();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSaving(false); }
  }

  const inputClass = readOnly
    ? 'w-full bg-[#F7F2EB] rounded-xl px-3 py-2.5 text-sm text-[#0A1D35] cursor-default'
    : 'w-full border border-[#E7DCCD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] bg-white';
  const labelClass = 'block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-1.5';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-sm h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E7DCCD]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#D0E7F5] flex items-center justify-center text-xs font-bold text-[#0A1D35] shrink-0">
              {`${client.prenom[0]}${client.nom[0]}`.toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-[#0A1D35] text-sm">{client.prenom} {client.nom}</div>
              <div className="text-xs text-[#56627A] flex items-center gap-2">
                {client.numero && <span className="font-mono text-[#A8B8C8]">#{client.numero}</span>}
                <span>{rdvs.filter(r => r.statut !== 'annule').length} séance(s)</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#56627A] hover:text-[#0A1D35]"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Infos */}
          <div className="p-6 space-y-4 border-b border-[#E7DCCD]">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Prénom</label>
                <input value={prenom} onChange={e => !readOnly && setPrenom(e.target.value)} readOnly={readOnly} className={inputClass} autoFocus={!readOnly} />
              </div>
              <div>
                <label className={labelClass}>Nom</label>
                <input value={nom} onChange={e => !readOnly && setNom(e.target.value)} readOnly={readOnly} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={email} onChange={e => !readOnly && setEmail(e.target.value)} readOnly={readOnly} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Téléphone</label>
              <input type="tel" value={telephone} onChange={e => !readOnly && setTelephone(e.target.value)} readOnly={readOnly} className={inputClass} placeholder="+33 6 …" />
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-[#0A1D35]">Compte actif</span>
              {readOnly ? (
                actif ? <ToggleRight size={28} className="text-[#1E6B4A]" /> : <ToggleLeft size={28} className="text-[#D9C9B4]" />
              ) : (
                <button onClick={() => setActif(v => !v)} className="text-[#56627A] hover:text-[#0A1D35] transition-colors">
                  {actif ? <ToggleRight size={28} className="text-[#1E6B4A]" /> : <ToggleLeft size={28} />}
                </button>
              )}
            </div>
          </div>

          {/* Historique RDV */}
          <div className="p-6">
            <p className="text-xs font-bold text-[#56627A] uppercase tracking-wide mb-3">Historique des séances</p>
            {rdvs.length === 0 ? (
              <p className="text-sm text-[#56627A] text-center py-4">Aucune séance</p>
            ) : (
              <div className="space-y-2">
                {rdvs.map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-[#F7F2EB] rounded-[12px] px-4 py-2.5">
                    <div>
                      <div className="text-xs font-semibold text-[#0A1D35] capitalize">
                        {format(new Date(r.debut), `d MMM yyyy · ${timeFormat}`, { locale: dateLocale })}
                      </div>
                      <div className="text-xs text-[#56627A]">{r.prestation?.nom || '—'}</div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUT_STYLE[r.statut] || 'bg-[#F7F2EB] text-[#56627A]'}`}>
                      {STATUT_LABEL[r.statut] || r.statut}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E7DCCD] flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-[#E7DCCD] text-[#56627A] font-semibold py-3 rounded-xl text-sm hover:bg-[#F7F2EB] transition-colors">
            Fermer
          </button>
          {!readOnly && (
            <button onClick={save} disabled={!dirty || saving}
              className="flex-1 flex items-center justify-center gap-2 bg-[#0A1D35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1C3352] transition-colors disabled:opacity-40">
              <Save size={14} />{saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
