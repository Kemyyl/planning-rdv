import { useEffect, useState } from 'react';
import { User, Lock, Save, BarChart2, CalendarCheck } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { useDateLocale } from '../hooks/useDateLocale';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../components/Layout';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { Navigate, Link } from 'react-router-dom';

export default function Profil() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { token: clientToken } = useClientAuth();

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [saving, setSaving] = useState(false);

  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [savingMdp, setSavingMdp] = useState(false);

  const [rdvs, setRdvs] = useState<{ debut: string; statut: string; prestation?: { nom: string } }[]>([]);

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

  const inputClass = 'w-full border border-[#E7DCCD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] bg-white';
  const labelClass = 'block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-1.5';

  return (
    <PublicLayout>
      <div className="max-w-lg mx-auto px-6 py-12">
        <h1 className="text-2xl font-extrabold text-[#0A1D35] mb-8">Mon profil</h1>

        {/* Infos personnelles */}
        <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-6 mb-6">
          <div className="flex items-center gap-2 mb-5">
            <User size={16} className="text-[#56627A]" />
            <p className="text-sm font-bold text-[#0A1D35]">Informations personnelles</p>
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
              <input value={email} readOnly className="w-full bg-[#F7F2EB] rounded-xl px-3 py-2.5 text-sm text-[#56627A] cursor-default" />
            </div>
            <div>
              <label className={labelClass}>Téléphone</label>
              <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="+33 6 …" className={inputClass} />
            </div>
            <button onClick={saveProfil} disabled={saving}
              className="flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-2.5 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors disabled:opacity-40">
              <Save size={14} />{saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {/* Changer mot de passe */}
        <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock size={16} className="text-[#56627A]" />
            <p className="text-sm font-bold text-[#0A1D35]">Changer le mot de passe</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Mot de passe actuel</label>
              <input type="password" value={ancienMdp} onChange={e => setAncienMdp(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nouveau mot de passe</label>
              <input type="password" value={nouveauMdp} onChange={e => setNouveauMdp(e.target.value)} placeholder="8 caractères minimum" className={inputClass} />
            </div>
            <button onClick={saveMdp} disabled={savingMdp || !ancienMdp || !nouveauMdp}
              className="flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-2.5 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors disabled:opacity-40">
              <Save size={14} />{savingMdp ? 'Enregistrement…' : 'Mettre à jour'}
            </button>
          </div>
        </div>

        {/* Mon suivi */}
        <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-6 mt-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={16} className="text-[#56627A]" />
            <p className="text-sm font-bold text-[#0A1D35]">Mon suivi</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#F7F2EB] rounded-[14px] p-4">
              <div className="text-xs text-[#56627A] mb-1">{t('mesRdv.seancesTotales')}</div>
              <div className="text-2xl font-extrabold text-[#0A1D35]">{totalSeances}</div>
            </div>
            <div className="bg-[#F7F2EB] rounded-[14px] p-4">
              <div className="text-xs text-[#56627A] mb-1">{t('mesRdv.prochainRdv')}</div>
              <div className="text-sm font-bold text-[#0A1D35]">
                {prochainRdv ? format(new Date(prochainRdv.debut), 'd MMM', { locale: dateLocale }) : '—'}
              </div>
            </div>
          </div>
          {prochainRdv && (
            <div className="flex items-center gap-3 p-3 bg-[#DCEFE4] rounded-[12px] mb-4">
              <CalendarCheck size={16} className="text-[#1E6B4A] shrink-0" />
              <div className="text-xs font-semibold text-[#1E6B4A]">
                {prochainRdv.prestation?.nom} · {format(new Date(prochainRdv.debut), 'd MMMM à HH:mm', { locale: dateLocale })}
              </div>
            </div>
          )}
          <Link to="/mes-rdv" className="text-xs font-semibold text-[#56627A] hover:text-[#0A1D35] transition-colors">
            Voir tous mes rendez-vous →
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
