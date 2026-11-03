import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isThisWeek, isThisMonth, formatDistanceToNow } from 'date-fns';
import { useDateLocale, useTimeFormat } from '../../hooks/useDateLocale';
import {
  Calendar, Users, Clock, Bell, Plus, Pencil, Trash2, Video,
  FileText, TrendingUp, ArrowRight, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import NoteSeancePanel from '../../components/NoteSeancePanel';
import NouveauRdvPanel from '../../components/NouveauRdvPanel';
import type { RendezVous } from '@synego/shared';

interface Stats { today: number; week: number; month: number; total: number; clients: number }
type Period = 'today' | 'week' | 'month' | 'annule';

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const cls = size === 'md'
    ? 'w-10 h-10 text-sm'
    : 'w-8 h-8 text-xs';
  return (
    <div className={`${cls} rounded-full bg-[#D0E7F5] flex items-center justify-center font-bold text-[#0A1D35] shrink-0`}>
      {initials}
    </div>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  const { t } = useTranslation();
  const map: Record<string, { cls: string; label: string }> = {
    confirme: { cls: 'bg-[#DCEFE4] text-[#1E6B4A]', label: t('dashboard.confirme') },
    en_attente: { cls: 'bg-[#F6E7C8] text-[#8A5A12]', label: t('dashboard.enAttenteStatut') },
    annule: { cls: 'bg-[#F7DDD8] text-[#9B2C1F]', label: t('dashboard.annule') },
  };
  const s = map[statut] || { cls: 'bg-[#F7F2EB] text-[#56627A]', label: statut };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { timeFormat, atWord } = useTimeFormat();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [stats, setStats] = useState<Stats>({ today: 0, week: 0, month: 0, total: 0, clients: 0 });
  const [noteRdv, setNoteRdv] = useState<RendezVous | null>(null);
  const [showNouveauRdv, setShowNouveauRdv] = useState(false);
  const [period, setPeriod] = useState<Period>('today');
  const [pendingCount, setPendingCount] = useState(0);
  const [resumeLoading, setResumeLoading] = useState<Set<number>>(new Set());

  const headers = { Authorization: `Bearer ${token}` };

  async function fetchResume(rdv: RendezVous) {
    if (resumeLoading.has(rdv.id)) return;
    setResumeLoading(prev => new Set(prev).add(rdv.id));
    try {
      const res = await fetch(`/api/admin/rdv/${rdv.id}/find-resume`, { headers });
      const data = await res.json();
      if (data.url) {
        setRdvs(prev => prev.map(r => r.id === rdv.id ? { ...r, resume_url: data.url } : r));
        window.open(data.url, '_blank');
      } else {
        toast.error('Résumé non trouvé dans Drive');
      }
    } catch {
      toast.error('Erreur lors de la recherche');
    } finally {
      setResumeLoading(prev => { const s = new Set(prev); s.delete(rdv.id); return s; });
    }
  }

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

  function loadDashboard() {
    fetch('/api/admin/dashboard', { headers }).then(r => r.json()).then(data => {
      setRdvs(data.prochains || []);
      setStats(data.stats || {});
      setPendingCount(data.pendingCount || 0);
    });
  }

  useEffect(() => { loadDashboard(); }, []);

  useEffect(() => {
    const pastWithoutResume = rdvs.filter(r => r.statut !== 'annule' && new Date(r.fin) < new Date() && !r.resume_url);
    pastWithoutResume.forEach(r => {
      fetch(`/api/admin/rdv/${r.id}/find-resume`, { headers })
        .then(res => res.json())
        .then(data => {
          if (data.url) setRdvs(prev => prev.map(x => x.id === r.id ? { ...x, resume_url: data.url } : x));
        })
        .catch(() => {});
    });
  }, [rdvs.length]);

  const now = new Date();

  const filtered = rdvs.filter(r => {
    if (period === 'annule') return r.statut === 'annule';
    if (r.statut === 'annule') return false;
    const d = new Date(r.debut);
    if (period === 'today') return isToday(d);
    if (period === 'week') return isThisWeek(d, { weekStartsOn: 1 });
    return isThisMonth(d);
  });

  const prochainRdv = rdvs.find(r => r.statut !== 'annule' && new Date(r.debut) > now) || null;
  const todayRdvs = rdvs.filter(r => r.statut !== 'annule' && isToday(new Date(r.debut)));

  const STATS = [
    { label: t('dashboard.rdvAujourdHui'), value: stats.today, icon: Clock, bg: 'bg-[#D0E7F5]', text: 'text-[#0A1D35]' },
    { label: t('dashboard.cetteSemaine'), value: stats.week, icon: Calendar, bg: 'bg-[#F2E8DC]', text: 'text-[#8A5A12]' },
    { label: 'Ce mois', value: stats.month, icon: TrendingUp, bg: 'bg-[#DCEFE4]', text: 'text-[#1E6B4A]' },
    { label: t('dashboard.clientsActifs'), value: stats.clients, icon: Users, bg: 'bg-[#EDE9FE]', text: 'text-[#5B21B6]' },
  ];

  const PERIODS: [Period, string][] = [
    ['today', t('dashboard.rdvAujourdHui')],
    ['week', t('dashboard.cetteSemaine')],
    ['month', 'Ce mois'],
    ['annule', t('dashboard.annules')],
  ];

  return (
    <AdminLayout title={t('dashboard.titre')}>

      {/* Alert banner */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between bg-[#FFF8EC] border border-[#F6E7C8] rounded-[14px] px-5 py-3 mb-6">
          <div className="flex items-center gap-2 text-sm text-[#8A5A12] font-medium">
            <Bell size={15} />
            {pendingCount} rendez-vous {t('dashboard.enAttente')}
          </div>
          <button onClick={() => navigate('/admin/planning')}
            className="flex items-center gap-1 text-[#8A5A12] font-semibold text-xs hover:underline">
            {t('dashboard.voir')} <ArrowRight size={12} />
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATS.map(({ label, value, icon: Icon, bg, text }) => (
          <div key={label} className="bg-white border border-[#E7DCCD] rounded-[18px] p-5 flex items-center gap-4">
            <div className={`w-11 h-11 ${bg} rounded-[14px] flex items-center justify-center shrink-0`}>
              <Icon size={18} className={text} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#0A1D35] leading-none">{value}</div>
              <div className="text-xs text-[#56627A] mt-1 leading-tight">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main two-column layout */}
      <div className="flex gap-5 items-start">

        {/* Left: RDV table */}
        <div className="flex-1 min-w-0 bg-white border border-[#E7DCCD] rounded-[18px] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7DCCD]">
            <div className="flex gap-1 bg-[#F7F2EB] rounded-xl p-1">
              {PERIODS.map(([p, label]) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors ${
                    period === p ? 'bg-white text-[#0A1D35] shadow-sm' : 'text-[#56627A] hover:text-[#0A1D35]'
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowNouveauRdv(true)}
              className="flex items-center gap-1.5 bg-[#0A1D35] text-white text-xs font-semibold px-3 py-2 rounded-[10px] hover:bg-[#1C3352] transition-colors">
              <Plus size={13} /> {t('dashboard.nouveauRdv')}
            </button>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-[#56627A]">
              <Zap size={28} className="mb-3 opacity-30" />
              <p className="text-sm">{t('dashboard.aucunRdv')}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F7F2EB]">
                  {[t('dashboard.client'), t('dashboard.dateHeure'), t('dashboard.type'), t('dashboard.statut'), ''].map((h, i) => (
                    <th key={i} className="text-left px-5 py-3 text-[11px] font-bold text-[#A8B8C8] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => {
                  const clientName = r.client ? `${r.client.prenom} ${r.client.nom}` : '—';
                  const color = r.prestation?.couleur || '#6CAED6';
                  return (
                    <tr key={r.id}
                      className={`hover:bg-[#FAFAFA] transition-colors cursor-pointer ${idx < filtered.length - 1 ? 'border-b border-[#F7F2EB]' : ''}`}
                      onClick={() => setNoteRdv(r)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={clientName} />
                          <span className="font-semibold text-[#0A1D35] text-sm">{clientName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-[#0A1D35] font-medium capitalize" translate="no">
                          {format(new Date(r.debut), `EEE d MMM`, { locale: dateLocale })}
                        </div>
                        <div className="text-xs text-[#56627A]" translate="no">
                          {format(new Date(r.debut), timeFormat)} {atWord} {r.fin ? format(new Date(r.fin), timeFormat) : ''}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-sm text-[#56627A]">{r.titre || r.prestation?.nom || '—'}</span>
                        </div>
                        {r.commentaire && (
                          <div className="text-xs text-[#A8B8C8] mt-0.5 max-w-[200px] truncate" title={r.commentaire}>
                            {r.commentaire}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5"><StatutBadge statut={r.statut} /></td>
                      <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => setNoteRdv(r)}
                            className="p-1.5 hover:bg-[#F7F2EB] rounded-[6px] text-[#56627A] transition-colors" title="Notes">
                            <Pencil size={13} />
                          </button>
                          {r.lien_meet && (
                            <a href={r.lien_meet} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 hover:bg-[#D0E7F5] rounded-[6px] text-[#0A1D35] transition-colors" title="Meet">
                              <Video size={13} />
                            </a>
                          )}
                          {new Date(r.fin) < now && (
                            r.resume_url ? (
                              <a href={r.resume_url} target="_blank" rel="noopener noreferrer"
                                className="p-1.5 hover:bg-[#DCEFE4] rounded-[6px] text-[#1E6B4A] transition-colors" title="Résumé">
                                <FileText size={13} />
                              </a>
                            ) : (
                              <button onClick={() => fetchResume(r)} disabled={resumeLoading.has(r.id)}
                                className="p-1.5 hover:bg-[#F7F2EB] rounded-[6px] text-[#A8B8C8] transition-colors disabled:opacity-40" title="Chercher résumé">
                                <FileText size={13} />
                              </button>
                            )
                          )}
                          <button onClick={e => deleteRdv(r.id, e)}
                            className="p-1.5 hover:bg-[#F7DDD8] rounded-[6px] text-[#9B2C1F] transition-colors" title="Annuler">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-72 shrink-0 space-y-4">

          {/* Prochaine séance */}
          <div className="bg-white border border-[#E7DCCD] rounded-[18px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F7F2EB]">
              <p className="text-xs font-bold text-[#56627A] uppercase tracking-wider">Prochaine séance</p>
            </div>
            {prochainRdv ? (
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={prochainRdv.client ? `${prochainRdv.client.prenom} ${prochainRdv.client.nom}` : '?'} size="md" />
                  <div>
                    <div className="font-bold text-[#0A1D35] text-sm leading-tight">
                      {prochainRdv.client?.prenom} {prochainRdv.client?.nom}
                    </div>
                    <div className="text-xs text-[#56627A]">{prochainRdv.prestation?.nom || '—'}</div>
                  </div>
                </div>
                <div className="bg-[#F7F2EB] rounded-[12px] px-4 py-3 mb-4">
                  <div className="text-sm font-extrabold text-[#0A1D35] capitalize" translate="no">
                    {format(new Date(prochainRdv.debut), `EEEE d MMM`, { locale: dateLocale })}
                  </div>
                  <div className="text-xs text-[#56627A] mt-0.5" translate="no">
                    {format(new Date(prochainRdv.debut), timeFormat)}
                    {prochainRdv.fin ? ` – ${format(new Date(prochainRdv.fin), timeFormat)}` : ''}
                    {' · '}
                    <span className="text-[#0A1D35] font-semibold">
                      {formatDistanceToNow(new Date(prochainRdv.debut), { locale: dateLocale, addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {prochainRdv.lien_meet && (
                    <a href={prochainRdv.lien_meet} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#0A1D35] text-white text-xs font-bold py-2 rounded-[10px] hover:bg-[#1C3352] transition-colors">
                      <Video size={12} /> Meet
                    </a>
                  )}
                  <button onClick={() => setNoteRdv(prochainRdv)}
                    className="flex-1 flex items-center justify-center gap-1.5 border border-[#E7DCCD] text-[#56627A] text-xs font-semibold py-2 rounded-[10px] hover:bg-[#F7F2EB] transition-colors">
                    <Pencil size={12} /> Notes
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 text-center text-sm text-[#56627A]">
                <Calendar size={24} className="mx-auto mb-2 opacity-30" />
                Aucun RDV à venir
              </div>
            )}
          </div>

          {/* Agenda du jour */}
          <div className="bg-white border border-[#E7DCCD] rounded-[18px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#F7F2EB] flex items-center justify-between">
              <p className="text-xs font-bold text-[#56627A] uppercase tracking-wider">Agenda du jour</p>
              <span className="text-xs font-bold text-[#0A1D35] bg-[#D0E7F5] px-2 py-0.5 rounded-full">
                {todayRdvs.length}
              </span>
            </div>
            {todayRdvs.length === 0 ? (
              <div className="p-5 text-center text-sm text-[#56627A]">
                <Zap size={20} className="mx-auto mb-2 opacity-30" />
                Journée libre
              </div>
            ) : (
              <div className="divide-y divide-[#F7F2EB]">
                {todayRdvs.map(r => {
                  const color = r.prestation?.couleur || '#6CAED6';
                  const isPast = new Date(r.debut) < now;
                  return (
                    <div key={r.id}
                      className={`flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors ${isPast ? 'opacity-50' : ''}`}
                      onClick={() => setNoteRdv(r)}>
                      <div className="text-[11px] font-bold text-[#56627A] w-10 shrink-0 tabular-nums" translate="no">
                        {format(new Date(r.debut), timeFormat)}
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#0A1D35] truncate">
                          {r.client?.prenom} {r.client?.nom}
                        </div>
                        <div className="text-[10px] text-[#56627A] truncate">{r.prestation?.nom}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Total séances */}
          <div className="bg-[#0A1D35] rounded-[18px] p-5 text-white">
            <div className="text-xs font-bold text-[#6CAED6] uppercase tracking-wider mb-2">Total séances</div>
            <div className="text-4xl font-extrabold mb-1">{stats.total}</div>
            <div className="text-xs text-[#A8B8C8]">depuis le début</div>
            <button onClick={() => navigate('/admin/planning')}
              className="mt-4 w-full flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-semibold py-2 rounded-[10px]">
              Voir l'agenda <ArrowRight size={12} />
            </button>
          </div>

        </div>
      </div>

      {noteRdv && <NoteSeancePanel rdv={noteRdv} onClose={() => setNoteRdv(null)} />}
      {showNouveauRdv && (
        <NouveauRdvPanel
          onClose={() => setShowNouveauRdv(false)}
          onCreated={() => { setShowNouveauRdv(false); loadDashboard(); }}
        />
      )}
    </AdminLayout>
  );
}
