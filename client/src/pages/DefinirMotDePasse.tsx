import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useClientAuth } from '../contexts/ClientAuthContext';

export default function DefinirMotDePasse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useClientAuth();
  const token = searchParams.get('token') || '';

  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (motDePasse.length < 8) { toast.error('Minimum 8 caractères'); return; }
    if (motDePasse !== confirmation) { toast.error('Les mots de passe ne correspondent pas'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/public/definir-mot-de-passe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, mot_de_passe: motDePasse }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(data.token, data.id, data.prenom);
      setDone(true);
      toast.success('Mot de passe défini !');
      setTimeout(() => navigate('/mes-rdv'), 1500);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = 'w-full border border-[#E7DCCD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] bg-white';

  return (
    <div className="min-h-screen bg-[#F7F2EB] flex items-center justify-center p-4">
      <div className="bg-white rounded-[22px] w-full max-w-md shadow-xl overflow-hidden">
        <div className="bg-[#0A1D35] px-8 py-6">
          <h1 className="text-white font-bold text-xl">Synégo</h1>
          <p className="text-[#6CAED6] text-sm mt-1">Accompagnement thérapeutique</p>
        </div>
        <div className="px-8 py-8">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-[#DCEFE4] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-[#1E6B4A] text-xl">✓</span>
              </div>
              <h2 className="font-bold text-[#0A1D35] text-lg mb-2">Compte activé !</h2>
              <p className="text-[#56627A] text-sm">Redirection vers vos rendez-vous…</p>
            </div>
          ) : (
            <>
              <h2 className="font-bold text-[#0A1D35] text-lg mb-1">Activez votre compte</h2>
              <p className="text-[#56627A] text-sm mb-6">Choisissez un mot de passe pour accéder à votre espace Synégo.</p>
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-2">Mot de passe *</label>
                  <input type="password" value={motDePasse} onChange={e => setMotDePasse(e.target.value)}
                    placeholder="Minimum 8 caractères" className={inputClass} autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-2">Confirmer *</label>
                  <input type="password" value={confirmation} onChange={e => setConfirmation(e.target.value)}
                    placeholder="Répétez le mot de passe" className={inputClass} />
                </div>
                <button type="submit" disabled={saving || !motDePasse || !confirmation}
                  className="w-full bg-[#0A1D35] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#1C3352] transition-colors disabled:opacity-40 mt-2">
                  {saving ? 'Enregistrement…' : 'Activer mon compte'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
