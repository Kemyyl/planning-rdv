import { useEffect, useState } from 'react';
import { format, formatDistanceToNow, isThisMonth } from 'date-fns';
import { useDateLocale } from '../../hooks/useDateLocale';
import { Search, Plus, Eye, Pencil, Check, Users, UserCheck, Sparkles, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import NouveauClientPanel from '../../components/NouveauClientPanel';
import ClientPanel from '../../components/ClientPanel';
import type { ClientAccount } from '@synego/shared';

interface ClientWithStats extends ClientAccount {
  seances_count?: number;
  has_notes?: boolean;
  seances_objectif?: number;
  dernier_rdv?: string | null;
}

type Filter = 'tous' | 'actif' | 'inactif';

const AVATAR_PALETTES = [
  ['bg-[#D0E7F5]', 'text-[#1A5F8A]'],
  ['bg-[#DCEFE4]', 'text-[#1E6B4A]'],
  ['bg-[#F2E8DC]', 'text-[#8A5A12]'],
  ['bg-[#EDE9FE]', 'text-[#5B21B6]'],
  ['bg-[#FCE7F3]', 'text-[#9D174D]'],
  ['bg-[#FEF3C7]', 'text-[#92400E]'],
];

function getAvatarPalette(name: string): [string, string] {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[idx] as [string, string];
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const [bg, text] = getAvatarPalette(name);
  return (
    <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center text-xs font-bold ${text} shrink-0`}>
      {initials}
    </div>
  );
}

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const barColor = pct >= 100 ? '#1E6B4A' : pct >= 66 ? '#6CAED6' : pct >= 33 ? '#D9C9B4' : '#E7DCCD';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-[#F7F2EB] rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <span className="text-xs font-bold text-[#0A1D35] tabular-nums whitespace-nowrap">{value}/{total}</span>
    </div>
  );
}

export default function AdminClients() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { token } = useAuth();
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('tous');
  const [editingObjectif, setEditingObjectif] = useState<{ id: number; val: string } | null>(null);
  const [showNouveauClient, setShowNouveauClient] = useState(false);
  const [clientPanel, setClientPanel] = useState<{ client: ClientWithStats; readOnly: boolean } | null>(null);
  const headers = { Authorization: `Bearer ${token}` };

  async function saveObjectif(clientId: number, val: string) {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) { toast.error('Valeur invalide'); return; }
    const res = await fetch(`/api/admin/clients/${clientId}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ seances_objectif: n }),
    });
    if (res.ok) {
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, seances_objectif: n } : c));
      toast.success('Objectif mis à jour');
    } else { toast.error('Erreur'); }
    setEditingObjectif(null);
  }

  function reload() {
    fetch('/api/admin/clients?stats=1', { headers })
      .then(r => r.json()).then(data => setClients(Array.isArray(data) ? data : []));
  }

  useEffect(() => { reload(); }, []);

  const filtered = clients.filter(c => {
    const matchSearch = `${c.prenom} ${c.nom} ${c.email} ${c.telephone || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'tous' ? true : filter === 'actif' ? c.compte_actif : !c.compte_actif;
    return matchSearch && matchFilter;
  });

  const counts = {
    tous: clients.length,
    actif: clients.filter(c => c.compte_actif).length,
    inactif: clients.filter(c => !c.compte_actif).length,
  };
  const nouveauxCeMois = clients.filter(c => c.created_at && isThisMonth(new Date(c.created_at))).length;

  const FILTERS: [Filter, string][] = [
    ['tous', t('clients.tous')],
    ['actif', t('clients.actif')],
    ['inactif', t('clients.inactif')],
  ];

  return (
    <AdminLayout title={t('clients.titre')}>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#E7DCCD] rounded-[16px] p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#D0E7F5] rounded-[12px] flex items-center justify-center shrink-0">
            <Users size={17} className="text-[#1A5F8A]" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-[#0A1D35] leading-none">{counts.tous}</div>
            <div className="text-xs text-[#56627A] mt-0.5">Clients au total</div>
          </div>
        </div>
        <div className="bg-white border border-[#E7DCCD] rounded-[16px] p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#DCEFE4] rounded-[12px] flex items-center justify-center shrink-0">
            <UserCheck size={17} className="text-[#1E6B4A]" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-[#0A1D35] leading-none">{counts.actif}</div>
            <div className="text-xs text-[#56627A] mt-0.5">Comptes actifs</div>
          </div>
        </div>
        <div className="bg-white border border-[#E7DCCD] rounded-[16px] p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F2E8DC] rounded-[12px] flex items-center justify-center shrink-0">
            <Sparkles size={17} className="text-[#8A5A12]" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-[#0A1D35] leading-none">{nouveauxCeMois}</div>
            <div className="text-xs text-[#56627A] mt-0.5">Nouveaux ce mois</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-[#F7F2EB] border border-[#E7DCCD] rounded-xl p-1">
            {FILTERS.map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  filter === f ? 'bg-white text-[#0A1D35] shadow-sm' : 'text-[#56627A] hover:text-[#0A1D35]'
                }`}>
                {label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === f ? 'bg-[#D0E7F5] text-[#0A1D35]' : 'bg-[#E7DCCD] text-[#56627A]'
                }`}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8B8C8]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('clients.rechercher')}
              className="border border-[#E7DCCD] rounded-xl pl-8 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6CAED6] transition w-56" />
          </div>
        </div>
        <button onClick={() => setShowNouveauClient(true)}
          className="flex items-center gap-1.5 bg-[#0A1D35] text-white text-sm font-semibold px-4 py-2 rounded-[12px] hover:bg-[#1C3352] transition-colors">
          <Plus size={14} /> {t('clients.nouveau')}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E7DCCD] rounded-[18px] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#F7F2EB]">
              {['Client', 'Contact', 'Dernière séance', 'Progression', 'Statut', ''].map((h, i) => (
                <th key={i} className="text-left px-5 py-3.5 text-[11px] font-bold text-[#A8B8C8] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-14 text-center">
                  <Users size={28} className="mx-auto mb-3 text-[#D9C9B4]" />
                  <p className="text-sm text-[#56627A]">{t('clients.aucunClient')}</p>
                </td>
              </tr>
            ) : filtered.map((c, idx) => {
              const fullName = `${c.prenom} ${c.nom}`;
              const objectif = c.seances_objectif ?? 12;
              const seances = c.seances_count ?? 0;
              return (
                <tr key={c.id}
                  className={`hover:bg-[#FAFAFA] transition-colors cursor-pointer ${idx < filtered.length - 1 ? 'border-b border-[#F7F2EB]' : ''}`}
                  onClick={() => setClientPanel({ client: c, readOnly: true })}>

                  {/* Client */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={fullName} />
                      <div>
                        <div className="font-semibold text-[#0A1D35] leading-tight">{fullName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-[#A8B8C8] font-mono">#{c.id}</span>
                          {c.has_notes && <span title="A des notes"><FileText size={10} className="text-[#6CAED6]" /></span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-5 py-4">
                    <div className="text-xs text-[#56627A]">{c.email}</div>
                    {c.telephone && <div className="text-xs text-[#A8B8C8] mt-0.5">{c.telephone}</div>}
                  </td>

                  {/* Dernière séance */}
                  <td className="px-5 py-4">
                    {c.dernier_rdv ? (
                      <div>
                        <div className="text-xs font-medium text-[#0A1D35]" translate="no">
                          {format(new Date(c.dernier_rdv), 'd MMM yyyy', { locale: dateLocale })}
                        </div>
                        <div className="text-[10px] text-[#A8B8C8] mt-0.5">
                          {formatDistanceToNow(new Date(c.dernier_rdv), { locale: dateLocale, addSuffix: true })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-[#D9C9B4]">Aucune séance</span>
                    )}
                  </td>

                  {/* Progression */}
                  <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                    <div className="mb-1.5">
                      <ProgressBar value={seances} total={objectif} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#A8B8C8]">Objectif :</span>
                      {editingObjectif?.id === c.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="1" max="100"
                            value={editingObjectif.val}
                            onChange={e => setEditingObjectif({ id: c.id, val: e.target.value })}
                            onKeyDown={e => { if (e.key === 'Enter') saveObjectif(c.id, editingObjectif.val); if (e.key === 'Escape') setEditingObjectif(null); }}
                            className="w-10 border border-[#6CAED6] rounded-[5px] px-1 py-0.5 text-[10px] focus:outline-none text-center"
                            autoFocus
                          />
                          <button onClick={() => saveObjectif(c.id, editingObjectif.val)}
                            className="p-0.5 bg-[#DCEFE4] text-[#1E6B4A] rounded-[4px] hover:opacity-80">
                            <Check size={10} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingObjectif({ id: c.id, val: String(objectif) })}
                          className="text-[10px] text-[#56627A] hover:text-[#0A1D35] font-semibold underline decoration-dotted">
                          {objectif} séances
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Statut */}
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      c.compte_actif ? 'bg-[#DCEFE4] text-[#1E6B4A]' : 'bg-[#F7DDD8] text-[#9B2C1F]'
                    }`}>
                      {c.compte_actif ? t('clients.actif') : t('clients.inactif')}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => setClientPanel({ client: c, readOnly: true })}
                        className="p-1.5 hover:bg-[#F7F2EB] rounded-[7px] text-[#56627A] transition-colors" title="Voir">
                        <Eye size={14} />
                      </button>
                      <button onClick={() => setClientPanel({ client: c, readOnly: false })}
                        className="p-1.5 hover:bg-[#F7F2EB] rounded-[7px] text-[#56627A] transition-colors" title="Modifier">
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {clientPanel && (
        <ClientPanel
          client={clientPanel.client}
          readOnly={clientPanel.readOnly}
          onClose={() => setClientPanel(null)}
          onUpdated={updated => setClients(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))}
        />
      )}
      {showNouveauClient && (
        <NouveauClientPanel
          onClose={() => setShowNouveauClient(false)}
          onCreated={() => { setShowNouveauClient(false); reload(); }}
        />
      )}
    </AdminLayout>
  );
}
