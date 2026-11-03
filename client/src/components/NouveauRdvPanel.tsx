import { useEffect, useState } from 'react';
import { X, Search, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import type { Client, Prestation } from '@synego/shared';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function NouveauRdvPanel({ onClose, onCreated }: Props) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [prestationId, setPrestationId] = useState('');
  const [date, setDate] = useState('');
  const [heure, setHeure] = useState('');
  const [titre, setTitre] = useState('');
  const [dureeOverride, setDureeOverride] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/admin/clients', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => setClients(Array.isArray(data) ? data : []));
    fetch('/api/admin/prestations', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => {
        const arr = Array.isArray(data) ? data.filter((p: Prestation) => p.actif) : [];
        setPrestations(arr);
        if (arr.length > 0) setPrestationId(arr[0].id);
      });
  }, []);

  const filtered = clients.filter(c =>
    `${c.prenom} ${c.nom} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 6);

  const selectedPrestation = prestations.find(p => p.id === prestationId);

  async function creer() {
    if (!selectedClient || !prestationId || !date || !heure) {
      toast.error(t('nouveauRdvPanel.champsObligatoires'));
      return;
    }
    setSaving(true);
    try {
      const debut = new Date(`${date}T${heure}`).toISOString();
      const body: Record<string, unknown> = { client_id: selectedClient.id, prestation_id: prestationId, debut, note_interne: note };
      if (titre.trim()) body.titre = titre.trim();
      if (dureeOverride && +dureeOverride > 0) body.duree = +dureeOverride;
      const res = await fetch('/api/admin/rdv', { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t('nouveauRdvPanel.ajouter'));
      onCreated();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-sm h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E7DCCD]">
          <h2 className="font-bold text-[#0A1D35] text-base">{t('nouveauRdvPanel.titre')}</h2>
          <button onClick={onClose} className="text-[#56627A] hover:text-[#0A1D35]"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Client */}
          <div>
            <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-2">{t('nouveauRdvPanel.client')}</label>
            {selectedClient ? (
              <div className="flex items-center justify-between border border-[#E7DCCD] rounded-xl px-4 py-3 bg-[#F7F2EB]">
                <div>
                  <div className="text-sm font-semibold text-[#0A1D35]">{selectedClient.prenom} {selectedClient.nom}</div>
                  <div className="text-xs text-[#56627A]">{selectedClient.email}</div>
                </div>
                <button onClick={() => { setSelectedClient(null); setSearch(''); }} className="text-xs text-[#56627A] hover:text-[#9B2C1F]">✕</button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#56627A]" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder={t('nouveauRdvPanel.rechercherClient')}
                  className="w-full border border-[#E7DCCD] rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]"
                />
                {showDropdown && search.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-[#E7DCCD] rounded-xl shadow-lg mt-1 z-10 overflow-hidden">
                    {filtered.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-[#56627A]">{t('nouveauRdvPanel.aucunClient')}</div>
                    ) : filtered.map(c => (
                      <button key={c.id} onClick={() => { setSelectedClient(c); setShowDropdown(false); setSearch(''); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#F7F2EB] transition-colors">
                        <div className="text-sm font-medium text-[#0A1D35]">{c.prenom} {c.nom}</div>
                        <div className="text-xs text-[#56627A]">{c.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Titre personnalisé */}
          <div>
            <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-2">
              Titre <span className="font-normal text-[#A8B8C8]">(facultatif)</span>
            </label>
            <input value={titre} onChange={e => setTitre(e.target.value)}
              placeholder="Ex : Séance bilan, Suivi mensuel…"
              className="w-full border border-[#E7DCCD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
          </div>

          {/* Prestation */}
          <div>
            <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-2">{t('nouveauRdvPanel.prestation')}</label>
            <select value={prestationId} onChange={e => setPrestationId(e.target.value)}
              className="w-full border border-[#E7DCCD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] bg-white">
              {prestations.map(p => (
                <option key={p.id} value={p.id}>{p.nom} · {p.duree} min</option>
              ))}
            </select>
          </div>

          {/* Durée variable */}
          <div>
            <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-2">
              Durée (min) <span className="font-normal text-[#A8B8C8]">(laissez vide pour utiliser la durée par défaut)</span>
            </label>
            <input type="number" min="5" max="480" value={dureeOverride} onChange={e => setDureeOverride(e.target.value)}
              placeholder={selectedPrestation ? `${selectedPrestation.duree} min par défaut` : ''}
              className="w-full border border-[#E7DCCD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
          </div>

          {/* Date & Heure */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-2">{t('nouveauRdvPanel.date')}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full border border-[#E7DCCD] rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-2">{t('nouveauRdvPanel.heure')}</label>
              <input type="time" value={heure} onChange={e => setHeure(e.target.value)}
                className="w-full border border-[#E7DCCD] rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
            </div>
          </div>

          {/* Disponibilité + Meet badge */}
          {date && heure && selectedPrestation && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 bg-[#DCEFE4] text-[#1E6B4A] text-xs font-medium px-4 py-2.5 rounded-xl">
                <span className="w-2 h-2 rounded-full bg-[#1E6B4A]" />
                Créneau disponible — {dureeOverride && +dureeOverride > 0 ? +dureeOverride : selectedPrestation.duree} min
              </div>
              <div className="flex items-center gap-2 bg-[#D0E7F5] text-[#0A1D35] text-xs font-medium px-4 py-2.5 rounded-xl">
                <Video size={13} />
                Un lien Google Meet sera généré automatiquement
              </div>
            </div>
          )}

          {/* Note interne */}
          <div>
            <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-2">
              {t('nouveauRdvPanel.note')} <span className="font-normal text-[#A8B8C8]">({t('nouveauRdvPanel.facultatif')})</span>
            </label>
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder={t('nouveauRdvPanel.notePlaceholder')}
              rows={3}
              className="w-full border border-[#E7DCCD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] resize-none" />
          </div>
        </div>

        <div className="p-6 border-t border-[#E7DCCD] flex gap-3">
          <button onClick={onClose} className="flex-1 border border-[#E7DCCD] text-[#56627A] font-semibold py-3 rounded-xl text-sm hover:bg-[#F7F2EB] transition-colors">
            {t('nouveauRdvPanel.annuler')}
          </button>
          <button onClick={creer} disabled={saving || !selectedClient || !prestationId || !date || !heure}
            className="flex-1 bg-[#0A1D35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1C3352] transition-colors disabled:opacity-40">
            {saving ? t('nouveauRdvPanel.ajout') : t('nouveauRdvPanel.ajouter')}
          </button>
        </div>
      </div>
    </div>
  );
}
