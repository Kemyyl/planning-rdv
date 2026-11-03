import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, addDays, startOfDay, isBefore } from 'date-fns';
import { useDateLocale, useTimeFormat } from '../hooks/useDateLocale';
import { Check, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../components/Layout';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { localizePrestation } from '../lib/i18nUtils';
import type { Prestation, Creneau } from '@synego/shared';

export default function Reservation() {
  const { t, i18n } = useTranslation();
  const dateLocale = useDateLocale();
  const { timeFormat } = useTimeFormat();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token: clientToken, prenom: authPrenom, nom: authNom } = useClientAuth();

  const JOURS = t('agendaParam.jours', { returnObjects: true }) as string[];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [prestationId, setPrestationId] = useState<number | null>(() => {
    const p = searchParams.get('prestation');
    return p ? (parseInt(p, 10) || null) : null;
  });
  const [semaine, setSemaine] = useState(0);
  const [creneaux, setCreneaux] = useState<Record<string, Creneau[]>>({});
  const [creneau, setCreneau] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [motif, setMotif] = useState('');
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '', consentement: false });

  // Pre-fill form when client is logged in
  useEffect(() => {
    if (!clientToken) return;
    fetch('/api/client/me', { headers: { Authorization: `Bearer ${clientToken}` } })
      .then(r => r.json())
      .then(data => {
        setForm({
          prenom: data.prenom || authPrenom || '',
          nom: data.nom || authNom || '',
          email: data.email || '',
          telephone: data.telephone || '',
          consentement: true,
        });
      })
      .catch(() => {
        setForm(f => ({ ...f, prenom: authPrenom || '', nom: authNom || '', consentement: true }));
      });
  }, [clientToken]);

  useEffect(() => {
    fetch('/api/public/prestations')
      .then(r => r.json())
      .then(setPrestations)
      .catch(() => toast.error('Erreur lors du chargement des prestations'));
  }, []);

  useEffect(() => {
    if (!prestationId) return;
    const debut = addDays(startOfDay(new Date()), semaine * 7);
    const fin = addDays(debut, 6);
    fetch(`/api/public/creneaux?prestation_id=${prestationId}&debut=${debut.toISOString()}&fin=${fin.toISOString()}`)
      .then(r => r.json())
      .then((data: Creneau[]) => {
        const grouped: Record<string, Creneau[]> = {};
        data.forEach(c => {
          const key = format(new Date(c.debut), 'yyyy-MM-dd');
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(c);
        });
        setCreneaux(grouped);
      })
      .catch(() => toast.error('Erreur lors du chargement des créneaux'));
  }, [prestationId, semaine]);

  const prestation = prestations.find(p => p.id === prestationId);
  const prestationLocalized = prestation ? localizePrestation(prestation, i18n.language) : undefined;

  const jours = Array.from({ length: 7 }, (_, i) => addDays(addDays(startOfDay(new Date()), semaine * 7), i));

  async function reserver() {
    if (!form.consentement) { toast.error('Vous devez accepter la politique de confidentialité'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/public/rdv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prestation_id: prestationId, debut: creneau, commentaire: motif, client: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur');
      navigate(`/confirmation/${data.id}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur lors de la réservation');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Étapes */}
        <div className="flex items-center mb-10">
          {([t('reservation.etape1'), t('reservation.etape2'), clientToken ? t('reservation.etape3') : t('reservation.titreCoordonnees')] as const).map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step > i + 1 ? 'bg-[#1E6B4A] text-white' : step === i + 1 ? 'bg-[#0A1D35] text-white ring-4 ring-[#0A1D35]/10' : 'bg-[#E7DCCD] text-[#56627A]'}`}>
                  {step > i + 1 ? <Check size={12} /> : i + 1}
                </div>
                <span className={`text-sm font-semibold hidden sm:block ${step === i + 1 ? 'text-[#0A1D35]' : step > i + 1 ? 'text-[#1E6B4A]' : 'text-[#A8B8C8]'}`}>{label}</span>
              </div>
              {i < 2 && <div className={`w-10 h-0.5 mx-2 rounded-full transition-colors ${step > i + 1 ? 'bg-[#1E6B4A]' : 'bg-[#E7DCCD]'}`} />}
            </div>
          ))}
        </div>

        {/* Étape 1 : Prestation */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-extrabold text-[#0A1D35] mb-6">{t('reservation.titreEtape1')}</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {prestations.map(raw => { const p = localizePrestation(raw, i18n.language); return (
                <button
                  key={p.id}
                  onClick={() => setPrestationId(p.id)}
                  className={`text-left bg-[#FFFDFA] border rounded-[22px] p-6 transition-all hover:shadow-md ${prestationId === p.id ? 'border-[#0A1D35] ring-2 ring-[#0A1D35]/10' : 'border-[#E7DCCD]'}`}
                >
                  <div className="w-3 h-3 rounded-full mb-4" style={{ background: p.couleur }} />
                  <div className="font-bold text-[#0A1D35] mb-1">{p.nom}</div>
                  <div className="text-sm text-[#56627A] mb-3">{p.description}</div>
                  <div className="flex items-center gap-3 text-sm flex-wrap">
                    <span className="flex items-center gap-1 text-[#56627A]"><Clock size={13} />{p.duree} {t('reservation.min')}</span>
                    {raw.prix ? (
                      <span className="font-semibold text-[#0A1D35]">{raw.prix} €</span>
                    ) : null}
                  </div>
                  {prestationId === p.id && <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[#1E6B4A]"><Check size={13} />{t('reservation.selectionne')}</div>}
                </button>
              );})}

            </div>
            <button
              disabled={!prestationId}
              onClick={() => setStep(2)}
              className="bg-[#0A1D35] text-white font-bold px-8 py-3 rounded-[14px] disabled:opacity-40 hover:bg-[#1C3352] transition-colors"
            >
              {t('reservation.continuer')} →
            </button>
          </div>
        )}

        {/* Étape 2 : Créneau */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-extrabold text-[#0A1D35] mb-2">{t('reservation.titreEtape2')}</h2>
            <p className="text-[#56627A] mb-6 text-sm">{prestationLocalized?.nom} · {prestation?.duree} {t('reservation.min')}</p>
            <div className="bg-[#FFFDFA] border border-[#E7DCCD] rounded-[22px] p-6">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setSemaine(s => Math.max(0, s - 1))} className="p-2 rounded-lg hover:bg-[#F7F2EB] transition-colors" disabled={semaine === 0}>
                  <ChevronLeft size={18} />
                </button>
                <span className="font-bold text-[#0A1D35] text-sm">
                  {format(jours[0], 'd MMM', { locale: dateLocale })} — {format(jours[6], 'd MMM yyyy', { locale: dateLocale })}
                </span>
                <button onClick={() => setSemaine(s => s + 1)} className="p-2 rounded-lg hover:bg-[#F7F2EB] transition-colors">
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {jours.map(jour => {
                  const key = format(jour, 'yyyy-MM-dd');
                  const slots = creneaux[key]?.filter(c => c.disponible) || [];
                  const passe = isBefore(jour, startOfDay(new Date()));
                  return (
                    <div key={key}>
                      <div className="text-center mb-2">
                        <div className="text-xs text-[#56627A] font-medium">{JOURS[jour.getDay() === 0 ? 6 : jour.getDay() - 1]}</div>
                        <div className="text-sm font-bold text-[#0A1D35]">{format(jour, 'd')}</div>
                      </div>
                      <div className="flex flex-col gap-1">
                        {passe ? (
                          <div className="h-8 rounded-lg bg-[#F7F2EB]" />
                        ) : slots.length === 0 ? (
                          <div className="h-8 rounded-lg bg-[#F7F2EB] flex items-center justify-center">
                            <span className="text-xs text-[#56627A]">—</span>
                          </div>
                        ) : slots.map(s => (
                          <button
                            key={s.debut}
                            onClick={() => setCreneau(s.debut)}
                            className={`h-9 rounded-xl text-xs font-semibold transition-all shadow-sm ${creneau === s.debut ? 'bg-[#0A1D35] text-white shadow-md' : 'bg-[#D0E7F5] text-[#0A1D35] hover:bg-[#6CAED6] hover:text-white'}`}
                          >
                            {format(new Date(s.debut), timeFormat)}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {creneau && (
              <div className="mt-4 p-4 bg-[#DCEFE4] rounded-[14px] text-sm font-medium text-[#1E6B4A]">
                ✓ {format(new Date(creneau), `EEEE d MMMM '${t('common.at')}' ${timeFormat}`, { locale: dateLocale })}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-[#56627A] hover:text-[#0A1D35] font-medium">
                <ChevronLeft size={16} />{t('reservation.retour')}
              </button>
              <button
                disabled={!creneau}
                onClick={() => setStep(3)}
                className="bg-[#0A1D35] text-white font-bold px-8 py-3 rounded-[14px] disabled:opacity-40 hover:bg-[#1C3352] transition-colors"
              >
                {t('reservation.continuer')} →
              </button>
            </div>
          </div>
        )}

        {/* Étape 3 : Confirmation (connecté) ou Coordonnées (non connecté) */}
        {step === 3 && clientToken && (
          <div>
            <h2 className="text-2xl font-extrabold text-[#0A1D35] mb-2">{t('reservation.titreEtape3')}</h2>
            <p className="text-[#56627A] text-sm mb-8">{t('reservation.connecteInfo')}</p>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Compte connecté */}
              <div className="bg-white border border-[#E7DCCD] rounded-[22px] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#D0E7F5] flex items-center justify-center shrink-0">
                    <User size={18} className="text-[#0A1D35]" />
                  </div>
                  <div>
                    <p className="font-bold text-[#0A1D35] text-sm">{form.prenom} {form.nom}</p>
                    <p className="text-xs text-[#56627A]">{form.email}</p>
                  </div>
                </div>
                <div className="bg-[#DCEFE4] text-[#1E6B4A] text-xs font-semibold px-3 py-2 rounded-[10px] flex items-center gap-1.5 mb-5">
                  <Check size={12} /> Connecté — coordonnées enregistrées
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#0A1D35] mb-1.5">
                    {t('reservation.motif')} <span className="text-[#9B2C1F]">*</span>
                  </label>
                  <textarea
                    required
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    rows={3}
                    placeholder={t('reservation.motifPlaceholder')}
                    className="w-full border border-[#E7DCCD] rounded-[12px] px-4 py-3 text-sm bg-[#FFFDFA] focus:outline-none focus:ring-2 focus:ring-[#6CAED6] transition resize-none"
                  />
                </div>
              </div>

              {/* Récapitulatif */}
              <div className="bg-[#FFFDFA] border border-[#E7DCCD] rounded-[22px] p-6 h-fit">
                <p className="text-xs font-bold tracking-widest uppercase text-[#56627A] mb-4">{t('reservation.recap')}</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#56627A]">Prestation</span>
                    <span className="font-semibold text-[#0A1D35]">{prestationLocalized?.nom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#56627A]">{t('reservation.duree')}</span>
                    <span className="font-semibold text-[#0A1D35]">{prestation?.duree} {t('reservation.min')}</span>
                  </div>
                  <div className="border-t border-[#E7DCCD] pt-3">
                    <span className="text-[#56627A]">{t('reservation.date')}</span>
                    <p className="font-semibold text-[#0A1D35] capitalize">
                      {format(new Date(creneau), `EEEE d MMMM '${t('common.at')}' ${timeFormat}`, { locale: dateLocale })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-[#56627A] hover:text-[#0A1D35] font-medium">
                <ChevronLeft size={16} />{t('reservation.retour')}
              </button>
              <button
                disabled={loading || !motif.trim()}
                onClick={reserver}
                className="bg-[#0A1D35] text-white font-bold px-8 py-3 rounded-[14px] disabled:opacity-40 hover:bg-[#1C3352] transition-colors"
              >
                {loading ? t('reservation.enCours') : t('reservation.confirmer')}
              </button>
            </div>
          </div>
        )}

        {step === 3 && !clientToken && (
          <div>
            <h2 className="text-2xl font-extrabold text-[#0A1D35] mb-6">{t('reservation.titreCoordonnees')}</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                {[
                  { key: 'prenom', label: t('reservation.prenom'), type: 'text', required: true },
                  { key: 'nom', label: t('reservation.nom'), type: 'text', required: true },
                  { key: 'email', label: t('reservation.email'), type: 'email', required: true },
                  { key: 'telephone', label: t('reservation.telephone'), type: 'tel', required: false },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-semibold text-[#0A1D35] mb-1">{f.label}{f.required && ' *'}</label>
                    <input
                      type={f.type}
                      value={form[f.key as keyof typeof form] as string}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full border border-[#E7DCCD] rounded-[12px] px-4 py-3 text-sm bg-[#FFFDFA] focus:outline-none focus:ring-2 focus:ring-[#6CAED6] focus:border-[#6CAED6] transition"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-semibold text-[#0A1D35] mb-1.5">
                    {t('reservation.motif')} <span className="text-[#9B2C1F]">*</span>
                  </label>
                  <textarea
                    required
                    value={motif}
                    onChange={e => setMotif(e.target.value)}
                    rows={3}
                    placeholder={t('reservation.motifPlaceholder')}
                    className="w-full border border-[#E7DCCD] rounded-[12px] px-4 py-3 text-sm bg-[#FFFDFA] focus:outline-none focus:ring-2 focus:ring-[#6CAED6] transition resize-none"
                  />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.consentement}
                    onChange={e => setForm(prev => ({ ...prev, consentement: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-[#0A1D35]"
                  />
                  <span className="text-xs text-[#56627A] leading-relaxed">
                    {t('reservation.rgpd')}
                  </span>
                </label>
              </div>

              {/* Récapitulatif */}
              <div className="bg-[#FFFDFA] border border-[#E7DCCD] rounded-[22px] p-6 h-fit">
                <p className="text-xs font-bold tracking-widest uppercase text-[#56627A] mb-4">{t('reservation.recap')}</p>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#56627A]">Prestation</span>
                    <span className="font-semibold text-[#0A1D35]">{prestationLocalized?.nom}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#56627A]">{t('reservation.duree')}</span>
                    <span className="font-semibold text-[#0A1D35]">{prestation?.duree} {t('reservation.min')}</span>
                  </div>
                  <div className="border-t border-[#E7DCCD] pt-3">
                    <span className="text-[#56627A]">{t('reservation.date')}</span>
                    <p className="font-semibold text-[#0A1D35] capitalize">
                      {format(new Date(creneau), `EEEE d MMMM '${t('common.at')}' ${timeFormat}`, { locale: dateLocale })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setStep(2)} className="flex items-center gap-1 text-[#56627A] hover:text-[#0A1D35] font-medium">
                <ChevronLeft size={16} />{t('reservation.retour')}
              </button>
              <button
                disabled={!form.nom || !form.prenom || !form.email || !motif.trim() || loading}
                onClick={reserver}
                className="bg-[#0A1D35] text-white font-bold px-8 py-3 rounded-[14px] disabled:opacity-40 hover:bg-[#1C3352] transition-colors"
              >
                {loading ? t('reservation.enCours') : t('reservation.confirmer')}
              </button>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
