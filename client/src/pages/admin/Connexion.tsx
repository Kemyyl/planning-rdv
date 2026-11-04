import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Calendar, Video, Shield, Star, CheckCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';

export default function Connexion() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login: adminLogin } = useAuth();
  const { login: clientLogin } = useClientAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/public/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setResetSent(true);
    } catch {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
  }

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
        toast.success(t('connexion.compteCreé'));
        navigate('/mes-rdv');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full border border-[#D9C9B4] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0A1D35] transition placeholder:text-[#A8B8C8]';
  const labelClass = 'block text-xs font-bold text-[#0A1D35] uppercase tracking-wide mb-1.5';

  return (
    <div className="min-h-screen flex">

      {/* Left dark panel */}
      <div className="hidden lg:flex w-[440px] shrink-0 bg-[#0A1D35] text-white flex-col p-12">
        <Link to="/" className="mb-12 flex items-center gap-3 group">
          <img src="/logo.png" alt="Synégo" className="h-9 w-9 object-contain brightness-0 invert" />
          <div className="text-2xl font-bold tracking-tight">Synégo</div>
        </Link>

        <div className="flex-1 flex flex-col justify-center">
          <h2 className="text-3xl font-bold leading-snug mb-3">
            {t('connexion.titre1')}<br />
            <span className="text-[#6CAED6]">{t('connexion.titre2')}</span>
          </h2>
          <p className="text-sm text-[#8FA3B8] mb-10 leading-relaxed">
            {t('connexion.desc')}
          </p>

          <ul className="space-y-4 mb-12">
            {[
              { icon: Calendar, text: t('connexion.bullet1') },
              { icon: Video, text: t('connexion.bullet2') },
              { icon: Star, text: t('connexion.bullet3') },
              { icon: Shield, text: t('connexion.bullet4') },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-[#D9C9B4]">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={14} className="text-[#6CAED6]" />
                </div>
                {text}
              </li>
            ))}
          </ul>

          {/* Testimonial */}
          <div className="bg-white/5 border border-white/10 rounded-[18px] p-5">
            <div className="flex gap-0.5 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={12} className="fill-[#F6C90E] text-[#F6C90E]" />
              ))}
            </div>
            <p className="text-sm text-[#D9C9B4] leading-relaxed mb-4 italic">
              "L'accompagnement est très personnalisé. Je me suis sentie écoutée dès la première séance."
            </p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D0E7F5]/20 flex items-center justify-center text-xs font-bold text-[#6CAED6]">ML</div>
              <span className="text-xs text-[#8FA3B8]">Marie L. · Cliente depuis 6 mois</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-[#56627A] mt-8">{t('footer.copyright')}</p>
      </div>

      {/* Right form */}
      <div className="flex-1 bg-[#F7F2EB] flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <img src="/logo.png" alt="Synégo" className="h-7 w-7 object-contain" />
            <span className="font-bold text-[#0A1D35]">Synégo</span>
          </Link>
          <div className="hidden lg:block" />
          <Link to="/" className="flex items-center gap-1.5 text-xs font-semibold text-[#56627A] hover:text-[#0A1D35] transition-colors">
            <ArrowLeft size={13} /> {t('connexion.retour')}
          </Link>
        </div>

        {/* Form centered */}
        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm">

            {/* Mode toggle */}
            <div className={`flex bg-white border border-[#E7DCCD] rounded-xl p-1 mb-8 shadow-sm ${mode === 'forgot' ? 'invisible' : ''}`}>
              <button type="button" onClick={() => setMode('login')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-[9px] transition-all ${mode === 'login' ? 'bg-[#0A1D35] text-white shadow-sm' : 'text-[#56627A] hover:text-[#0A1D35]'}`}>
                {t('connexion.ongletConnexion')}
              </button>
              <button type="button" onClick={() => setMode('register')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-[9px] transition-all ${mode === 'register' ? 'bg-[#0A1D35] text-white shadow-sm' : 'text-[#56627A] hover:text-[#0A1D35]'}`}>
                {t('connexion.ongletCreer')}
              </button>
            </div>

            {/* Title */}
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-[#0A1D35] mb-1">
                {mode === 'forgot' ? t('authModal.motDePasseOublie') : mode === 'login' ? t('connexion.sousTitreConnexion') : t('connexion.sousTitreCreer')}
              </h1>
              <p className="text-sm text-[#56627A]">
                {mode === 'forgot' ? t('authModal.sousTitreForgot') : mode === 'login' ? t('connexion.desc') : t('connexion.sousTitreCreer')}
              </p>
            </div>

            {/* Form card */}
            <div className="bg-white border border-[#E7DCCD] rounded-[22px] p-7 shadow-sm">
              {mode === 'forgot' ? (
                resetSent ? (
                  <div className="text-center py-4">
                    <p className="font-semibold text-[#0A1D35] mb-2">{t('authModal.resetEnvoye')}</p>
                    <p className="text-sm text-[#56627A] mb-6">{t('authModal.resetEnvoyeDesc')}</p>
                    <button onClick={() => { setMode('login'); setResetSent(false); }}
                      className="text-sm text-[#0A1D35] font-bold hover:underline">
                      {t('authModal.retourConnexion')}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={submitForgot} className="space-y-4">
                    <div>
                      <label className={labelClass}>{t('connexion.email')} *</label>
                      <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                        placeholder={t('connexion.emailPlaceholder')} autoFocus className={inputClass} />
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full bg-[#0A1D35] text-white font-bold py-3.5 rounded-xl hover:bg-[#1C3352] transition-colors disabled:opacity-50 mt-2">
                      {loading ? '…' : t('authModal.envoyerLien')}
                    </button>
                    <button type="button" onClick={() => setMode('login')}
                      className="w-full text-sm text-[#56627A] hover:text-[#0A1D35] text-center mt-1 hover:underline">
                      {t('authModal.retourConnexion')}
                    </button>
                  </form>
                )
              ) : (
              <form onSubmit={submit} className="space-y-4">

                {mode === 'register' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>{t('connexion.prenom')} *</label>
                      <input required value={prenom} onChange={e => setPrenom(e.target.value)}
                        autoFocus className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>{t('connexion.nom')} *</label>
                      <input required value={nom} onChange={e => setNom(e.target.value)}
                        className={inputClass} />
                    </div>
                  </div>
                )}

                <div>
                  <label className={labelClass}>{t('connexion.email')} *</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder={t('connexion.emailPlaceholder')}
                    autoFocus={mode === 'login'}
                    className={inputClass} />
                </div>

                {mode === 'register' && (
                  <div>
                    <label className={labelClass}>{t('connexion.telephone')}</label>
                    <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                      placeholder="+33 6 …" className={inputClass} />
                  </div>
                )}

                <div>
                  <label className={labelClass}>{t('connexion.motDePasse')} *</label>
                  <div className="relative">
                    <input type={show ? 'text' : 'password'} required value={mdp}
                      onChange={e => setMdp(e.target.value)}
                      minLength={mode === 'register' ? 8 : 1}
                      placeholder={mode === 'register' ? t('connexion.motDePasseMin') : '••••••••'}
                      className={inputClass + ' pr-11'} />
                    <button type="button" onClick={() => setShow(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8B8C8] hover:text-[#56627A] transition-colors">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {mode === 'login' && (
                  <div className="text-right -mt-1">
                    <button type="button" onClick={() => setMode('forgot')}
                      className="text-xs text-[#56627A] hover:text-[#0A1D35] hover:underline">
                      {t('authModal.motDePasseOublie')} ?
                    </button>
                  </div>
                )}

                <button type="submit" disabled={loading}
                  className="w-full bg-[#0A1D35] text-white font-bold py-3.5 rounded-xl hover:bg-[#1C3352] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                  {loading ? (
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : mode === 'login' ? t('connexion.btnConnexion') : t('connexion.btnCreer')}
                </button>
              </form>
              )}
            </div>

            {/* RGPD note for register */}
            {mode === 'register' && (
              <div className="flex items-start gap-2 mt-4 px-1">
                <CheckCircle size={13} className="text-[#6CAED6] mt-0.5 shrink-0" />
                <p className="text-[11px] text-[#56627A] leading-relaxed">
                  {t('reservation.rgpd')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
