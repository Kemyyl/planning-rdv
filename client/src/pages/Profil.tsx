import { useEffect, useState } from 'react';
import { User, Lock, Save, CalendarCheck, Eye, EyeOff, ArrowRight, Video } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { useDateLocale, useTimeFormat } from '../hooks/useDateLocale';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../components/Layout';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { Navigate, Link } from 'react-router-dom';

export default function Profil() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { timeFormat } = useTimeFormat();
  const { token: clientToken } = useClientAuth();

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [saving, setSaving] = useState(false);

  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [showAncien, setShowAncien] = useState(false);
  const [showNouveau, setShowNouveau] = useState(false);
  const [savingMdp, setSavingMdp] = useState(false);

  const [rdvs, setRdvs] = useState<{ debut: string; statut: string; prestation?: { nom: string; couleur?: string }; lien_meet?: string }[]>([]);

  useEffect(() => {
    if (!clientToken) return;
    fetch('/api/client/me', { headers: { Authorization: `Bearer ${clientToken}` } })
      .then(r => r.json())
      .then(data => {
        setPrenom(data.prenom || '');
        setNom(data.nom || '');
        setEmail(data.email || '');
        setTelephone(data.telephone || '');
      });
    fetch('/api/client/rdv', { headers: { Authorization: `Bearer ${clientToken}` } })
      .then(r => r.json())
      .then(data => setRdvs(Array.isArray(data) ? data : []));
  }, [clientToken]);

  const totalSeances = rdvs.filter(r => r.statut !== 'annule').length;
  const upcoming = rdvs
    .filter(r => r.statut !== 'annule' && !isPast(new Date(r.debut)))
    .sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
  const prochainRdv = upcoming[0] || null;

  const fullName = [prenom, nom].filter(Boolean).join(' ');
  const initials = fullName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const paletteBg = ['#D0E7F5', '#DCEFE4', '#F6E7C8', '#E9D8F5', '#F7DDD8', '#D6EBE4'];
  const paletteFg = ['#0A5A8A', '#1E6B4A', '#8A5A12', '#5A2C8A', '#9B2C1F', '#1E5C4A'];
  const avatarIdx = ((prenom.charCodeAt(0) || 0) + (nom.charCodeAt(0) || 0)) % 6;

  if (!clientToken) return <Navigate to="/mes-rdv" replace />;

  async function saveProfil() {
    setSaving(true);
    try {
      const res = await fetch('/api/client/profil', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${clientToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prenom, nom, telephone: telephone || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Profil mis à jour');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  async function saveMdp() {
    if (!nouveauMdp || nouveauMdp.length < 8) { toast.error('Minimum 8 caractères'); return; }
    setSavingMdp(true);
    try {
      const res = await fetch('/api/client/profil/mot-de-passe', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${clientToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ancien: ancienMdp, nouveau: nouveauMdp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Mot de passe modifié');
      setAncienMdp(''); setNouveauMdp('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSavingMdp(false);
    }
  }

  const inputClass = 'w-full border border-[#E7DCCD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] bg-white placeholder:text-[#A8B8C8] transition';
  const labelClass = 'block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-1.5';

  return (
    <PublicLayout>

      {/* Header */}
      <div className="bg-[#F7F2EB] border-b border-[#E7DCCD]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0 shadow-sm"
              style={{ background: paletteBg[avatarIdx], color: paletteFg[avatarIdx] }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold text-[#0A1D35] leading-tight">{fullName || 'Mon profil'}</h1>
              <p className="text-sm text-[#56627A] mt-0.5">{email}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs font-semibold text-[#0A1D35] bg-white border border-[#E7DCCD] px-3 py-1 rounded-full">
                  {totalSeances} séance{totalSeances > 1 ? 's' : ''}
                </span>
                {prochainRdv && (
                  <span className="text-xs text-[#1E6B4A] font-semibold bg-[#DCEFE4] px-3 py-1 rounded-full flex items-center gap-1">
                    <CalendarCheck size={11} />
                    Prochain : {format(new Date(prochainRdv.debut), 'd MMM', { locale: dateLocale })}
                  </span>
                )}
              </div>
            </div>
            <Link to="/mes-rdv"
              className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-[#56627A] hover:text-[#0A1D35] transition-colors border border-[#E7DCCD] bg-white px-4 py-2 rounded-xl shrink-0">
              Mes rendez-vous <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-[260px_1fr] gap-6 items-start">

          {/* Sidebar */}
          <div className="space-y-4">

            {/* Suivi stats */}
            <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-5 shadow-sm">
              <p className="text-xs font-bold text-[#56627A] uppercase tracking-wide mb-4">{t('mesRdv.monSuivi')}</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#F7F2EB] rounded-[12px] p-3 text-center">
                  <div className="text-2xl font-extrabold text-[#0A1D35]">{totalSeances}</div>
                  <div className="text-[11px] text-[#56627A] mt-0.5">séances</div>
                </div>
                <div className="bg-[#F7F2EB] rounded-[12px] p-3 text-center">
                  <div className="text-2xl font-extrabold text-[#0A1D35]">{upcoming.length}</div>
                  <div className="text-[11px] text-[#56627A] mt-0.5">{t('mesRdv.aVenir')}</div>
                </div>
              </div>
              <Link to="/mes-rdv"
                className="flex items-center justify-center gap-1.5 w-full border border-[#E7DCCD] text-[#56627A] text-xs font-semibold py-2.5 rounded-[10px] hover:bg-[#F7F2EB] transition-colors">
                Voir mes RDV <ArrowRight size={12} />
              </Link>
            </div>

            {/* Prochain RDV */}
            {prochainRdv && (
              <div className="bg-[#0A1D35] rounded-[20px] p-5 shadow-sm">
                <p className="text-[#6CAED6] text-[11px] font-bold uppercase tracking-wide mb-3">{t('mesRdv.prochainRdv')}</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/10 rounded-[10px] flex flex-col items-center justify-center shrink-0">
                    <span className="text-white font-bold text-sm leading-none">{format(new Date(prochainRdv.debut), 'd')}</span>
                    <span className="text-[#6CAED6] text-[10px] capitalize" translate="no">
                      {format(new Date(prochainRdv.debut), 'MMM', { locale: dateLocale })}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm leading-snug">{prochainRdv.prestation?.nom || 'Séance'}</div>
                    <div className="text-[#8FA3B8] text-xs" translate="no">{format(new Date(prochainRdv.debut), timeFormat)}</div>
                  </div>
                </div>
                {prochainRdv.lien_meet && (
                  <a href={prochainRdv.lien_meet} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full bg-[#6CAED6] text-white text-xs font-bold py-2.5 rounded-[10px] hover:opacity-90 transition-opacity">
                    <Video size={12} /> {t('mesRdv.rejoindre')}
                  </a>
                )}
              </div>
            )}

            {/* Book CTA */}
            <Link to="/reservation"
              className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-[#D9C9B4] text-[#56627A] text-xs font-semibold py-4 rounded-[18px] hover:border-[#0A1D35] hover:text-[#0A1D35] transition-colors">
              + Réserver une séance
            </Link>
          </div>

          {/* Forms */}
          <div className="space-y-5">

            {/* Infos personnelles */}
            <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-7 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#F7F2EB] flex items-center justify-center">
                  <User size={15} className="text-[#56627A]" />
                </div>
                <p className="font-bold text-[#0A1D35]">Informations personnelles</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Prénom</label>
                    <input value={prenom} onChange={e => setPrenom(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Nom</label>
                    <input value={nom} onChange={e => setNom(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input value={email} readOnly
                    className="w-full bg-[#F7F2EB] border border-[#E7DCCD] rounded-xl px-4 py-3 text-sm text-[#56627A] cursor-default" />
                  <p className="text-[11px] text-[#A8B8C8] mt-1">L'email ne peut pas être modifié.</p>
                </div>
                <div>
                  <label className={labelClass}>Téléphone</label>
                  <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)}
                    placeholder="+33 6 …" className={inputClass} />
                </div>
                <button onClick={saveProfil} disabled={saving}
                  className="flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-2.5 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors disabled:opacity-40">
                  <Save size={14} />{saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
                </button>
              </div>
            </div>

            {/* Changer mot de passe */}
            <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-7 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg bg-[#F7F2EB] flex items-center justify-center">
                  <Lock size={15} className="text-[#56627A]" />
                </div>
                <p className="font-bold text-[#0A1D35]">Changer le mot de passe</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Mot de passe actuel</label>
                  <div className="relative">
                    <input type={showAncien ? 'text' : 'password'} value={ancienMdp}
                      onChange={e => setAncienMdp(e.target.value)}
                      className={inputClass + ' pr-11'} placeholder="••••••••" />
                    <button type="button" onClick={() => setShowAncien(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8B8C8] hover:text-[#56627A] transition-colors">
                      {showAncien ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Nouveau mot de passe</label>
                  <div className="relative">
                    <input type={showNouveau ? 'text' : 'password'} value={nouveauMdp}
                      onChange={e => setNouveauMdp(e.target.value)}
                      placeholder="8 caractères minimum"
                      className={inputClass + ' pr-11'} />
                    <button type="button" onClick={() => setShowNouveau(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8B8C8] hover:text-[#56627A] transition-colors">
                      {showNouveau ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button onClick={saveMdp} disabled={savingMdp || !ancienMdp || !nouveauMdp}
                  className="flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-2.5 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors disabled:opacity-40">
                  <Save size={14} />{savingMdp ? 'Enregistrement…' : 'Mettre à jour le mot de passe'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </PublicLayout>
  );
}
