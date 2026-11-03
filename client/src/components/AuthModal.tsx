import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { useAuth } from '../contexts/AuthContext';

interface Props { onClose: () => void }

export default function AuthModal({ onClose }: Props) {
  const { login: clientLogin } = useClientAuth();
  const { login: adminLogin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', mot_de_passe: '', telephone: '' });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, mot_de_passe: form.mot_de_passe }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');

        if (data.role === 'admin') {
          adminLogin(data.token, data.nom || 'Admin');
          toast.success(`Bienvenue ${data.nom || ''} !`);
          onClose();
          navigate('/admin/dashboard');
        } else {
          clientLogin(data.token, data.id, data.prenom || '', data.nom || '');
          toast.success(`Bonjour ${data.prenom || ''} !`);
          onClose();
          navigate('/mes-rdv');
        }
      } else {
        const res = await fetch('/api/client/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        clientLogin(data.token, data.id, data.prenom || form.prenom, form.nom);
        toast.success('Compte créé avec succès !');
        onClose();
        navigate('/mes-rdv');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#FFFDFA] rounded-[22px] w-full max-w-md p-8 shadow-xl relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-5 right-5 text-[#56627A] hover:text-[#0A1D35]">
          <X size={20} />
        </button>

        <h2 className="text-xl font-extrabold text-[#0A1D35] mb-1">
          {mode === 'login' ? 'Connexion' : 'Créer un compte'}
        </h2>
        <p className="text-sm text-[#56627A] mb-6">
          {mode === 'login'
            ? 'Accédez à votre espace personnel.'
            : 'Créez votre espace pour suivre vos séances.'}
        </p>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'register' && (
            <div className="grid grid-cols-2 gap-3">
              {[{ k: 'prenom', l: 'Prénom' }, { k: 'nom', l: 'Nom' }].map(({ k, l }) => (
                <div key={k}>
                  <label className="text-xs font-semibold text-[#0A1D35] mb-1 block">{l} *</label>
                  <input required value={form[k as keyof typeof form]} onChange={e => set(k, e.target.value)}
                    className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                </div>
              ))}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-[#0A1D35] mb-1 block">E-mail *</label>
            <input type="email" required value={form.email} onChange={e => set('email', e.target.value)}
              className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
          </div>
          {mode === 'register' && (
            <div>
              <label className="text-xs font-semibold text-[#0A1D35] mb-1 block">Téléphone</label>
              <input type="tel" value={form.telephone} onChange={e => set('telephone', e.target.value)}
                className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-[#0A1D35] mb-1 block">Mot de passe *</label>
            <div className="relative">
              <input type={show ? 'text' : 'password'} required value={form.mot_de_passe}
                onChange={e => set('mot_de_passe', e.target.value)}
                minLength={mode === 'register' ? 8 : 1}
                placeholder={mode === 'register' ? 'Minimum 8 caractères' : ''}
                className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] pr-10" />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#56627A]">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-[#0A1D35] text-white font-bold py-3 rounded-[14px] hover:bg-[#1C3352] transition-colors disabled:opacity-50 mt-2">
            {loading ? '…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <div className="mt-5 text-center text-sm">
          {mode === 'login' ? (
            <p className="text-[#56627A]">Pas encore de compte ?{' '}
              <button onClick={() => setMode('register')} className="text-[#0A1D35] font-bold hover:underline">S'inscrire</button>
            </p>
          ) : (
            <p className="text-[#56627A]">Déjà un compte ?{' '}
              <button onClick={() => setMode('login')} className="text-[#0A1D35] font-bold hover:underline">Se connecter</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
