import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useClientAuth } from '../contexts/ClientAuthContext';

function getStrength(pwd: string): 0 | 1 | 2 | 3 {
  if (pwd.length < 8) return 0;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasDigit = /\d/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const score = [hasUpper, hasDigit, hasSpecial].filter(Boolean).length;
  if (pwd.length >= 12 && score >= 2) return 3;
  if (score >= 1) return 2;
  return 1;
}

const STRENGTH_LABELS = ['', 'Faible', 'Moyen', 'Fort'];
const STRENGTH_COLORS = ['', '#E8805A', '#F5A623', '#1E6B4A'];

export default function DefinirMotDePasse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useClientAuth();
  const token = searchParams.get('token') || '';

  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const strength = getStrength(motDePasse);
  const matches = motDePasse.length > 0 && motDePasse === confirmation;

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

  return (
    <div className="min-h-screen bg-[#F7F2EB] flex items-center justify-center p-4">
      <div className="bg-white rounded-[22px] w-full max-w-md shadow-xl overflow-hidden">
        <div className="bg-[#0A1D35] px-8 py-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <Lock size={15} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">Synégo</h1>
            <p className="text-[#6CAED6] text-xs mt-0.5">Accompagnement thérapeutique</p>
          </div>
        </div>

        <div className="px-8 py-8">
          {done ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-[#DCEFE4] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-[#1E6B4A]" />
              </div>
              <h2 className="font-bold text-[#0A1D35] text-lg mb-2">Compte activé !</h2>
              <p className="text-[#56627A] text-sm">Redirection vers vos rendez-vous…</p>
            </div>
          ) : (
            <>
              <h2 className="font-bold text-[#0A1D35] text-lg mb-1">Activez votre compte</h2>
              <p className="text-[#56627A] text-sm mb-6">Choisissez un mot de passe pour accéder à votre espace Synégo.</p>
              <form onSubmit={submit} className="space-y-5">
                {/* Mot de passe */}
                <div>
                  <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-2">Mot de passe *</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={motDePasse}
                      onChange={e => setMotDePasse(e.target.value)}
                      placeholder="Minimum 8 caractères"
                      className="w-full border border-[#E7DCCD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] bg-white pr-11"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowPwd(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#56627A] hover:text-[#0A1D35]">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {motDePasse.length > 0 && (
                    <div className="mt-2">
                      <div className="flex gap-1 h-1.5">
                        {[1, 2, 3].map(level => (
                          <div key={level} className="flex-1 rounded-full transition-colors"
                            style={{ background: strength >= level ? STRENGTH_COLORS[strength] : '#E7DCCD' }} />
                        ))}
                      </div>
                      <p className="text-xs mt-1 font-medium" style={{ color: STRENGTH_COLORS[strength] }}>
                        {STRENGTH_LABELS[strength]}
                      </p>
                    </div>
                  )}
                </div>

                {/* Confirmation */}
                <div>
                  <label className="block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-2">Confirmer *</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmation}
                      onChange={e => setConfirmation(e.target.value)}
                      placeholder="Répétez le mot de passe"
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 bg-white pr-11 transition-colors ${
                        confirmation.length > 0
                          ? matches ? 'border-[#1E6B4A] focus:ring-[#1E6B4A]' : 'border-[#E8805A] focus:ring-[#E8805A]'
                          : 'border-[#E7DCCD] focus:ring-[#6CAED6]'
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirm(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#56627A] hover:text-[#0A1D35]">
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmation.length > 0 && (
                    <p className={`text-xs mt-1 font-medium ${matches ? 'text-[#1E6B4A]' : 'text-[#E8805A]'}`}>
                      {matches ? '✓ Les mots de passe correspondent' : 'Les mots de passe ne correspondent pas'}
                    </p>
                  )}
                </div>

                <button type="submit" disabled={saving || !motDePasse || !confirmation || !matches}
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
