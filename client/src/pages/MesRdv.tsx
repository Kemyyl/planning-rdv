import { useEffect, useState } from 'react';
import { Link, useSearchParams, Navigate } from 'react-router-dom';
import { format, isPast, addHours } from 'date-fns';
import { useDateLocale, useTimeFormat } from '../hooks/useDateLocale';
import { Video, Calendar, AlertCircle, Download, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { PublicLayout, PatientLayout } from '../components/Layout';
import { useClientAuth } from '../contexts/ClientAuthContext';
import type { RendezVous } from '@synego/shared';

interface RdvWithNotes extends RendezVous {
  notes_seance?: { id: string; contenu: string; created_at: string }[];
  lien_meet?: string;
}

interface DevisClientItem {
  id: string;
  numero: string;
  prestation_nom: string;
  nb_seances: number;
  total: number;
  statut: 'envoye' | 'accepte' | 'refuse' | 'expire';
  email_envoye: boolean;
  validite_date: string;
  created_at: string;
  facture_numero?: string;
  facture_date?: string;
  prix_par_seance: number;
}

function DateBox({ date }: { date: Date }) {
  const dateLocale = useDateLocale();
  return (
    <div className="w-14 h-14 bg-[#0A1D35] rounded-[14px] flex flex-col items-center justify-center shrink-0">
      <span className="text-white font-bold text-xl leading-none">{format(date, 'd')}</span>
      <span className="text-[#6CAED6] text-xs font-medium capitalize" translate="no">{format(date, 'MMM', { locale: dateLocale })}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-6 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 bg-[#E7DCCD] rounded-[14px] shrink-0" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 bg-[#E7DCCD] rounded-full w-2/3" />
          <div className="h-3 bg-[#F7F2EB] rounded-full w-1/2" />
          <div className="h-6 bg-[#F7F2EB] rounded-full w-24 mt-2" />
        </div>
        <div className="space-y-2">
          <div className="h-8 w-24 bg-[#E7DCCD] rounded-[10px]" />
          <div className="h-8 w-24 bg-[#F7F2EB] rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}

export default function MesRdv() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { timeFormat } = useTimeFormat();
  const [params] = useSearchParams();
  const jeton = params.get('jeton');
  const { token: clientToken, prenom, nom, clientId } = useClientAuth();

  const [rdvs, setRdvs] = useState<RdvWithNotes[]>([]);
  const [rdvJeton, setRdvJeton] = useState<(RendezVous & { lien_meet?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllPast, setShowAllPast] = useState(false);
  const [devisList, setDevisList] = useState<DevisClientItem[]>([]);
  const [devisLoading, setDevisLoading] = useState(false);
  const [acceptingDevisId, setAcceptingDevisId] = useState<string | null>(null);
  const [downloadingFactureId, setDownloadingFactureId] = useState<string | null>(null);

  const fullName = [prenom, nom].filter(Boolean).join(' ') || prenom || '';
  const initials = fullName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  useEffect(() => {
    if (clientToken) {
      fetch('/api/client/rdv', { headers: { Authorization: `Bearer ${clientToken}` } })
        .then(r => r.json())
        .then(data => setRdvs(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
      setDevisLoading(true);
      fetch('/api/client/devis', { headers: { Authorization: `Bearer ${clientToken}` } })
        .then(r => r.json())
        .then(d => setDevisList(Array.isArray(d) ? d : []))
        .finally(() => setDevisLoading(false));
    } else if (jeton) {
      fetch(`/api/public/rdv/jeton/${jeton}`)
        .then(r => r.json())
        .then(data => { if (!data.error) setRdvJeton(data); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [clientToken, jeton]);

  async function downloadPdf(rdvId: number) {
    if (!clientToken) return;
    const res = await fetch(`/api/client/rdv/${rdvId}/pdf`, { headers: { Authorization: `Bearer ${clientToken}` } });
    if (!res.ok) { toast.error(t('mesRdv.erreurPdf')); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `seance.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  function canCancel(debut: string): boolean {
    return new Date(debut) > addHours(new Date(), 24);
  }

  function loadDevis() {
    if (!clientToken) return;
    setDevisLoading(true);
    fetch('/api/client/devis', { headers: { Authorization: `Bearer ${clientToken}` } })
      .then(r => r.json())
      .then(d => setDevisList(Array.isArray(d) ? d : []))
      .finally(() => setDevisLoading(false));
  }

  async function annuler(rdv: RendezVous) {
    if (!confirm('Confirmer l\'annulation ?')) return;
    const res = await fetch(`/api/public/rdv/${rdv.id}/annuler`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jeton: rdv.jeton_annulation }),
    });
    if (res.ok) {
      toast.success(t('mesRdv.rdvAnnule'));
      setRdvs(prev => prev.map(r => r.id === rdv.id ? { ...r, statut: 'annule' } : r));
    } else { toast.error(t('mesRdv.erreurAnnulation')); }
  }

  async function accepterDevis(id: string) {
    if (!clientToken) return;
    setAcceptingDevisId(id);
    try {
      const res = await fetch(`/api/client/devis/${id}/accepter`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(t('mesRdv.devisAccepteOk'));
      loadDevis();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('mesRdv.erreurAcceptDevis'));
    } finally {
      setAcceptingDevisId(null);
    }
  }

  async function downloadFactureClient(item: DevisClientItem) {
    if (!clientToken) return;
    setDownloadingFactureId(item.id);
    try {
      const res = await fetch(`/api/client/devis/${item.id}/facture`, { headers: { Authorization: `Bearer ${clientToken}` } });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${item.facture_numero ?? item.numero}-facture.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('mesRdv.erreurPdf'));
    } finally {
      setDownloadingFactureId(null);
    }
  }

  // Not connected, no token
  if (!clientToken && !jeton && !loading) {
    return <Navigate to="/login" replace />;
  }

  // Jeton mode (no account)
  if (!clientToken && jeton && rdvJeton) {
    return (
      <PublicLayout>
        <div className="max-w-lg mx-auto px-6 py-14">
          <h1 className="text-2xl font-extrabold text-[#0A1D35] mb-6">{t('mesRdv.titre')}</h1>
          <div className="bg-white border border-[#E7DCCD] rounded-[22px] p-7 shadow-sm">
            <div className="flex items-start gap-4 mb-5">
              <DateBox date={new Date(rdvJeton.debut)} />
              <div className="flex-1">
                <div className="font-bold text-[#0A1D35] text-base mb-1">{rdvJeton.prestation?.nom || t('mesRdv.seance')}</div>
                <div className="flex items-center gap-1.5 text-sm text-[#56627A]" translate="no">
                  <Clock size={13} />
                  {format(new Date(rdvJeton.debut), timeFormat)}
                  {rdvJeton.fin ? ` – ${format(new Date(rdvJeton.fin), timeFormat)}` : ''}
                </div>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${rdvJeton.statut === 'confirme' ? 'bg-[#DCEFE4] text-[#1E6B4A]' : 'bg-[#F7DDD8] text-[#9B2C1F]'}`}>
                {rdvJeton.statut === 'confirme' ? t('mesRdv.confirme') : rdvJeton.statut}
              </span>
            </div>
            {rdvJeton.lien_meet && (
              <a href={rdvJeton.lien_meet} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-[#6CAED6] text-white font-bold text-sm py-3 rounded-[12px] hover:opacity-90 transition-opacity mb-3">
                <Video size={14} /> {t('mesRdv.rejoindre')}
              </a>
            )}
            {rdvJeton.statut === 'confirme' && !isPast(new Date(rdvJeton.debut)) && (
              canCancel(rdvJeton.debut) ? (
                <button onClick={() => annuler(rdvJeton)}
                  className="w-full text-sm border border-[#F7DDD8] text-[#9B2C1F] py-2.5 rounded-[12px] hover:bg-[#F7DDD8] transition-colors font-medium flex items-center justify-center gap-1.5">
                  <XCircle size={14} /> {t('mesRdv.annuler')}
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-[#56627A] bg-[#F7F2EB] rounded-[10px] px-3 py-2">
                  <AlertCircle size={12} /> {t('mesRdv.annulationBloquee')}
                </div>
              )
            )}
          </div>
        </div>
      </PublicLayout>
    );
  }

  const upcoming = rdvs.filter(r => r.statut !== 'annule' && !isPast(new Date(r.debut)));
  const cancelled = rdvs.filter(r => r.statut === 'annule').sort((a, b) => new Date(b.debut).getTime() - new Date(a.debut).getTime());
  const past = rdvs.filter(r => r.statut === 'confirme' && isPast(new Date(r.debut)));
  const sortedPast = [...past].sort((a, b) => new Date(b.debut).getTime() - new Date(a.debut).getTime());
  const allConfirmed = [...rdvs].filter(r => r.statut !== 'annule').sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
  function sessionNum(rdv: RendezVous) {
    return allConfirmed.findIndex(r => r.id === rdv.id) + 1;
  }
  const prochainRdv = upcoming[0];

  return (
    <PatientLayout title={prenom ? t('mesRdv.bonjour', { prenom }) : t('mesRdv.titre')}>
      <div className="max-w-5xl mx-auto">
        <div className="flex gap-8 items-start">

          {/* Main column */}
          <div className="flex-1 min-w-0">

            {/* Upcoming */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-extrabold text-[#0A1D35]">{t('mesRdv.titre')}</h2>
              {upcoming.length > 0 && (
                <span className="bg-[#D0E7F5] text-[#0A5A8A] text-xs font-bold px-3 py-1 rounded-full">
                  {upcoming.length} {t('mesRdv.aVenir')}
                </span>
              )}
            </div>

            {loading && (
              <div className="space-y-4 mb-10">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            )}

            {!loading && upcoming.length === 0 && (
              <div className="bg-white border border-dashed border-[#D9C9B4] rounded-[20px] p-10 text-center mb-8">
                <div className="w-12 h-12 bg-[#F7F2EB] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar size={20} className="text-[#A8B8C8]" />
                </div>
                <p className="font-semibold text-[#0A1D35] mb-1">{t('mesRdv.aucunRdv')}</p>
                <p className="text-sm text-[#56627A] mb-5">{t('mesRdv.reserverProchaine')}</p>
                <Link to="/reservation"
                  className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-2.5 rounded-[12px] hover:bg-[#1C3352] transition-colors text-sm">
                  <Plus size={14} /> {t('mesRdv.reserver')}
                </Link>
              </div>
            )}

            <div className="space-y-4 mb-10">
              {upcoming.map(r => {
                const debut = new Date(r.debut);
                const fin = r.fin ? new Date(r.fin) : null;
                const n = sessionNum(r);
                const color = r.prestation?.couleur || '#6CAED6';
                return (
                  <div key={r.id} className="bg-white border border-[#E7DCCD] rounded-[20px] overflow-hidden shadow-sm">
                    {/* Color top bar */}
                    <div className="h-1" style={{ background: color }} />
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        <DateBox date={debut} />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[#0A1D35] text-base leading-snug mb-0.5">
                            {r.prestation?.nom || r.titre || t('mesRdv.seance')}
                          </div>
                          <div className="text-xs text-[#56627A] mb-3">
                            {t('mesRdv.seanceNo')}{n}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex items-center gap-1 text-xs font-medium text-[#56627A] bg-[#F7F2EB] px-2.5 py-1 rounded-full" translate="no">
                              <Clock size={11} />
                              {format(debut, timeFormat)}{fin ? ` – ${format(fin, timeFormat)}` : ''}
                            </span>
                            <span className="flex items-center gap-1 text-xs font-medium text-[#56627A] bg-[#F7F2EB] px-2.5 py-1 rounded-full">
                              <Video size={11} /> Google Meet
                            </span>
                            <span className="flex items-center gap-1 text-xs font-bold bg-[#DCEFE4] text-[#1E6B4A] px-2.5 py-1 rounded-full">
                              <CheckCircle size={11} /> {t('mesRdv.confirme')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-[#F7F2EB]">
                        {r.lien_meet ? (
                          <a href={r.lien_meet} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-[#0A1D35] text-white text-xs font-bold px-4 py-2 rounded-[10px] hover:bg-[#1C3352] transition-colors">
                            <Video size={12} /> {t('mesRdv.rejoindre')}
                          </a>
                        ) : (
                          <button disabled
                            className="flex items-center gap-1.5 bg-[#D0E7F5] text-[#6CAED6] text-xs font-bold px-4 py-2 rounded-[10px] cursor-not-allowed">
                            <Video size={12} /> {t('mesRdv.rejoindre')}
                          </button>
                        )}
                        <a href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('RDV Synégo — ' + (r.prestation?.nom || r.titre || 'Séance'))}&dates=${new Date(r.debut).toISOString().replace(/[-:]/g,'').replace('.000Z','Z')}/${new Date(r.fin).toISOString().replace(/[-:]/g,'').replace('.000Z','Z')}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 border border-[#E7DCCD] text-[#56627A] text-xs font-medium px-4 py-2 rounded-[10px] hover:bg-[#F7F2EB] transition-colors">
                          <Calendar size={12} /> {t('mesRdv.ajouterCalendrier')}
                        </a>
                        <div className="ml-auto">
                          {canCancel(r.debut) ? (
                            <button onClick={() => annuler(r)}
                              className="flex items-center gap-1 text-xs text-[#9B2C1F] hover:underline font-medium">
                              <XCircle size={12} /> {t('mesRdv.annuler').split('(')[0].trim()}
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-[#A8B8C8]">
                              <AlertCircle size={11} /> {t('mesRdv.annulationBloquee')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Past sessions */}
            {sortedPast.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-extrabold text-[#0A1D35]">{t('mesRdv.passees')}</h2>
                  {sortedPast.length > 5 && (
                    <button onClick={() => setShowAllPast(v => !v)}
                      className="text-xs text-[#56627A] hover:text-[#0A1D35] font-medium transition-colors">
                      {showAllPast ? t('mesRdv.reduire') : `${t('mesRdv.voirTout')}`}
                    </button>
                  )}
                </div>
                <div className="bg-white border border-[#E7DCCD] rounded-[18px] overflow-hidden shadow-sm">
                  {(showAllPast ? sortedPast : sortedPast.slice(0, 5)).map((r, idx, arr) => {
                    const n = sessionNum(r);
                    return (
                      <div key={r.id} className={`flex items-center gap-4 px-5 py-3.5 text-sm ${idx < arr.length - 1 ? 'border-b border-[#F7F2EB]' : ''} hover:bg-[#FAFAFA] transition-colors`}>
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.prestation?.couleur || '#E7DCCD' }} />
                        <span className="text-[#56627A] w-28 shrink-0 capitalize text-xs">
                          {format(new Date(r.debut), 'd MMM yyyy', { locale: dateLocale })}
                        </span>
                        <span className="text-[#A8B8C8] w-12 shrink-0 text-xs" translate="no">
                          {format(new Date(r.debut), timeFormat)}
                        </span>
                        <span className="flex-1 font-medium text-[#0A1D35] truncate">
                          {r.prestation?.nom || '—'} <span className="text-[#A8B8C8] font-normal">#{n}</span>
                        </span>
                        <span className="bg-[#F7F2EB] text-[#56627A] text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0">
                          {t('mesRdv.effectuee')}
                        </span>
                        <button onClick={() => downloadPdf(r.id)} title={t('mesRdv.telechargerPdf')}
                          className="text-[#A8B8C8] hover:text-[#0A1D35] transition-colors shrink-0">
                          <Download size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Cancelled sessions */}
            {cancelled.length > 0 && (
              <div className="mt-8">
                <h2 className="text-base font-extrabold text-[#0A1D35] mb-4">{t('mesRdv.annules')}</h2>
                <div className="bg-white border border-[#E7DCCD] rounded-[18px] overflow-hidden shadow-sm">
                  {cancelled.map((r, idx, arr) => (
                    <div key={r.id} className={`flex items-center gap-4 px-5 py-3.5 text-sm ${idx < arr.length - 1 ? 'border-b border-[#F7F2EB]' : ''}`}>
                      <div className="w-2.5 h-2.5 rounded-full bg-[#F7DDD8] shrink-0" />
                      <span className="text-[#56627A] w-28 shrink-0 capitalize text-xs">
                        {format(new Date(r.debut), 'd MMM yyyy', { locale: dateLocale })}
                      </span>
                      <span className="text-[#A8B8C8] w-12 shrink-0 text-xs" translate="no">
                        {format(new Date(r.debut), timeFormat)}
                      </span>
                      <span className="flex-1 font-medium text-[#0A1D35] truncate">
                        {r.prestation?.nom || '—'}
                      </span>
                      <span className="bg-[#F7DDD8] text-[#9B2C1F] text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0">
                        {t('mesRdv.annulee')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Devis & Factures */}
            {clientToken && !devisLoading && devisList.length > 0 && (
              <div className="mt-8">
                <h2 className="text-base font-extrabold text-[#0A1D35] mb-4">{t('mesRdv.devisFactures')}</h2>
                <div className="space-y-3">
                  {devisList.map(item => {
                    const statutConfig: Record<DevisClientItem['statut'], { bg: string; text: string; label: string }> = {
                      envoye:  { bg: 'bg-[#E8F0FB]', text: 'text-[#1A56A4]', label: t('mesRdv.devisEnvoye') },
                      accepte: { bg: 'bg-[#DCEFE4]', text: 'text-[#1E6B4A]', label: item.facture_numero ? t('mesRdv.factureDisponible') : t('mesRdv.devisAccepte') },
                      refuse:  { bg: 'bg-[#F7DDD8]', text: 'text-[#9B2C1F]', label: t('mesRdv.devisRefuse') },
                      expire:  { bg: 'bg-[#F7F2EB]', text: 'text-[#56627A]',  label: t('mesRdv.devisExpire') },
                    };
                    const { bg, text, label } = statutConfig[item.statut];
                    return (
                      <div key={item.id} className="bg-white border border-[#E7DCCD] rounded-[16px] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-[#56627A] bg-[#F7F2EB] px-2.5 py-1 rounded-full font-mono">
                                {item.facture_numero ?? item.numero}
                              </span>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${bg} ${text}`}>
                                {label}
                              </span>
                            </div>
                            <div className="font-semibold text-[#0A1D35] text-sm leading-snug mb-1">
                              {item.prestation_nom}
                            </div>
                            <div className="text-xs text-[#56627A] space-y-0.5">
                              <div>
                                {item.nb_seances} {item.nb_seances > 1 ? t('mesRdv.seancePluriels') : t('mesRdv.seance').toLowerCase()} &middot; {Number(item.prix_par_seance).toFixed(2)} € {t('mesRdv.parSeance')}
                              </div>
                              <div className="font-bold text-[#0A1D35]">
                                {t('mesRdv.total')} {Number(item.total).toFixed(2)} €
                              </div>
                              <div>
                                {item.facture_date
                                  ? `${t('mesRdv.factureDate')} ${format(new Date(item.facture_date), 'd MMM yyyy', { locale: dateLocale })}`
                                  : `${t('mesRdv.creeLe')} ${format(new Date(item.created_at), 'd MMM yyyy', { locale: dateLocale })}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            {item.statut === 'envoye' && (
                              <button
                                onClick={() => accepterDevis(item.id)}
                                disabled={acceptingDevisId === item.id}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E6B4A] border border-[#DCEFE4] bg-white px-3 py-1.5 rounded-[8px] hover:bg-[#DCEFE4] transition-colors disabled:opacity-40">
                                <CheckCircle size={12} /> {acceptingDevisId === item.id ? '…' : t('mesRdv.accepterDevis')}
                              </button>
                            )}
                            {item.statut === 'accepte' && item.facture_numero && (
                              <button
                                onClick={() => downloadFactureClient(item)}
                                disabled={downloadingFactureId === item.id}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A56A4] border border-[#E8F0FB] bg-white px-3 py-1.5 rounded-[8px] hover:bg-[#E8F0FB] transition-colors disabled:opacity-40">
                                <Download size={12} /> {downloadingFactureId === item.id ? '…' : t('mesRdv.telechargerFacture')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-72 shrink-0 space-y-4">

            {/* Account card */}
            <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-full bg-[#D0E7F5] flex items-center justify-center text-sm font-bold text-[#0A5A8A] shrink-0">
                  {initials}
                </div>
                <div>
                  <div className="font-bold text-[#0A1D35] text-sm leading-snug">{fullName}</div>
                  <div className="text-xs text-[#56627A]">{t('mesRdv.clientSynego')}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-[#F7F2EB] rounded-[12px] p-3 text-center">
                  <div className="text-xl font-extrabold text-[#0A1D35]">{allConfirmed.length}</div>
                  <div className="text-[11px] text-[#56627A] mt-0.5">{t('mesRdv.seancesTotales')}</div>
                </div>
                <div className="bg-[#F7F2EB] rounded-[12px] p-3 text-center">
                  <div className="text-xl font-extrabold text-[#0A1D35]">{upcoming.length}</div>
                  <div className="text-[11px] text-[#56627A] mt-0.5">{t('mesRdv.aVenir')}</div>
                </div>
              </div>

              {clientToken && (
                <Link to="/profil"
                  className="flex items-center justify-center gap-1.5 w-full border border-[#E7DCCD] text-[#56627A] text-xs font-semibold py-2.5 rounded-[10px] hover:bg-[#F7F2EB] transition-colors">
                  {t('mesRdv.voirProfil')}
                </Link>
              )}
            </div>

            {/* Next appointment highlight */}
            {prochainRdv && (
              <div className="bg-[#0A1D35] rounded-[20px] p-5 shadow-sm">
                <p className="text-[#6CAED6] text-[11px] font-bold uppercase tracking-wide mb-3">{t('mesRdv.prochainRdv')}</p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-white/10 rounded-[10px] flex flex-col items-center justify-center shrink-0">
                    <span className="text-white font-bold text-sm leading-none">{format(new Date(prochainRdv.debut), 'd')}</span>
                    <span className="text-[#6CAED6] text-[10px] capitalize" translate="no">{format(new Date(prochainRdv.debut), 'MMM', { locale: dateLocale })}</span>
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
              className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-[#D9C9B4] text-[#56627A] text-sm font-semibold py-4 rounded-[18px] hover:border-[#0A1D35] hover:text-[#0A1D35] transition-colors">
              <Plus size={15} /> {t('mesRdv.reserverSeance')}
            </Link>
          </div>
        </div>
      </div>
    </PatientLayout>
  );
}
