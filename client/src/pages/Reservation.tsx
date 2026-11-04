import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, addDays, startOfDay, isBefore } from 'date-fns';
import { useDateLocale, useTimeFormat } from '../hooks/useDateLocale';
import { Check, ChevronLeft, ChevronRight, Clock, User, Video, Shield, ArrowRight, Calendar, LayoutGrid } from 'lucide-react';
import { InlineWidget } from 'react-calendly';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../components/Layout';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { localizePrestation } from '../lib/i18nUtils';
import type { Prestation, Creneau } from '@synego/shared';

const CALENDLY_URL = 'https://calendly.com/sandidkemyl2003/30min';

export default function Reservation() {
  const { t, i18n } = useTranslation();
  const dateLocale = useDateLocale();
  const { timeFormat } = useTimeFormat();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token: clientToken, prenom: authPrenom, nom: authNom } = useClientAuth();
  const autoAdvanced = useRef(false);
  const [mode, setMode] = useState<'direct' | 'calendly'>('direct');
  const [typeFilter, setTypeFilter] = useState<'all' | 'coaching' | 'seminaire' | 'autre'>('all');

  const JOURS = t('agendaParam.jours', { returnObjects: true }) as string[];

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [prestationId, setPrestationId] = useState<number | null>(() => {
    const p = searchParams.get('prestation');
    return p ? (parseInt(p, 10) || null) : null;
  });
  const [semaine, setSemaine] = useState(0);
  const [creneaux, setCreneaux] = useState<Record<string, Creneau[]>>({});
  const [loadingCreneaux, setLoadingCreneaux] = useState(false);
  const [creneau, setCreneau] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [motif, setMotif] = useState('');
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '', consentement: false });

  useEffect(() => {
    if (!clientToken) return;
    fetch('/api/client/me', { headers: { Authorization: `Bearer ${clientToken}` } })
      .then(r => r.json())
      .then(data => {
        setForm({ prenom: data.prenom || authPrenom || '', nom: data.nom || authNom || '', email: data.email || '', telephone: data.telephone || '', consentement: true });
      })
      .catch(() => setForm(f => ({ ...f, prenom: authPrenom || '', nom: authNom || '', consentement: true })));
  }, [clientToken]);

  useEffect(() => {
    fetch('/api/public/prestations')
      .then(r => r.json())
      .then(data => {
        setPrestations(Array.isArray(data) ? data : []);
      })
      .catch(() => toast.error(t('reservation.erreurPrestations')));
  }, []);

  // Auto-advance to step 2 when prestation pre-selected via URL
  useEffect(() => {
    if (prestationId && prestations.length > 0 && !autoAdvanced.current) {
      autoAdvanced.current = true;
      setStep(2);
    }
  }, [prestations, prestationId]);

  useEffect(() => {
    if (!prestationId) return;
    setLoadingCreneaux(true);
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
      .catch(() => toast.error(t('reservation.erreurCreneaux')))
      .finally(() => setLoadingCreneaux(false));
  }, [prestationId, semaine]);

  const prestation = prestations.find(p => p.id === prestationId);
  const prestationLocalized = prestation ? localizePrestation(prestation, i18n.language) : undefined;
  const jours = Array.from({ length: 7 }, (_, i) => addDays(addDays(startOfDay(new Date()), semaine * 7), i));

  async function reserver() {
    if (!form.consentement) { toast.error(t('reservation.accepterRgpd')); return; }
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

  const stepLabels = [t('reservation.etape1'), t('reservation.etape2'), clientToken ? t('reservation.etape3') : t('reservation.titreCoordonnees')];

  const inputClass = 'w-full border border-[#E7DCCD] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6CAED6] transition placeholder:text-[#A8B8C8]';
  const labelClass = 'block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-1.5';

  // Recap sidebar — reused in steps 2 & 3
  const RecapSidebar = () => (
    <div className="bg-white border border-[#E7DCCD] rounded-[22px] overflow-hidden shadow-sm h-fit">
      {prestation && <div className="h-1.5 w-full" style={{ background: prestation.couleur || '#6CAED6' }} />}
      <div className="p-6">
        <p className="text-xs font-bold tracking-widest uppercase text-[#56627A] mb-5">{t('reservation.recap')}</p>
        <div className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[#56627A] shrink-0">{t('reservation.prestation')}</span>
            <span className="font-semibold text-[#0A1D35] text-right">{prestationLocalized?.nom || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#56627A]">{t('reservation.duree')}</span>
            <span className="font-semibold text-[#0A1D35]">{prestation?.duree} {t('reservation.min')}</span>
          </div>
          {creneau && (
            <div className="border-t border-[#E7DCCD] pt-3">
              <span className="text-[#56627A] block mb-1">{t('reservation.date')}</span>
              <p className="font-semibold text-[#0A1D35] capitalize text-sm">
                {format(new Date(creneau), `EEEE d MMMM`, { locale: dateLocale })}
              </p>
              <p className="text-[#56627A] text-sm" translate="no">
                {format(new Date(creneau), timeFormat)}
              </p>
            </div>
          )}
        </div>

        {creneau && (
          <div className="mt-4 flex items-center gap-2 bg-[#D0E7F5] rounded-[10px] px-3 py-2.5">
            <Video size={13} className="text-[#0A5A8A] shrink-0" />
            <span className="text-xs font-medium text-[#0A5A8A]">{t('reservation.lienMeetAuto')}</span>
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 bg-[#F7F2EB] rounded-[10px] px-3 py-2.5">
          <Shield size={13} className="text-[#56627A] shrink-0" />
          <span className="text-xs text-[#56627A]">{t('reservation.donneesProtegees')}</span>
        </div>
      </div>
    </div>
  );

  return (
    <PublicLayout>
      {/* Mode switcher */}
      <div className="bg-white border-b border-[#E7DCCD]">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => setMode('direct')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === 'direct'
                ? 'bg-[#0A1D35] text-white'
                : 'border border-[#E7DCCD] text-[#56627A] hover:bg-[#F7F2EB]'
            }`}
          >
            <LayoutGrid size={15} /> {t('reservationType.reservationDirecte')}
          </button>
          <button
            onClick={() => setMode('calendly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              mode === 'calendly'
                ? 'bg-[#0A1D35] text-white'
                : 'border border-[#E7DCCD] text-[#56627A] hover:bg-[#F7F2EB]'
            }`}
          >
            <Calendar size={15} /> {t('reservationType.calendly')}
          </button>
        </div>
      </div>

      {/* Calendly inline widget */}
      {mode === 'calendly' && (
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="bg-white border border-[#E7DCCD] rounded-[22px] overflow-hidden shadow-sm">
            <InlineWidget
              url={CALENDLY_URL}
              styles={{ height: '700px', minWidth: '320px' }}
            />
          </div>
        </div>
      )}

      {/* Direct booking */}
      {mode === 'direct' && (<><div className="bg-white border-b border-[#E7DCCD] sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-1">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${step > i + 1 ? 'bg-[#1E6B4A] text-white' : step === i + 1 ? 'bg-[#0A1D35] text-white ring-4 ring-[#0A1D35]/10' : 'bg-[#E7DCCD] text-[#A8B8C8]'}`}>
                    {step > i + 1 ? <Check size={11} /> : i + 1}
                  </div>
                  <span className={`text-sm font-semibold hidden sm:block ${step === i + 1 ? 'text-[#0A1D35]' : step > i + 1 ? 'text-[#1E6B4A]' : 'text-[#A8B8C8]'}`}>{label}</span>
                </div>
                {i < 2 && <div className={`w-8 h-0.5 mx-2 rounded-full transition-colors ${step > i + 1 ? 'bg-[#1E6B4A]' : 'bg-[#E7DCCD]'}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">

        {/* ── Étape 1 : Prestation ── */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-[#0A1D35] mb-1">{t('reservation.titreEtape1')}</h2>
              <p className="text-sm text-[#56627A]">{t('reservation.selectionnerType')}</p>
            </div>

            {/* Type filter tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {([
                ['all', t('reservationType.tous')],
                ['coaching', t('reservationType.coaching')],
                ['seminaire', t('reservationType.seminaire')],
                ['autre', t('reservationType.autre')],
              ] as [typeof typeFilter, string][]).map(([key, label]) => {
                const active = typeFilter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTypeFilter(key)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-[#0A1D35] text-white'
                        : 'bg-white border border-[#E7DCCD] text-[#56627A] hover:bg-[#F7F2EB]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {prestations.filter(p => {
                if (typeFilter === 'all') return true;
                const pt = (p as Prestation & { type?: string }).type;
                if (typeFilter === 'autre') return !pt || pt === 'autre';
                return pt === typeFilter;
              }).map(raw => {
                const p = localizePrestation(raw, i18n.language);
                const selected = prestationId === p.id;
                return (
                  <button key={p.id} onClick={() => setPrestationId(p.id)}
                    className={`text-left rounded-[22px] p-6 transition-all border-2 ${selected ? 'border-[#0A1D35] bg-white shadow-md' : 'border-[#E7DCCD] bg-white hover:border-[#6CAED6] hover:shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: (p.couleur || '#6CAED6') + '20' }}>
                        <div className="w-3.5 h-3.5 rounded-full" style={{ background: p.couleur || '#6CAED6' }} />
                      </div>
                      {selected && (
                        <div className="w-6 h-6 rounded-full bg-[#1E6B4A] flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-[#0A1D35] mb-1 leading-snug">{p.nom}</div>
                    {p.description && <div className="text-xs text-[#56627A] leading-relaxed mb-3">{p.description}</div>}
                    <div className="flex items-center gap-2 flex-wrap mt-auto">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#56627A] bg-[#F7F2EB] px-2 py-1 rounded-full">
                        <Clock size={10} /> {p.duree} {t('reservation.min')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <button disabled={!prestationId} onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-8 py-3.5 rounded-[14px] disabled:opacity-40 hover:bg-[#1C3352] transition-colors">
              {t('reservation.continuer')} <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ── Étape 2 : Créneau ── */}
        {step === 2 && (
          <div className="grid md:grid-cols-[1fr_280px] gap-8 items-start">
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-[#0A1D35] mb-1">{t('reservation.titreEtape2')}</h2>
                <p className="text-sm text-[#56627A]">{prestationLocalized?.nom} · {prestation?.duree} {t('reservation.min')}</p>
              </div>

              <div className="bg-white border border-[#E7DCCD] rounded-[22px] p-5 shadow-sm">
                {/* Week nav */}
                <div className="flex items-center justify-between mb-5">
                  <button onClick={() => setSemaine(s => Math.max(0, s - 1))} disabled={semaine === 0}
                    className="p-2 border border-[#E7DCCD] rounded-xl hover:bg-[#F7F2EB] transition-colors disabled:opacity-30">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="font-bold text-[#0A1D35] text-sm capitalize">
                    {format(jours[0], 'd MMM', { locale: dateLocale })} — {format(jours[6], 'd MMM yyyy', { locale: dateLocale })}
                  </span>
                  <button onClick={() => setSemaine(s => s + 1)}
                    className="p-2 border border-[#E7DCCD] rounded-xl hover:bg-[#F7F2EB] transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Grid */}
                <div className={`grid grid-cols-7 gap-1.5 transition-opacity ${loadingCreneaux ? 'opacity-40 pointer-events-none' : ''}`}>
                  {jours.map(jour => {
                    const key = format(jour, 'yyyy-MM-dd');
                    const slots = creneaux[key]?.filter(c => c.disponible) || [];
                    const passe = isBefore(jour, startOfDay(new Date()));
                    const hasSlots = !passe && slots.length > 0;
                    return (
                      <div key={key}>
                        {/* Day header */}
                        <div className="text-center mb-2">
                          <div className="text-[10px] text-[#A8B8C8] font-bold uppercase tracking-wide" translate="no">
                            {JOURS[jour.getDay() === 0 ? 6 : jour.getDay() - 1]?.slice(0, 3)}
                          </div>
                          <div className={`text-sm font-bold mt-0.5 ${hasSlots ? 'text-[#0A1D35]' : 'text-[#C8D4E0]'}`}>
                            {format(jour, 'd')}
                          </div>
                          {hasSlots && (
                            <div className="text-[9px] text-[#1E6B4A] font-bold mt-0.5">{slots.length}</div>
                          )}
                        </div>
                        {/* Slots */}
                        <div className="flex flex-col gap-1">
                          {passe ? (
                            <div className="h-9 rounded-xl bg-[#F7F2EB] opacity-40" />
                          ) : slots.length === 0 ? (
                            <div className="h-9 rounded-xl bg-[#F7F2EB] flex items-center justify-center">
                              <span className="text-[10px] text-[#C8D4E0]">—</span>
                            </div>
                          ) : slots.map(s => (
                            <button key={s.debut} onClick={() => setCreneau(s.debut)}
                              className={`h-9 rounded-xl text-[11px] font-bold transition-all ${creneau === s.debut ? 'bg-[#0A1D35] text-white shadow-md scale-105' : 'bg-[#D0E7F5] text-[#0A5A8A] hover:bg-[#6CAED6] hover:text-white'}`}
                              translate="no">
                              {format(new Date(s.debut), timeFormat)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected slot banner */}
              {creneau && (
                <div className="mt-4 flex items-center gap-3 p-4 bg-[#DCEFE4] rounded-[14px]">
                  <Check size={16} className="text-[#1E6B4A] shrink-0" />
                  <span className="text-sm font-semibold text-[#1E6B4A] capitalize" translate="no">
                    {format(new Date(creneau), `EEEE d MMMM '${t('common.at')}' ${timeFormat}`, { locale: dateLocale })}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-4 mt-6">
                <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm text-[#56627A] hover:text-[#0A1D35] font-medium transition-colors">
                  <ChevronLeft size={15} />{t('reservation.retour')}
                </button>
                <button disabled={!creneau} onClick={() => setStep(3)}
                  className="flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-8 py-3.5 rounded-[14px] disabled:opacity-40 hover:bg-[#1C3352] transition-colors">
                  {t('reservation.continuer')} <ArrowRight size={15} />
                </button>
              </div>
            </div>
            <div className="hidden md:block sticky top-24">
              <RecapSidebar />
            </div>
          </div>
        )}

        {/* ── Étape 3 connecté ── */}
        {step === 3 && clientToken && (
          <div className="grid md:grid-cols-[1fr_280px] gap-8 items-start">
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-[#0A1D35] mb-1">{t('reservation.titreEtape3')}</h2>
                <p className="text-sm text-[#56627A]">{t('reservation.connecteInfo')}</p>
              </div>

              {/* Connected user card */}
              <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-5 mb-5 flex items-center gap-4 shadow-sm">
                <div className="w-11 h-11 rounded-full bg-[#D0E7F5] flex items-center justify-center shrink-0">
                  <User size={18} className="text-[#0A5A8A]" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-[#0A1D35] text-sm">{form.prenom} {form.nom}</p>
                  <p className="text-xs text-[#56627A]">{form.email}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#DCEFE4] text-[#1E6B4A] text-[11px] font-bold px-3 py-1.5 rounded-full">
                  <Check size={11} /> {t('reservation.connecte')}
                </div>
              </div>

              {/* Motif */}
              <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-6 shadow-sm">
                <label className={labelClass}>
                  {t('reservation.motif')} <span className="text-[#9B2C1F]">*</span>
                </label>
                <textarea required value={motif} onChange={e => setMotif(e.target.value)} rows={4}
                  placeholder={t('reservation.motifPlaceholder')}
                  className="w-full border border-[#E7DCCD] rounded-[12px] px-4 py-3 text-sm bg-[#FFFDFA] focus:outline-none focus:ring-2 focus:ring-[#6CAED6] transition resize-none" />
              </div>

              <div className="flex items-center gap-4 mt-6">
                <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-sm text-[#56627A] hover:text-[#0A1D35] font-medium transition-colors">
                  <ChevronLeft size={15} />{t('reservation.retour')}
                </button>
                <button disabled={loading || !motif.trim()} onClick={reserver}
                  className="flex items-center gap-2 bg-[#1E6B4A] text-white font-bold px-8 py-3.5 rounded-[14px] disabled:opacity-40 hover:bg-[#155538] transition-colors">
                  {loading ? (
                    <span className="flex gap-1">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  ) : (
                    <><Check size={15} /> {t('reservation.confirmer')}</>
                  )}
                </button>
              </div>
            </div>
            <div className="hidden md:block sticky top-24">
              <RecapSidebar />
            </div>
          </div>
        )}

        {/* ── Étape 3 non connecté ── */}
        {step === 3 && !clientToken && (
          <div className="grid md:grid-cols-[1fr_280px] gap-8 items-start">
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-extrabold text-[#0A1D35] mb-1">{t('reservation.titreCoordonnees')}</h2>
                <p className="text-sm text-[#56627A]">{t('reservation.infoUtilisees')}</p>
              </div>

              <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-6 shadow-sm space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'prenom', label: t('reservation.prenom'), type: 'text', required: true },
                    { key: 'nom', label: t('reservation.nom'), type: 'text', required: true },
                  ].map(f => (
                    <div key={f.key}>
                      <label className={labelClass}>{f.label} *</label>
                      <input type={f.type} value={form[f.key as keyof typeof form] as string}
                        onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className={inputClass} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className={labelClass}>{t('reservation.email')} *</label>
                  <input type="email" value={form.email}
                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder={t('connexion.emailPlaceholder')} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t('reservation.telephone')}</label>
                  <input type="tel" value={form.telephone}
                    onChange={e => setForm(prev => ({ ...prev, telephone: e.target.value }))}
                    placeholder="+33 6 …" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    {t('reservation.motif')} <span className="text-[#9B2C1F]">*</span>
                  </label>
                  <textarea required value={motif} onChange={e => setMotif(e.target.value)} rows={3}
                    placeholder={t('reservation.motifPlaceholder')}
                    className="w-full border border-[#E7DCCD] rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6CAED6] transition resize-none placeholder:text-[#A8B8C8]" />
                </div>
                <label className="flex items-start gap-3 cursor-pointer p-3 bg-[#F7F2EB] rounded-xl">
                  <input type="checkbox" checked={form.consentement}
                    onChange={e => setForm(prev => ({ ...prev, consentement: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-[#0A1D35] shrink-0" />
                  <span className="text-xs text-[#56627A] leading-relaxed">{t('reservation.rgpd')}</span>
                </label>
              </div>

              <div className="flex items-center gap-4 mt-6">
                <button onClick={() => setStep(2)} className="flex items-center gap-1.5 text-sm text-[#56627A] hover:text-[#0A1D35] font-medium transition-colors">
                  <ChevronLeft size={15} />{t('reservation.retour')}
                </button>
                <button disabled={!form.nom || !form.prenom || !form.email || !motif.trim() || loading} onClick={reserver}
                  className="flex items-center gap-2 bg-[#1E6B4A] text-white font-bold px-8 py-3.5 rounded-[14px] disabled:opacity-40 hover:bg-[#155538] transition-colors">
                  {loading ? (
                    <span className="flex gap-1">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </span>
                  ) : (
                    <><Check size={15} /> {t('reservation.confirmer')}</>
                  )}
                </button>
              </div>
            </div>
            <div className="hidden md:block sticky top-24">
              <RecapSidebar />
            </div>
          </div>
        )}
      </div></>)}
    </PublicLayout>
  );
}
