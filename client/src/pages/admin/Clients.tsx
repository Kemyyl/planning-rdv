import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Search, Plus, Eye, Pencil, FileText, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import type { ClientAccount } from '@synego/shared';

interface ClientWithStats extends ClientAccount {
  seances_count?: number;
  has_notes?: boolean;
  seances_objectif?: number;
}

type Filter = 'tous' | 'actif' | 'inactif';

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full bg-[#D0E7F5] flex items-center justify-center text-xs font-bold text-[#0A1D35] shrink-0">
      {initials}
    </div>
  );
}

export default function AdminClients() {
  const { token } = useAuth();
  const [clients, setClients] = useState<ClientWithStats[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('tous');
  const [editingObjectif, setEditingObjectif] = useState<{ id: string; val: string } | null>(null);
  const headers = { Authorization: `Bearer ${token}` };

  async function saveObjectif(clientId: string, val: string) {
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

  useEffect(() => {
    fetch('/api/admin/clients?stats=1', { headers })
      .then(r => r.json()).then(data => setClients(Array.isArray(data) ? data : []));
  }, []);

  const filtered = clients.filter(c => {
    const matchSearch = `${c.prenom} ${c.nom} ${c.email} ${c.telephone || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'tous' ? true :
      filter === 'actif' ? c.compte_actif :
      !c.compte_actif;
    return matchSearch && matchFilter;
  });

  const counts = {
    tous: clients.length,
    actif: clients.filter(c => c.compte_actif).length,
    inactif: clients.filter(c => !c.compte_actif).length,
  };

  return (
    <AdminLayout title="Clients">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-[#F7F2EB] border border-[#E7DCCD] rounded-xl p-1">
            {([['tous', 'Tous'], ['actif', 'Actif'], ['inactif', 'Inactif']] as [Filter, string][]).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  filter === f ? 'bg-white text-[#0A1D35] shadow-sm' : 'text-[#56627A] hover:text-[#0A1D35]'
                }`}>
                {label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-[#F7F2EB]' : 'bg-[#E7DCCD]'} text-[#56627A]`}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#56627A]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="border border-[#E7DCCD] rounded-xl pl-8 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6CAED6] transition w-56" />
          </div>
        </div>
        <button className="flex items-center gap-1.5 bg-[#0A1D35] text-white text-sm font-semibold px-4 py-2 rounded-[12px] hover:bg-[#1C3352] transition-colors">
          <Plus size={14} /> Nouveau client
        </button>
      </div>

      <div className="bg-white border border-[#E7DCCD] rounded-[18px] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F7F2EB] border-b border-[#E7DCCD]">
              {['Nom', 'Email', 'Téléphone', 'Dernier RDV', 'Séances / Objectif', 'Notes', 'Actions'].map(h => (
                <th key={h} className="text-left px-5 py-3 text-xs font-bold text-[#56627A] uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E7DCCD]">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-[#56627A] text-sm">Aucun client trouvé.</td></tr>
            ) : filtered.map(c => {
              const fullName = `${c.prenom} ${c.nom}`;
              const isActif = c.compte_actif;
              return (
                <tr key={c.id} className="hover:bg-[#F7F2EB] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={fullName} />
                      <span className="font-medium text-[#0A1D35]">{fullName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-[#56627A]">{c.email}</td>
                  <td className="px-5 py-3.5 text-[#56627A]">{c.telephone || '—'}</td>
                  <td className="px-5 py-3.5 text-[#56627A]">
                    {c.created_at ? format(new Date(c.created_at), 'd MMM yyyy', { locale: fr }) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-[#F7F2EB] rounded-lg text-xs font-bold text-[#0A1D35]">
                        {c.seances_count ?? 0}
                      </span>
                      <span className="text-xs text-[#56627A]">/</span>
                      {editingObjectif?.id === c.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="1" max="100"
                            value={editingObjectif.val}
                            onChange={e => setEditingObjectif({ id: c.id, val: e.target.value })}
                            onKeyDown={e => { if (e.key === 'Enter') saveObjectif(c.id, editingObjectif.val); if (e.key === 'Escape') setEditingObjectif(null); }}
                            className="w-12 border border-[#6CAED6] rounded-[6px] px-1.5 py-0.5 text-xs focus:outline-none"
                            autoFocus
                          />
                          <button onClick={() => saveObjectif(c.id, editingObjectif.val)}
                            className="p-1 bg-[#DCEFE4] text-[#1E6B4A] rounded-[4px] hover:opacity-80">
                            <Check size={11} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingObjectif({ id: c.id, val: String(c.seances_objectif ?? 12) })}
                          className="text-xs text-[#56627A] hover:text-[#0A1D35] font-medium underline decoration-dotted">
                          {c.seances_objectif ?? 12}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    {c.has_notes ? (
                      <FileText size={15} className="text-[#6CAED6]" />
                    ) : (
                      <FileText size={15} className="text-[#D9C9B4]" />
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isActif ? 'bg-[#DCEFE4] text-[#1E6B4A]' : 'bg-[#F7DDD8] text-[#9B2C1F]'
                      }`}>
                        {isActif ? 'Actif' : 'Inactif'}
                      </span>
                      <button className="p-1.5 hover:bg-[#E7DCCD] rounded-[6px] text-[#56627A] transition-colors"><Eye size={13} /></button>
                      <button className="p-1.5 hover:bg-[#E7DCCD] rounded-[6px] text-[#56627A] transition-colors"><Pencil size={13} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
