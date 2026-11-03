import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { format, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Video, Calendar, AlertCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { PublicLayout } from '../components/Layout';
import { useClientAuth } from '../contexts/ClientAuthContext';
import type { RendezVous } from '@synego/shared';

interface RdvWithNotes extends RendezVous {
  notes_seance?: { id: string; contenu: string; created_at: string }[];
  lien_meet?: string;
}

function DateBox({ date }: { date: Date }) {
  return (
    <div className="w-14 h-14 bg-[#0A1D35] rounded-[14px] flex flex-col items-center justify-center shrink-0">
      <span className="text-white font-bold text-xl leading-none">{format(date, 'd')}</span>
      <span className="text-[#6CAED6] text-xs font-medium capitalize">{format(date, 'MMM', { locale: fr })}</span>
    </div>
  );
}

export default function MesRdv() {
  const [params] = useSearchParams();
  const jeton = params.get('jeton');
  const { token: clientToken, prenom, nom, clientId } = useClientAuth();

  const [rdvs, setRdvs] = useState<RdvWithNotes[]>([]);
  const [rdvJeton, setRdvJeton] = useState<(RendezVous & { lien_meet?: string }) | null>(null);
  const [loading, setLoading] = useState(true);

  const fullName = [prenom, nom].filter(Boolean).join(' ') || prenom || '';
  const initials = fullName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U';

  useEffect(() => {
    if (clientToken) {
      fetch('/api/client/rdv', { headers: { Authorization: `Bearer ${clientToken}` } })
        .then(r => r.json())
        .then(data => setRdvs(Array.isArray(data) ? data : []))
        .finally(() => setLoading(false));
    } else if (jeton) {
      fetch(`/api/public/rdv/jeton/${jeton}`)
        .then(r => r.json())
        .then(data => { if (!data.error) setRdvJeton(data); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [clientToken, jeton]);

  async function downloadPdf(rdvId: string) {
    if (!clientToken) return;
    const res = await fetch(`/api/client/rdv/${rdvId}/pdf`, { headers: { Authorization: `Bearer ${clientToken}` } });
    if (!res.ok) { toast.error('Impossible de télécharger le PDF'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `seance.pdf`; a.click();
    URL.revokeObjectURL(url);
  }

  async function annuler(rdv: RendezVous) {
    if (!confirm('Confirmer l\'annulation ?')) return;
    const res = await fetch(`/api/public/rdv/${rdv.id}/annuler`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jeton: rdv.jeton_annulation }),
    });
    if (res.ok) {
      toast.success('Rendez-vous annulé');
      setRdvs(prev => prev.map(r => r.id === rdv.id ? { ...r, statut: 'annule' } : r));
    } else { toast.error('Impossible d\'annuler'); }
  }

  if (!clientToken && !jeton && !loading) {
    return (
      <PublicLayout>
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <div className="bg-[#F6E7C8] border border-[#D9C9B4] rounded-[18px] p-8 flex flex-col items-center gap-4">
            <AlertCircle size={28} className="text-[#8A5A12]" />
            <p className="font-semibold text-[#0A1D35]">Connectez-vous pour accéder à votre espace</p>
            <p className="text-sm text-[#56627A]">Ou utilisez le lien reçu par e-mail pour accéder à un rendez-vous spécifique.</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  // Mode jeton sans compte
  if (!clientToken && jeton && rdvJeton) {
    return (
      <PublicLayout>
        <div className="max-w-lg mx-auto px-6 py-14">
          <div className="bg-white border border-[#E7DCCD] rounded-[22px] p-8">
            <div className="flex items-center gap-4 mb-6">
              <DateBox date={new Date(rdvJeton.debut)} />
              <div>
                <div className="font-bold text-[#0A1D35]">{rdvJeton.prestation?.nom}</div>
                <div className="text-sm text-[#56627A]">
                  {format(new Date(rdvJeton.debut), 'HH:mm')} – {rdvJeton.fin ? format(new Date(rdvJeton.fin), 'HH:mm') : ''}
                </div>
              </div>
              <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${rdvJeton.statut === 'confirme' ? 'bg-[#DCEFE4] text-[#1E6B4A]' : 'bg-[#F7DDD8] text-[#9B2C1F]'}`}>
                {rdvJeton.statut === 'confirme' ? 'Confirmé' : rdvJeton.statut}
              </span>
            </div>
            {rdvJeton.statut === 'confirme' && !isPast(new Date(rdvJeton.debut)) && (
              <button onClick={() => annuler(rdvJeton)} className="text-sm border border-[#F7DDD8] text-[#9B2C1F] px-4 py-2 rounded-[10px] hover:bg-[#F7DDD8] transition-colors">
                Annuler (gratuit avant 24h)
              </button>
            )}
          </div>
        </div>
      </PublicLayout>
    );
  }

  const upcoming = rdvs.filter(r => r.statut !== 'annule' && !isPast(new Date(r.debut)));
  const past = rdvs.filter(r => r.statut === 'confirme' && isPast(new Date(r.debut)));
  const sortedPast = [...past].sort((a, b) => new Date(b.debut).getTime() - new Date(a.debut).getTime());

  // Numéroter les séances par ordre chronologique
  const allConfirmed = [...rdvs].filter(r => r.statut !== 'annule').sort((a, b) => new Date(a.debut).getTime() - new Date(b.debut).getTime());
  function sessionNum(rdv: RendezVous) {
    return allConfirmed.findIndex(r => r.id === rdv.id) + 1;
  }

  const prochainRdv = upcoming[0];
  const totalSeances = past.length;
  const objectif = 12;

  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex gap-8">
          {/* Colonne principale */}
          <div className="flex-1 min-w-0">
            {/* Prochains RDV */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-extrabold text-[#0A1D35]">Prochains rendez-vous</h2>
              {upcoming.length > 0 && (
                <span className="bg-[#D0E7F5] text-[#0A1D35] text-xs font-bold px-3 py-1 rounded-full">
                  {upcoming.length} à venir
                </span>
              )}
            </div>

            {loading && <div className="text-[#56627A] text-sm py-8">Chargement…</div>}

            {!loading && upcoming.length === 0 && (
              <div className="bg-white border border-dashed border-[#D9C9B4] rounded-[18px] p-8 text-center text-[#56627A] text-sm mb-8">
                Aucun rendez-vous à venir.{' '}
                <Link to="/reservation" className="text-[#0A1D35] font-semibold hover:underline">Réserver une séance →</Link>
              </div>
            )}

            <div className="space-y-4 mb-10">
              {upcoming.map(r => {
                const debut = new Date(r.debut);
                const fin = r.fin ? new Date(r.fin) : null;
                const n = sessionNum(r);
                return (
                  <div key={r.id} className="bg-white border border-[#E7DCCD] rounded-[20px] p-6">
                    <div className="flex items-start gap-4">
                      <DateBox date={debut} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[#0A1D35] text-base mb-1">
                          {r.prestation?.nom} — Séance n°{n}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-[#56627A] mb-2">
                          <span className="flex items-center gap-1">
                            <span className="text-[#56627A]">⏰</span>
                            {format(debut, 'HH:mm')}
                            {fin ? ` – ${format(fin, 'HH:mm')}` : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Video size={13} />
                            Jitsi Meet
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 bg-[#DCEFE4] text-[#1E6B4A] text-xs font-semibold px-2.5 py-1 rounded-full">
                          Confirmé
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        {r.lien_meet ? (
                          <a href={r.lien_meet} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-[#6CAED6] text-white text-xs font-bold px-4 py-2 rounded-[10px] hover:opacity-90 transition-opacity">
                            <Video size={12} /> Rejoindre
                          </a>
                        ) : (
                          <button disabled className="flex items-center gap-1.5 bg-[#D0E7F5] text-[#6CAED6] text-xs font-bold px-4 py-2 rounded-[10px] cursor-not-allowed">
                            <Video size={12} /> Rejoindre
                          </button>
                        )}
                        <button className="flex items-center gap-1.5 border border-[#E7DCCD] text-[#56627A] text-xs font-medium px-4 py-2 rounded-[10px] hover:bg-[#F7F2EB] transition-colors">
                          <Calendar size={12} /> Ajouter au calendrier
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#F7F2EB]">
                      <button onClick={() => annuler(r)} className="text-xs text-[#9B2C1F] hover:underline flex items-center gap-1">
                        <span className="text-[#9B2C1F]">⊗</span> Annuler (gratuit avant 24h)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Séances passées */}
            {sortedPast.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-[#0A1D35]">Séances passées</h2>
                  <button className="text-xs text-[#56627A] hover:text-[#0A1D35] font-medium">Voir tout →</button>
                </div>
                <div className="bg-white border border-[#E7DCCD] rounded-[18px] overflow-hidden">
                  {sortedPast.slice(0, 5).map((r, idx) => {
                    const n = sessionNum(r);
                    return (
                      <div key={r.id} className={`flex items-center gap-6 px-6 py-4 text-sm ${idx < sortedPast.slice(0,5).length - 1 ? 'border-b border-[#F7F2EB]' : ''}`}>
                        <span className="text-[#56627A] w-28 shrink-0 capitalize">
                          {format(new Date(r.debut), 'd MMM yyyy', { locale: fr })}
                        </span>
                        <span className="text-[#56627A] w-16 shrink-0">{format(new Date(r.debut), 'HH:mm')}</span>
                        <span className="flex-1 font-medium text-[#0A1D35]">{r.prestation?.nom} — Séance n°{n}</span>
                        <span className="bg-[#F7F2EB] text-[#56627A] text-xs font-semibold px-2.5 py-1 rounded-full">Effectuée</span>
                        <button onClick={() => downloadPdf(r.id)}
                          className="text-[#56627A] hover:text-[#0A1D35] transition-colors">
                          <Download size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Sidebar droite */}
          <div className="w-72 shrink-0 space-y-4">
            {/* Mon compte */}
            <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-6">
              <p className="text-xs font-bold text-[#56627A] uppercase tracking-wide mb-4">Mon compte</p>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-full bg-[#D0E7F5] flex items-center justify-center text-sm font-bold text-[#0A1D35]">
                  {initials}
                </div>
                <div>
                  <div className="font-bold text-[#0A1D35] text-sm">{fullName}</div>
                  <div className="text-xs text-[#56627A]">{clientId ? '' : ''}</div>
                </div>
              </div>
              <div className="space-y-3 text-sm border-t border-[#F7F2EB] pt-4">
                <div className="flex justify-between">
                  <span className="text-[#56627A]">Séances totales</span>
                  <span className="font-bold text-[#0A1D35]">{allConfirmed.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#56627A]">Prochain RDV</span>
                  <span className="font-bold text-[#0A1D35]">
                    {prochainRdv ? format(new Date(prochainRdv.debut), 'd MMM yyyy', { locale: fr }) : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#56627A]">Praticien</span>
                  <span className="font-bold text-[#0A1D35]">Dr. Synégo</span>
                </div>
              </div>
            </div>

            {/* Mon suivi */}
            <div className="bg-[#0A1D35] rounded-[20px] p-6 text-white">
              <p className="text-xs font-bold text-[#6CAED6] uppercase tracking-wide mb-4">Mon suivi</p>
              <p className="font-semibold text-sm mb-4">{totalSeances} séance{totalSeances > 1 ? 's' : ''} effectuée{totalSeances > 1 ? 's' : ''}</p>
              <div className="bg-[#1C3352] rounded-full h-2 mb-2">
                <div
                  className="bg-[#6CAED6] h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalSeances / objectif) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-[#8FA3B8] mb-5">Objectif : {objectif} séances</p>
              <Link to="/reservation"
                className="block w-full bg-[#6CAED6] text-[#0A1D35] text-sm font-bold text-center py-2.5 rounded-[10px] hover:opacity-90 transition-opacity">
                Réserver une séance
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
