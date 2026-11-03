import { useState } from 'react';
import { X, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function NouveauClientPanel({ onClose, onCreated }: Props) {
  const { token } = useAuth();
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [saving, setSaving] = useState(false);

  async function creer() {
    if (!prenom.trim() || !nom.trim() || !email.trim()) {
      toast.error('Remplissez tous les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prenom, nom, email, telephone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Client créé — invitation envoyée par email');
      onCreated();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full border border-[#E7DCCD] rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] bg-white';
  const labelClass = 'block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-2';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-sm h-full flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E7DCCD]">
          <h2 className="font-bold text-[#0A1D35] text-base">Nouveau client</h2>
          <button onClick={onClose} className="text-[#56627A] hover:text-[#0A1D35]"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Prénom *</label>
              <input value={prenom} onChange={e => setPrenom(e.target.value)} className={inputClass} autoFocus />
            </div>
            <div>
              <label className={labelClass}>Nom *</label>
              <input value={nom} onChange={e => setNom(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} placeholder="client@email.com" />
          </div>
          <div>
            <label className={labelClass}>Téléphone</label>
            <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} className={inputClass} placeholder="+33 6 …" />
          </div>

          <div className="flex items-start gap-3 bg-[#F7F2EB] border border-[#E7DCCD] rounded-[12px] px-4 py-3">
            <Mail size={15} className="text-[#56627A] shrink-0 mt-0.5" />
            <p className="text-xs text-[#56627A] leading-relaxed">
              Un email d'invitation sera envoyé au client pour qu'il définisse son mot de passe lors de sa première connexion. Le lien est valable 7 jours.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-[#E7DCCD] flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-[#E7DCCD] text-[#56627A] font-semibold py-3 rounded-xl text-sm hover:bg-[#F7F2EB] transition-colors">
            Annuler
          </button>
          <button onClick={creer}
            disabled={saving || !prenom.trim() || !nom.trim() || !email.trim()}
            className="flex-1 bg-[#0A1D35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1C3352] transition-colors disabled:opacity-40">
            {saving ? 'Création…' : 'Créer et inviter'}
          </button>
        </div>
      </div>
    </div>
  );
}
