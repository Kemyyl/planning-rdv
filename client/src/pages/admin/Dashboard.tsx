import { useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isThisWeek, isThisMonth } from 'date-fns';
import { useDateLocale, useTimeFormat } from '../../hooks/useDateLocale';
import { Calendar, Users, Clock, Bell, Plus, Pencil, Trash2, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import NoteSeancePanel from '../../components/NoteSeancePanel';
import NouveauRdvPanel from '../../components/NouveauRdvPanel';
import type { RendezVous } from '@synego/shared';

interface Stats { today: number; week: number; total: number; clients: number }
type Period = 'today' | 'week' | 'month';

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full bg-[#D0E7F5] flex items-center justify-center text-xs font-bold text-[#0A1D35] shrink-0">
      {initials}
    </div>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    confirme: 'bg-[#DCEFE4] text-[#1E6B4A]',
    en_attente: 'bg-[#F6E7C8] text-[#8A5A12]',
    annule: 'bg-[#F7DDD8] text-[#9B2C1F]',
  };
  const labels: Record<string, string> = {
    confirme: t('dashboard.confirme'),
    en_attente: t('dashboard.enAttenteStatut'),
    annule: t('dashboard.annule'),
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[statut] || 'bg-[#F7F2EB] text-[#56627A]'}`}>
      {labels[statut] || statut}
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
  const [stats, setStats] = useState<Stats>({ today: 0, week: 0, total: 0, clients: 0 });
  const [noteRdv, setNoteRdv] = useState<RendezVous | null>(null);
  const [showNouveauRdv, setShowNouveauRdv] = useState(false);
  const [period, setPeriod] = useState<Period>('today');
  const [pendingCount, setPendingCount] = useState(0);

  const headers = { Authorization: `Bearer ${token}` };

  async function deleteRdv(id: string, e: MouseEvent) {
    e.stopPropagation();
    if (!confirm('Annuler ce rendez-vous ?')) return;
    const res = await fetch(`/api/admin/rdv/${id}`, { method: 'DELETE', headers });
    if (res.ok) {
      setRdvs(prev => prev.filter(r => r.id !== id));
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

  const filtered = rdvs.filter(r => {
    const d = new Date(r.debut);
    if (period === 'today') return isToday(d);
    if (period === 'week') return isThisWeek(d, { weekStartsOn: 1 });
    return isThisMonth(d);
  });

  const prochaineSeance = rdvs[0];
  const prochaineHeure = prochaineSeance
    ? format(new Date(prochaineSeance.debut), timeFormat)
    : '—';

  const STATS = [
    { label: t('dashboard.rdvAujourdHui'), value: stats.today, icon: Clock, color: 'bg-[#D0E7F5]' },
    { label: t('dashboard.cetteSemaine'), value: stats.week, icon: Calendar, color: 'bg-[#F2E8DC]' },
    { label: t('dashboard.clientsActifs'), value: stats.clients, icon: Users, color: 'bg-[#DCEFE4]' },
    { label: t('dashboard.prochaineSeance'), value: prochaineHeure, icon: Clock, color: 'bg-[#F6E7C8]' },
  ];

  return (
    <AdminLayout title={t('dashboard.titre')}>
      {pendingCount > 0 && (
        <div className="flex items-center justify-between bg-[#FFF8EC] border border-[#F6E7C8] rounded-[14px] px-5 py-3 mb-6 text-sm">
          <div className="flex items-center gap-2 text-[#8A5A12] font-medium">
            <Bell size={15} />
            {pendingCount} {t('dashboard.enAttente')}
          </div>
          <button onClick={() => navigate('/admin/planning')} className="text-[#8A5A12] font-semibold text-xs hover:underline flex items-center gap-1">
            {t('dashboard.voir')} →
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-[#E7DCCD] rounded-[18px] p-5">
            <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mb-3`}>
              <Icon size={16} className="text-[#0A1D35]" />
            </div>
            <div className="text-2xl font-extrabold text-[#0A1D35]">{value}</div>
            <div className="text-xs text-[#56627A] mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#E7DCCD] rounded-[18px] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7DCCD]">
          <div className="flex gap-1 bg-[#F7F2EB] rounded-xl p-1">
            {([['today', t('dashboard.rdvAujourdHui')], ['week', t('dashboard.cetteSemaine')], ['month', t('dashboard.resume')]] as [Period, string][]).map(([p, label]) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-4 py-1.5 rounded-[10px] text-sm font-medium transition-colors ${
                  period === p ? 'bg-white text-[#0A1D35] shadow-sm' : 'text-[#56627A] hover:text-[#0A1D35]'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setShowNouveauRdv(true)} className="flex items-center gap-1.5 bg-[#0A1D35] text-white text-xs font-semibold px-3 py-2 rounded-[10px] hover:bg-[#1C3352] transition-colors">
            <Plus size={13} /> {t('dashboard.nouveauRdv')}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-[#56627A] text-sm">{t('dashboard.aucunRdv')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F7F2EB]">
                {[t('dashboard.client'), t('dashboard.dateHeure'), t('dashboard.type'), t('dashboard.statut'), t('dashboard.actions')].map(h => (
                  <th key={h} className="text-left px-6 py-3 text-xs font-bold text-[#56627A] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7DCCD]">
              {filtered.map(r => {
                const clientName = r.client ? `${r.client.prenom} ${r.client.nom}` : '—';
                return (
                  <tr key={r.id} className="hover:bg-[#F7F2EB] transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={clientName} />
                        <span className="font-medium text-[#0A1D35]">{clientName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-[#56627A] capitalize">
                      {format(new Date(r.debut), `EEE d MMM '${atWord}' ${timeFormat}`, { locale: dateLocale })}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="text-[#56627A]">{r.titre || r.prestation?.nom || '—'}</div>
                      {r.commentaire && <div className="text-xs text-[#A8B8C8] mt-0.5 max-w-[220px] truncate" title={r.commentaire}>{r.commentaire}</div>}
                    </td>
                    <td className="px-6 py-3.5"><StatutBadge statut={r.statut} /></td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setNoteRdv(r)} className="p-1.5 hover:bg-[#E7DCCD] rounded-[6px] text-[#56627A] transition-colors" title={t('dashboard.resume')}>
                          <Pencil size={13} />
                        </button>
                        {r.lien_meet && (
                          <a href={r.lien_meet} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 hover:bg-[#D0E7F5] rounded-[6px] text-[#0A1D35] transition-colors" title="Rejoindre le Meet">
                            <Video size={13} />
                          </a>
                        )}
                        <button onClick={e => deleteRdv(r.id, e)} className="p-1.5 hover:bg-[#F7DDD8] rounded-[6px] text-[#9B2C1F] transition-colors" title={t('dashboard.annuler')}>
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
