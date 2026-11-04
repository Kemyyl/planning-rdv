import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isThisWeek, isThisMonth, formatDistanceToNow } from 'date-fns';
import { useDateLocale, useTimeFormat } from '../../hooks/useDateLocale';
import {
  Calendar, Users, Clock, Bell, Plus, Pencil, Trash2, Video,
  FileText, TrendingUp, ArrowRight, Zap, ChevronRight, Download,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import NoteSeancePanel from '../../components/NoteSeancePanel';
import NouveauRdvPanel from '../../components/NouveauRdvPanel';
import type { RendezVous } from '@synego/shared';

interface Stats { today: number; week: number; month: number; total: number; clients: number }
type Period = 'today' | 'week' | 'month' | 'annule';

const paletteBg = ['#D0E7F5', '#DCEFE4', '#F6E7C8', '#E9D8F5', '#F7DDD8', '#D6EBE4'];
const paletteFg = ['#0A5A8A', '#1E6B4A', '#8A5A12', '#5A2C8A', '#9B2C1F', '#1E5C4A'];

function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
  const idx = ((name.charCodeAt(0) || 0) + (name.charCodeAt(1) || 0)) % 6;
  const cls = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div className={`${cls} rounded-full flex items-center justify-center font-bold shrink-0`}
      style={{ background: paletteBg[idx], color: paletteFg[idx] }}>
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
  const { token, nom } = useAuth();
  const navigate = useNavigate();
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [stats, setStats] = useState<Stats>({ today: 0, week: 0, month: 0, total: 0, clients: 0 });
  const [revenueData, setRevenueData] = useState<{ month: string; label: string; rdvs: number; revenue: number }[]>([]);
  const [noteRdv, setNoteRdv] = useState<RendezVous | null>(null);
  const [showNouveauRdv, setShowNouveauRdv] = useState(false);
  const [period, setPeriod] = useState<Period>('today');
  const [pendingCount, setPendingCount] = useState(0);
  const [resumeLoading, setResumeLoading] = useState<Set<number>>(new Set());

  const headers = { Authorization: `Bearer ${token}` };
  const now = new Date();
  const dateLabel = format(now, 'EEEE d MMMM yyyy', { locale: dateLocale });
  const hour = now.getHours();
  const greeting = hour < 12 ? t('dashboard.bonjour') : hour < 18 ? t('dashboard.bonApresMidi') : t('dashboard.bonsoir');
  const firstName = nom?.split(' ')[0] || 'Admin';

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
        toast.error(t('dashboard.resumeNonTrouve'));
      }
    } catch {
      toast.error(t('dashboard.erreurRecherche'));
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
      toast.success(t('dashboard.rdvAnnule'));
    } else {
      toast.error(t('dashboard.erreurAnnulation'));
    }
  }

  function loadDashboard() {
    fetch('/api/admin/dashboard', { headers }).then(r => r.json()).then(data => {
      setRdvs(data.prochains || []);
      setStats(data.stats || {});
      setPendingCount(data.pendingCount || 0);
    });
  }

  useEffect(() => {
    loadDashboard();
    fetch('/api/admin/revenue', { headers })
      .then(r => r.json())
      .then(d => setRevenueData(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    const pastWithoutResume = rdvs.filter(r => r.statut !== 'annule' && new Date(r.fin) < now && !r.resume_url);
    pastWithoutResume.forEach(r => {
      fetch(`/api/admin/rdv/${r.id}/find-resume`, { headers })
        .then(res => res.json())
        .then(data => {
          if (data.url) setRdvs(prev => prev.map(x => x.id === r.id ? { ...x, resume_url: data.url } : x));
        })
        .catch(() => {});
    });
  }, [rdvs.length]);

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
    { label: t('dashboard.statAujourdhui'), value: stats.today, icon: Clock, bg: '#D0E7F5', fg: '#0A5A8A', accent: '#6CAED6' },
    { label: t('dashboard.statSemaine'), value: stats.week, icon: Calendar, bg: '#F6E7C8', fg: '#8A5A12', accent: '#D9A842' },
    { label: t('dashboard.statMois'), value: stats.month, icon: TrendingUp, bg: '#DCEFE4', fg: '#1E6B4A', accent: '#3DAA72' },
    { label: t('dashboard.statClients'), value: stats.clients, icon: Users, bg: '#E9D8F5', fg: '#5A2C8A', accent: '#9B6DDA' },
  ];

  function exportCsvClients() {
    fetch('/api/admin/clients', { headers })
      .then(r => r.json())
      .then((clients: Array<{ prenom: string; nom: string; email: string; telephone?: string; created_at?: string }>) => {
        const header = 'Prénom,Nom,Email,Téléphone,Inscrit le';
        const rows = clients.map(c => `${c.prenom},${c.nom},${c.email},${c.telephone || ''},${c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR') : ''}`);
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'clients.csv'; a.click();
        URL.revokeObjectURL(url);
      });
  }

  function exportCsvDevis() {
    fetch('/api/admin/devis', { headers })
      .then(r => r.json())
      .then((devis: Array<{ numero: string; client_prenom: string; client_nom: string; client_email: string; prestation_nom: string; nb_seances: number; total: number; statut: string; created_at: string }>) => {
        const header = 'Numéro,Client,Email,Prestation,Séances,Total,Statut,Date';
        const rows = devis.map(d => `${d.numero},${d.client_prenom} ${d.client_nom},${d.client_email},${d.prestation_nom},${d.nb_seances},${d.total},${d.statut},${new Date(d.created_at).toLocaleDateString('fr-FR')}`);
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'devis.csv'; a.click();
        URL.revokeObjectURL(url);
      });
  }

  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);

  const PERIODS: [Period, string][] = [
    ['today', t('dashboard.periodeAujourdhui')],
    ['week', t('dashboard.periodeSemaine')],
    ['month', t('dashboard.periodeMois')],
    ['annule', t('dashboard.periodeAnnules')],
  ];

  return (
    <AdminLayout title={t('dashboard.titre')}>

      {/* ── Welcome bar ───────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-extrabold text-[#0A1D35]">{greeting}, {firstName} 👋</h2>
          <p className="text-sm text-[#56627A] capitalize mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/admin/devis')}
            className="flex items-center gap-1.5 border border-[#E7DCCD] bg-white text-[#56627A] text-xs font-semibold px-4 py-2.5 rounded-[10px] hover:bg-[#F7F2EB] transition-colors">
            <FileText size={13} /> {t('dashboard.creerDevis')}
          </button>
          <button onClick={() => setShowNouveauRdv(true)}
            className="flex items-center gap-1.5 bg-[#0A1D35] text-white text-xs font-semibold px-4 py-2.5 rounded-[10px] hover:bg-[#1C3352] transition-colors">
            <Plus size={13} /> {t('dashboard.nouveauRdv')}
          </button>
        </div>
      </div>

      {/* ── Alert banner ──────────────────────────────────────── */}
      {pendingCount > 0 && (
        <div className="flex items-center justify-between bg-[#FFF8EC] border border-[#F6E7C8] rounded-[14px] px-5 py-3 mb-5">
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

      {/* ── Stat cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {STATS.map(({ label, value, icon: Icon, bg, fg, accent }) => (
          <div key={label} className="bg-white border border-[#E7DCCD] rounded-[18px] p-5 relative overflow-hidden hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                style={{ background: bg }}>
                <Icon size={17} style={{ color: fg }} />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#0A1D35] leading-none mb-1">{value}</div>
            <div className="text-xs text-[#56627A]">{label}</div>
            <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-[18px]"
              style={{ background: accent }} />
          </div>
        ))}
      </div>

      {/* ── Revenue chart ─────────────────────────────────────── */}
      <div className="bg-white border border-[#E7DCCD] rounded-[18px] p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-[#0A1D35] mb-1">Activité &amp; revenus — 6 derniers mois</p>
            <p className="text-xs text-[#56627A]">
              CA accepté : <span className="font-bold text-[#0A1D35]">{totalRevenue} €</span>
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={revenueData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRdvs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0A1D35" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#0A1D35" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6CAED6" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#6CAED6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#A8B8C8' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#A8B8C8' }} axisLine={false} tickLine={false} width={28} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#A8B8C8' }} axisLine={false} tickLine={false} width={40} tickFormatter={v => `${v}€`} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: '1px solid #E7DCCD', fontSize: 12 }}
              formatter={(value, name) => name === 'revenue' ? [`${Number(value)} €`, 'Revenus'] : [Number(value), 'Séances']}
            />
            <Area yAxisId="left" type="monotone" dataKey="rdvs" stroke="#0A1D35" strokeWidth={2} fill="url(#gradRdvs)" dot={false} />
            <Area yAxisId="right" type="monotone" dataKey="revenue" stroke="#6CAED6" strokeWidth={2} fill="url(#gradRevenue)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── CSV export buttons ────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={exportCsvClients}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#56627A] border border-[#E7DCCD] bg-white px-3 py-2 rounded-[10px] hover:bg-[#F7F2EB] transition-colors">
          <Download size={12} /> Export clients
        </button>
        <button onClick={exportCsvDevis}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#56627A] border border-[#E7DCCD] bg-white px-3 py-2 rounded-[10px] hover:bg-[#F7F2EB] transition-colors">
          <Download size={12} /> Export devis
        </button>
      </div>

      {/* ── Main two-column layout ────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── Left: RDV table ───────────────────────────────── */}
        <div className="flex-1 min-w-0 bg-white border border-[#E7DCCD] rounded-[18px] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7DCCD]">
            <div className="flex gap-1 bg-[#F7F2EB] rounded-xl p-1">
              {PERIODS.map(([p, label]) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors ${
                    period === p ? 'bg-white text-[#0A1D35] shadow-sm' : 'text-[#56627A] hover:text-[#0A1D35]'
                  }`}>
                  {label}
                  {p === 'today' && stats.today > 0 && (
                    <span className="ml-1.5 bg-[#0A1D35] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats.today}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#56627A]">
              <div className="w-12 h-12 rounded-full bg-[#F7F2EB] flex items-center justify-center mb-3">
                <Zap size={20} className="opacity-40" />
              </div>
              <p className="text-sm font-medium text-[#0A1D35]">{t('dashboard.aucunRdv')}</p>
              <p className="text-xs text-[#A8B8C8] mt-1">{t('dashboard.aucunRdvPeriode')}</p>
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
                  const isPastRdv = new Date(r.fin) < now;
                  return (
                    <tr key={r.id}
                      className={`hover:bg-[#FAFAFA] transition-colors cursor-pointer ${idx < filtered.length - 1 ? 'border-b border-[#F7F2EB]' : ''} ${isPastRdv && r.statut !== 'annule' ? 'opacity-60' : ''}`}
                      onClick={() => setNoteRdv(r)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-[3px] h-7 rounded-full shrink-0" style={{ background: color }} />
                          <Avatar name={clientName} />
                          <span className="font-semibold text-[#0A1D35] text-sm">{clientName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="text-sm text-[#0A1D35] font-medium capitalize" translate="no">
                          {format(new Date(r.debut), 'EEE d MMM', { locale: dateLocale })}
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
                          <div className="text-xs text-[#A8B8C8] mt-0.5 max-w-[180px] truncate">{r.commentaire}</div>
                        )}
                      </td>
                      <td className="px-5 py-3.5"><StatutBadge statut={r.statut} /></td>
                      <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setNoteRdv(r)}
                            className="p-1.5 hover:bg-[#F7F2EB] rounded-[6px] text-[#56627A] transition-colors" title="Notes">
                            <Pencil size={13} />
                          </button>
                          {r.lien_meet && (
                            <a href={r.lien_meet} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 hover:bg-[#D0E7F5] rounded-[6px] text-[#0A5A8A] transition-colors" title="Meet">
                              <Video size={13} />
                            </a>
                          )}
                          {isPastRdv && (
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

        {/* ── Right sidebar ─────────────────────────────────── */}
        <div className="w-[268px] shrink-0 space-y-4">

          {/* Prochaine séance */}
          <div className="bg-[#0A1D35] rounded-[18px] p-5 text-white">
            <p className="text-[#6CAED6] text-[11px] font-bold uppercase tracking-wide mb-4">{t('dashboard.prochaineSeance')}</p>
            {prochainRdv ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={prochainRdv.client ? `${prochainRdv.client.prenom} ${prochainRdv.client.nom}` : '?'} size="md" />
                  <div>
                    <div className="font-bold text-white text-sm leading-tight">
                      {prochainRdv.client?.prenom} {prochainRdv.client?.nom}
                    </div>
                    <div className="text-xs text-[#8FA3B8]">{prochainRdv.prestation?.nom || '—'}</div>
                  </div>
                </div>
                <div className="bg-white/8 border border-white/10 rounded-[12px] px-4 py-3 mb-4">
                  <div className="text-sm font-extrabold text-white capitalize" translate="no">
                    {format(new Date(prochainRdv.debut), 'EEEE d MMM', { locale: dateLocale })}
                  </div>
                  <div className="text-xs text-[#8FA3B8] mt-0.5" translate="no">
                    {format(new Date(prochainRdv.debut), timeFormat)}
                    {prochainRdv.fin ? ` – ${format(new Date(prochainRdv.fin), timeFormat)}` : ''}
                  </div>
                  <div className="text-xs text-[#6CAED6] font-semibold mt-1.5">
                    {formatDistanceToNow(new Date(prochainRdv.debut), { locale: dateLocale, addSuffix: true })}
                  </div>
                </div>
                <div className="flex gap-2">
                  {prochainRdv.lien_meet && (
                    <a href={prochainRdv.lien_meet} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 bg-[#6CAED6] text-[#0A1D35] text-xs font-bold py-2.5 rounded-[10px] hover:opacity-90 transition-opacity">
                      <Video size={12} /> Meet
                    </a>
                  )}
                  <button onClick={() => setNoteRdv(prochainRdv)}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2.5 rounded-[10px] transition-colors">
                    <Pencil size={12} /> Notes
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <Calendar size={24} className="mx-auto mb-2 text-[#56627A]" />
                <p className="text-sm text-[#56627A]">{t('dashboard.aucunRdvAVenir')}</p>
              </div>
            )}
          </div>

          {/* Agenda du jour */}
          <div className="bg-white border border-[#E7DCCD] rounded-[18px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E7DCCD] flex items-center justify-between">
              <p className="text-xs font-bold text-[#56627A] uppercase tracking-wider">{t('dashboard.agendaDuJour')}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${todayRdvs.length > 0 ? 'bg-[#D0E7F5] text-[#0A5A8A]' : 'bg-[#F7F2EB] text-[#A8B8C8]'}`}>
                {todayRdvs.length}
              </span>
            </div>
            {todayRdvs.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-[#F7F2EB] flex items-center justify-center mx-auto mb-2">
                  <Zap size={16} className="text-[#A8B8C8]" />
                </div>
                <p className="text-xs font-medium text-[#0A1D35]">{t('dashboard.journeeLibre')}</p>
                <p className="text-xs text-[#A8B8C8] mt-0.5">{t('dashboard.aucuneSeanceAujourdhui')}</p>
              </div>
            ) : (
              <div className="divide-y divide-[#F7F2EB]">
                {todayRdvs.map(r => {
                  const color = r.prestation?.couleur || '#6CAED6';
                  const isPastRdv = new Date(r.debut) < now;
                  const isNow = new Date(r.debut) <= now && now <= new Date(r.fin);
                  return (
                    <div key={r.id}
                      className={`flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[#FAFAFA] transition-colors ${isPastRdv && !isNow ? 'opacity-50' : ''}`}
                      onClick={() => setNoteRdv(r)}>
                      <div className="text-[11px] font-bold text-[#56627A] w-10 shrink-0 tabular-nums" translate="no">
                        {format(new Date(r.debut), timeFormat)}
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-semibold truncate ${isNow ? 'text-[#1E6B4A]' : 'text-[#0A1D35]'}`}>
                          {r.client?.prenom} {r.client?.nom}
                        </div>
                        <div className="text-[10px] text-[#56627A] truncate">{r.prestation?.nom}</div>
                      </div>
                      {isNow && (
                        <span className="text-[10px] font-bold text-[#1E6B4A] bg-[#DCEFE4] px-1.5 py-0.5 rounded-full shrink-0">{t('dashboard.enCours')}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="bg-white border border-[#E7DCCD] rounded-[18px] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#E7DCCD]">
              <p className="text-xs font-bold text-[#56627A] uppercase tracking-wider">{t('dashboard.acceRapide')}</p>
            </div>
            <div className="divide-y divide-[#F7F2EB]">
              {[
                { label: t('dashboard.quickClients'), sub: t('dashboard.quickClientsSub', { count: stats.clients }), icon: Users, path: '/admin/clients', color: '#D0E7F5', fg: '#0A5A8A' },
                { label: t('dashboard.quickDevis'), sub: t('dashboard.quickDevisSub'), icon: FileText, path: '/admin/devis', color: '#DCEFE4', fg: '#1E6B4A' },
                { label: t('dashboard.quickAgenda'), sub: t('dashboard.quickAgendaSub'), icon: Calendar, path: '/admin/planning', color: '#F6E7C8', fg: '#8A5A12' },
              ].map(({ label, sub, icon: Icon, path, color, fg }) => (
                <button key={path} onClick={() => navigate(path)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAFAFA] transition-colors text-left group">
                  <div className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                    style={{ background: color }}>
                    <Icon size={14} style={{ color: fg }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[#0A1D35]">{label}</div>
                    <div className="text-xs text-[#A8B8C8]">{sub}</div>
                  </div>
                  <ChevronRight size={14} className="text-[#A8B8C8] group-hover:text-[#56627A] transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Total séances */}
          <div className="bg-[#F7F2EB] border border-[#E7DCCD] rounded-[18px] p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#56627A] uppercase tracking-wide mb-1">{t('dashboard.totalSeances')}</div>
                <div className="text-4xl font-extrabold text-[#0A1D35] leading-none">{stats.total}</div>
                <div className="text-xs text-[#A8B8C8] mt-1">{t('dashboard.depuisLeDebut')}</div>
              </div>
              <div className="w-14 h-14 rounded-full bg-[#0A1D35] flex items-center justify-center">
                <TrendingUp size={22} className="text-[#6CAED6]" />
              </div>
            </div>
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
