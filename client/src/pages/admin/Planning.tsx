import { useEffect, useState, type MouseEvent } from 'react';
import { format, addDays, startOfWeek, differenceInMinutes } from 'date-fns';
import { useDateLocale } from '../../hooks/useDateLocale';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Trash2, Video, Pencil, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import NoteSeancePanel from '../../components/NoteSeancePanel';
import NouveauRdvPanel from '../../components/NouveauRdvPanel';
import ModifierRdvPanel from '../../components/ModifierRdvPanel';
import type { RendezVous } from '@synego/shared';

type ViewMode = 'jour' | 'semaine';

export default function AdminPlanning() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { token } = useAuth();
  const [lundi, setLundi] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [noteRdv, setNoteRdv] = useState<RendezVous | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [editRdv, setEditRdv] = useState<RendezVous | null>(null);
  const [showNouveauRdv, setShowNouveauRdv] = useState(false);
  const [view, setView] = useState<ViewMode>('semaine');
  const [creneauxLibres, setCreneauxLibres] = useState(0);

  const headers = { Authorization: `Bearer ${token}` };

  async function deleteRdv(id: number, e: MouseEvent) {
    e.stopPropagation();
    if (!confirm('Annuler ce rendez-vous ?')) return;
    const res = await fetch(`/api/admin/rdv/${id}`, { method: 'DELETE', headers });
    if (res.ok) {
      setRdvs(prev => prev.map(r => r.id === id ? { ...r, statut: 'annule', lien_meet: undefined } : r));
      toast.success('RDV annulé');
    } else {
      toast.error('Erreur lors de l\'annulation');
    }
  }

  async function loadRdvs() {
    setSyncing(true);
    try {
      const fin = addDays(lundi, 6);
      const r = await fetch(`/api/admin/rdv?debut=${lundi.toISOString()}&fin=${fin.toISOString()}`, { headers });
      const data = await r.json();
      const arr = Array.isArray(data) ? data : [];
      setRdvs(arr);
      const totalSlots = 7 * 9;
      setCreneauxLibres(Math.max(0, totalSlots - arr.length));
      setLastSync(new Date());
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => { loadRdvs(); }, [lundi]); // eslint-disable-line react-hooks/exhaustive-deps

  const jours = view === 'semaine'
    ? Array.from({ length: 7 }, (_, i) => addDays(lundi, i))
    : [lundi];
  const heures = Array.from({ length: 10 }, (_, i) => 8 + i);

  function rdvsDuJour(j: Date) {
    return rdvs.filter(r => format(new Date(r.debut), 'yyyy-MM-dd') === format(j, 'yyyy-MM-dd'));
  }

  const cols = view === 'semaine' ? 8 : 2;

  return (
    <AdminLayout title={t('planning.titre')}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={() => setLundi(d => addDays(d, view === 'semaine' ? -7 : -1))}
              className="p-2 border border-[#E7DCCD] rounded-xl hover:bg-[#F7F2EB] transition-colors bg-white">
              <ChevronLeft size={15} />
            </button>
            <span className="font-bold text-[#0A1D35] px-2 min-w-[160px] text-center text-sm">
              {view === 'semaine'
                ? `${format(lundi, 'd MMM', { locale: dateLocale })} – ${format(addDays(lundi, 6), 'd MMM yyyy', { locale: dateLocale })}`
                : format(lundi, 'EEEE d MMMM yyyy', { locale: dateLocale })}
            </span>
            <button onClick={() => setLundi(d => addDays(d, view === 'semaine' ? 7 : 1))}
              className="p-2 border border-[#E7DCCD] rounded-xl hover:bg-[#F7F2EB] transition-colors bg-white">
              <ChevronRight size={15} />
            </button>
          </div>
          <button onClick={() => setLundi(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="text-xs text-[#56627A] hover:text-[#0A1D35] border border-[#E7DCCD] px-3 py-1.5 rounded-xl bg-white transition-colors">
            {t('planning.aujourdHui')}
          </button>

          <div className="flex items-center gap-1.5 bg-[#DCEFE4] text-[#1E6B4A] text-xs font-semibold px-3 py-1.5 rounded-xl">
            <RefreshCw size={11} />
            {creneauxLibres} {t('planning.creneauxLibres')}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-[#F7F2EB] border border-[#E7DCCD] rounded-xl p-1">
            {([['jour', t('planning.jour')], ['semaine', t('planning.semaine')]] as [ViewMode, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-colors capitalize ${
                  view === v ? 'bg-white text-[#0A1D35] shadow-sm' : 'text-[#56627A]'
                }`}>
                {label}
              </button>
            ))}
          </div>
          {lastSync && (
            <span className="text-[10px] text-[#A0A9B8]">
              {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={loadRdvs}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-semibold border border-[#E7DCCD] text-[#56627A] px-3 py-1.5 rounded-xl bg-white hover:bg-[#F7F2EB] transition-colors disabled:opacity-50"
            title="Synchroniser">
            <RotateCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sync...' : 'Synchroniser'}
          </button>
          <button onClick={() => setShowNouveauRdv(true)}
            className="flex items-center gap-1.5 bg-[#0A1D35] text-white font-semibold px-4 py-2 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors">
            <Plus size={14} /> {t('planning.nouveauRdv')}
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E7DCCD] rounded-[18px] overflow-auto">
        {/* Header days */}
        <div className="grid border-b border-[#E7DCCD]" style={{ gridTemplateColumns: `52px repeat(${cols - 1}, 1fr)` }}>
          <div className="py-3" />
          {jours.map(j => {
            const isToday = format(j, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            return (
              <div key={j.toISOString()} className={`py-3 px-2 text-center border-l border-[#E7DCCD] ${isToday ? 'bg-[#EEF6FC]' : ''}`}>
                <div className="text-[11px] text-[#56627A] font-medium uppercase tracking-wide" translate="no">
                  {format(j, 'EEE', { locale: dateLocale }).replace('.', '')}
                </div>
                <div className={`text-sm font-extrabold mt-0.5 ${isToday ? 'text-white bg-[#0A1D35] w-7 h-7 rounded-full flex items-center justify-center mx-auto' : 'text-[#0A1D35]'}`}>
                  {format(j, 'd')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        {heures.map(h => (
          <div key={h} className="grid border-b border-[#F7F2EB] min-h-[64px]"
            style={{ gridTemplateColumns: `52px repeat(${cols - 1}, 1fr)` }}>
            <div className="py-2 text-[11px] text-[#A8B8C8] border-r border-[#F7F2EB] text-right pr-3 pt-2.5 font-medium">
              {h}:00
            </div>
            {jours.map(j => {
              const isToday = format(j, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              const slot = rdvsDuJour(j).filter(r => new Date(r.debut).getHours() === h);
              return (
                <div key={j.toISOString()} className={`border-l border-[#F7F2EB] p-1 ${isToday ? 'bg-[#FAFCFF]' : ''}`}>
                  {slot.map(r => {
                    const duree = r.prestation?.duree || differenceInMinutes(new Date(r.fin || r.debut), new Date(r.debut)) || 60;
                    const color = r.prestation?.couleur || '#6CAED6';
                    const annule = r.statut === 'annule';
                    return (
                      <div key={r.id}
                        className={`group relative rounded-[10px] px-2.5 pt-2 pb-2 mb-1 cursor-pointer transition-all hover:shadow-md ${annule ? 'opacity-40' : ''}`}
                        style={{ background: color + '1A', borderLeft: `3px solid ${annule ? '#ccc' : color}` }}
                        onClick={() => setNoteRdv(r)}>

                        {/* Client name */}
                        <div className={`text-xs font-bold leading-tight text-[#0A1D35] ${annule ? 'line-through' : ''}`}>
                          {r.client?.prenom} {r.client?.nom}
                        </div>
                        {/* Prestation + duration */}
                        <div className="text-[10px] text-[#56627A] mt-0.5 leading-tight">
                          {r.prestation?.nom} · {duree} min
                        </div>
                        {/* Time */}
                        <div className="text-[10px] text-[#A8B8C8] mt-0.5" translate="no">
                          {format(new Date(r.debut), 'HH:mm')}
                          {r.fin ? ` – ${format(new Date(r.fin), 'HH:mm')}` : ''}
                        </div>

                        {/* Hover actions */}
                        {!annule && (
                          <div
                            className="absolute top-1.5 right-1.5 hidden group-hover:flex items-center gap-1"
                            onClick={e => e.stopPropagation()}>
                            {r.lien_meet && (
                              <a href={r.lien_meet} target="_blank" rel="noopener noreferrer"
                                title="Rejoindre le Meet"
                                className="p-1.5 bg-[#0A1D35] text-white rounded-[6px] hover:bg-[#1C3352] transition-colors shadow-sm">
                                <Video size={10} />
                              </a>
                            )}
                            <button
                              title="Modifier"
                              onClick={() => setEditRdv(r)}
                              className="p-1.5 bg-white text-[#0A1D35] rounded-[6px] hover:bg-[#F7F2EB] transition-colors shadow-sm border border-[#E7DCCD]">
                              <Pencil size={10} />
                            </button>
                            <button
                              title="Annuler le RDV"
                              onClick={e => deleteRdv(r.id, e)}
                              className="p-1.5 bg-white text-[#9B2C1F] rounded-[6px] hover:bg-[#F7DDD8] transition-colors shadow-sm border border-[#E7DCCD]">
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {noteRdv && <NoteSeancePanel rdv={noteRdv} onClose={() => setNoteRdv(null)} />}
      {editRdv && <ModifierRdvPanel rdv={editRdv} onClose={() => setEditRdv(null)} onUpdated={updated => { setRdvs(prev => prev.map(r => r.id === updated.id ? updated : r)); setEditRdv(null); }} />}
      {showNouveauRdv && (
        <NouveauRdvPanel
          onClose={() => setShowNouveauRdv(false)}
          onCreated={() => { setShowNouveauRdv(false); loadRdvs(); }}
        />
      )}
    </AdminLayout>
  );
}
