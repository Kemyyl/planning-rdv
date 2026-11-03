import { useState } from 'react';
import { format } from 'date-fns';
import { X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import type { RendezVous } from '@synego/shared';

interface Props {
  rdv: RendezVous;
  onClose: () => void;
  onUpdated: (rdv: RendezVous) => void;
}

export default function ModifierRdvPanel({ rdv, onClose, onUpdated }: Props) {
  const { token } = useAuth();
  const debutDate = new Date(rdv.debut);
  const dureeMin = rdv.prestation?.duree ||
    Math.round((new Date(rdv.fin).getTime() - debutDate.getTime()) / 60000) || 60;

  const [date, setDate] = useState(format(debutDate, 'yyyy-MM-dd'));
  const [heure, setHeure] = useState(format(debutDate, 'HH:mm'));
  const [duree, setDuree] = useState(dureeMin);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const debut = new Date(`${date}T${heure}`).toISOString();
      const res = await fetch(`/api/admin/rdv/${rdv.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ debut, duree }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('RDV modifié');
      onUpdated(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#FFFDFA] rounded-[22px] w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[#E7DCCD]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#56627A] mb-0.5">Modifier le RDV</p>
            <h3 className="font-bold text-[#0A1D35] text-sm">{rdv.client?.prenom} {rdv.client?.nom}</h3>
          </div>
          <button onClick={onClose} className="text-[#56627A] hover:text-[#0A1D35]"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full border border-[#E7DCCD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-1.5">Heure</label>
            <input type="time" value={heure} onChange={e => setHeure(e.target.value)}
              className="w-full border border-[#E7DCCD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-1.5">Durée (min)</label>
            <input type="number" value={duree} min={15} step={5} onChange={e => setDuree(+e.target.value)}
              className="w-full border border-[#E7DCCD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
          </div>
        </div>

        <div className="p-6 border-t border-[#E7DCCD] flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-[#E7DCCD] text-[#56627A] font-semibold py-3 rounded-xl text-sm hover:bg-[#F7F2EB] transition-colors">
            Annuler
          </button>
          <button onClick={save} disabled={!date || !heure || saving}
            className="flex-1 flex items-center justify-center gap-2 bg-[#0A1D35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1C3352] transition-colors disabled:opacity-40">
            <Save size={14} />{saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
