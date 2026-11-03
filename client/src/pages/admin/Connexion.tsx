import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Calendar, Video, Shield, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';

export default function Connexion() {
  const navigate = useNavigate();
  const { login: adminLogin } = useAuth();
  const { login: clientLogin } = useClientAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, mot_de_passe: mdp }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Identifiants incorrects');

        if (data.role === 'admin') {
          adminLogin(data.token, data.nom || 'Admin');
          toast.success(`Bienvenue ${data.nom || ''} !`);
          navigate('/admin/dashboard');
        } else {
          clientLogin(data.token, data.id, data.prenom || '', data.nom || '');
          toast.success(`Bonjour ${data.prenom || ''} !`);
          navigate('/mes-rdv');
        }
      } else {
        const res = await fetch('/api/client/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, mot_de_passe: mdp, prenom, nom, telephone }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        clientLogin(data.token, data.id, data.prenom || prenom, nom);
        toast.success('Compte créé avec succès !');
        navigate('/mes-rdv');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left dark panel */}
      <div className="hidden lg:flex w-[420px] shrink-0 bg-[#0A1D35] text-white flex-col p-12">
        <Link to="/" className="mb-10 flex items-center gap-3">
          <img src="/logo.png" alt="Synégo" className="h-9 w-9 object-contain brightness-0 invert" />
          <div className="text-2xl font-bold tracking-tight">Synégo</div>
        </Link>

        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-3xl font-bold leading-snug mb-3">
            Retrouvez l'équilibre,<br />où que vous soyez.
          </h2>
          <p className="text-sm text-[#8FA3B8] mb-10 leading-relaxed">
            Réservez et suivez vos séances depuis votre espace personnel. Simple, sécurisé et bienveillant.
          </p>
          <ul className="space-y-4">
            {[
              { icon: Calendar, text: 'Accédez à tous vos rendez-vous' },
              { icon: Video, text: 'Rejoignez vos séances en visio' },
              { icon: Star, text: 'Suivez votre progression' },
              { icon: Shield, text: 'Données protégées RGPD' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-[#D9C9B4]">
                <Icon size={16} className="text-[#6CAED6] shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-[#56627A] mt-8">© 2026 Synégo — Accompagnement thérapeutique</p>
      </div>

      {/* Right form */}
      <div className="flex-1 bg-[#F7F2EB] flex flex-col items-center justify-center p-8">
        {/* Mobile logo */}
        <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
          <img src="/logo.png" alt="Synégo" className="h-8 w-8 object-contain" />
          <span className="text-xl font-bold text-[#0A1D35]">Synégo</span>
        </Link>

        <div className="w-full max-w-sm">
          {/* Mode toggle */}
          <div className="flex bg-white border border-[#E7DCCD] rounded-xl p-1 mb-7">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-semibold rounded-[9px] transition-colors ${mode === 'login' ? 'bg-[#0A1D35] text-white' : 'text-[#56627A] hover:text-[#0A1D35]'}`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 text-sm font-semibold rounded-[9px] transition-colors ${mode === 'register' ? 'bg-[#0A1D35] text-white' : 'text-[#56627A] hover:text-[#0A1D35]'}`}
            >
              Créer un compte
            </button>
          </div>

          <h1 className="text-2xl font-bold text-[#0A1D35] mb-1">
            {mode === 'login' ? 'Connexion' : 'Créer mon espace'}
          </h1>
          <p className="text-sm text-[#56627A] mb-6">
            {mode === 'login'
              ? 'Accédez à votre espace personnel ou praticien.'
              : 'Créez votre compte pour suivre vos séances.'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0A1D35] mb-1.5">Prénom *</label>
                  <input required value={prenom} onChange={e => setPrenom(e.target.value)}
                    className="w-full border border-[#D9C9B4] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A1D35] transition" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0A1D35] mb-1.5">Nom *</label>
                  <input required value={nom} onChange={e => setNom(e.target.value)}
                    className="w-full border border-[#D9C9B4] rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A1D35] transition" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#0A1D35] mb-1.5">Adresse email *</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="w-full border border-[#D9C9B4] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A1D35] transition" />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-[#0A1D35] mb-1.5">Téléphone</label>
                <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                  className="w-full border border-[#D9C9B4] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A1D35] transition" />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#0A1D35] mb-1.5">Mot de passe *</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} required value={mdp}
                  onChange={e => setMdp(e.target.value)}
                  minLength={mode === 'register' ? 8 : 1}
                  placeholder={mode === 'register' ? 'Minimum 8 caractères' : ''}
                  className="w-full border border-[#D9C9B4] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A1D35] transition pr-10" />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#56627A]">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-[#0A1D35] text-white font-bold py-3.5 rounded-xl hover:bg-[#1C3352] transition-colors disabled:opacity-50 mt-2">
              {loading ? '…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-xs text-[#56627A] mt-6">
            <Link to="/" className="hover:text-[#0A1D35] transition-colors">← Retour au site</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
