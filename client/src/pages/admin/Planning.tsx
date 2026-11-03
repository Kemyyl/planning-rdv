import { useEffect, useState, type MouseEvent } from 'react';
import { format, addDays, startOfWeek, differenceInMinutes } from 'date-fns';
import { useDateLocale } from '../../hooks/useDateLocale';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Trash2, Video, Pencil } from 'lucide-react';
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
  const [editRdv, setEditRdv] = useState<RendezVous | null>(null);
  const [showNouveauRdv, setShowNouveauRdv] = useState(false);
  const [view, setView] = useState<ViewMode>('semaine');
  const [creneauxLibres, setCreneauxLibres] = useState(0);

  const headers = { Authorization: `Bearer ${token}` };

  async function deleteRdv(id: string, e: MouseEvent) {
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

  function loadRdvs() {
    const fin = addDays(lundi, 6);
    fetch(`/api/admin/rdv?debut=${lundi.toISOString()}&fin=${fin.toISOString()}`, { headers })
      .then(r => r.json()).then(data => {
        const arr = Array.isArray(data) ? data : [];
        setRdvs(arr);
        const totalSlots = 7 * 9;
        setCreneauxLibres(Math.max(0, totalSlots - arr.length));
      });
  }

  useEffect(() => { loadRdvs(); }, [lundi]);

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
          <button onClick={loadRdvs}
            className="p-2 border border-[#E7DCCD] rounded-xl bg-white hover:bg-[#F7F2EB] transition-colors text-[#56627A]"
            title="Actualiser">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setShowNouveauRdv(true)}
            className="flex items-center gap-1.5 bg-[#0A1D35] text-white font-semibold px-4 py-2 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors">
            <Plus size={14} /> {t('planning.nouveauRdv')}
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E7DCCD] rounded-[18px] overflow-auto">
        <div className={`grid border-b border-[#E7DCCD]`} style={{ gridTemplateColumns: `56px repeat(${cols - 1}, 1fr)` }}>
          <div className="py-3 px-2 text-xs text-[#56627A]" />
          {jours.map(j => (
            <div key={j.toISOString()} className={`py-3 px-2 text-center border-l border-[#E7DCCD] ${
              format(j, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'bg-[#D0E7F5]' : ''
            }`}>
              <div className="text-xs text-[#56627A] font-medium capitalize">{format(j, 'EEE', { locale: dateLocale })}</div>
              <div className="text-sm font-bold text-[#0A1D35]">{format(j, 'd')}</div>
            </div>
          ))}
        </div>

        {heures.map(h => (
          <div key={h} className="grid border-b border-[#E7DCCD] min-h-[56px]"
            style={{ gridTemplateColumns: `56px repeat(${cols - 1}, 1fr)` }}>
            <div className="py-3 px-2 text-xs text-[#56627A] border-r border-[#E7DCCD] text-right pr-3">{h}:00</div>
            {jours.map(j => {
              const slot = rdvsDuJour(j).filter(r => new Date(r.debut).getHours() === h);
              return (
                <div key={j.toISOString()} className="border-l border-[#E7DCCD] p-1 relative">
                  {slot.map(r => {
                    const duree = r.prestation?.duree || differenceInMinutes(new Date(r.fin || r.debut), new Date(r.debut)) || 60;
                    const color = r.prestation?.couleur || '#6CAED6';
                    return (
                      <div key={r.id}
                        className="rounded-[8px] px-2 py-1.5 text-xs font-medium mb-1 cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ background: color + '33', borderLeft: `3px solid ${color}`, color: '#0A1D35' }}
                        onClick={() => setNoteRdv(r)}>
                        <div className="font-semibold">{r.client?.prenom} {r.client?.nom}</div>
                        <div className="text-[10px] opacity-70">{r.prestation?.nom} · {duree} min</div>
                        <div className="flex items-center gap-1 mt-1.5" onClick={e => e.stopPropagation()}>
                          {r.lien_meet && (
                            <a href={r.lien_meet} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-0.5 bg-[#0A1D35] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-[5px] hover:bg-[#1C3352] transition-colors">
                              <Video size={9} /> Meet
                            </a>
                          )}
                          <button onClick={e => { e.stopPropagation(); setEditRdv(r); }}
                            className="flex items-center gap-0.5 bg-[#D0E7F5] text-[#0A1D35] text-[10px] font-bold px-1.5 py-0.5 rounded-[5px] hover:bg-[#b8d9ee] transition-colors">
                            <Pencil size={9} /> Modifier
                          </button>
                          {r.statut !== 'annule' && (
                            <button onClick={e => deleteRdv(r.id, e)}
                              className="flex items-center gap-0.5 bg-[#F7DDD8] text-[#9B2C1F] text-[10px] font-bold px-1.5 py-0.5 rounded-[5px] hover:bg-[#f0ccc5] transition-colors">
                              <Trash2 size={9} /> Annuler
                            </button>
                          )}
                        </div>
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
