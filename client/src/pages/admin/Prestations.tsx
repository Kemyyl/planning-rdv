import { useEffect, useState } from 'react';
import { Plus, Pencil, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import type { Prestation } from '@synego/shared';

export default function AdminPrestations() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Prestation>>({});

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    fetch('/api/admin/prestations', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => setPrestations(Array.isArray(data) ? data : []));
  }, []);

  async function sauvegarder(id: string) {
    try {
      const res = await fetch(`/api/admin/prestations/${id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error();
      setPrestations(prev => prev.map(p => p.id === id ? { ...p, ...editData } : p));
      setEditId(null);
      toast.success('Prestation mise à jour');
    } catch { toast.error('Erreur lors de la mise à jour'); }
  }

  async function toggleActif(p: Prestation) {
    try {
      await fetch(`/api/admin/prestations/${p.id}`, {
        method: 'PATCH', headers, body: JSON.stringify({ actif: !p.actif }),
      });
      setPrestations(prev => prev.map(x => x.id === p.id ? { ...x, actif: !x.actif } : x));
    } catch { toast.error('Erreur'); }
  }

  function startEdit(p: Prestation) {
    setEditId(p.id);
    setEditData({ nom: p.nom, nom_en: p.nom_en, description: p.description, description_en: p.description_en, duree: p.duree, prix: p.prix, couleur: p.couleur });
  }

  return (
    <AdminLayout title={t('prestations.titre')}>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-[#56627A]">{t('prestations.desc')}</p>
        <button className="flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-4 py-2 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors">
          <Plus size={15} />{t('prestations.ajouter')}
        </button>
      </div>

      <div className="space-y-3">
        {prestations.map(p => (
          <div key={p.id} className="bg-[#FFFDFA] border border-[#E7DCCD] rounded-[18px] p-5">
            {editId === p.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('prestations.nom')} 🇫🇷</label>
                    <input value={editData.nom || ''} onChange={e => setEditData(d => ({ ...d, nom: e.target.value }))}
                      className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('prestations.nom')} 🇬🇧</label>
                    <input value={(editData as Partial<Prestation> & { nom_en?: string }).nom_en || ''} onChange={e => setEditData(d => ({ ...d, nom_en: e.target.value }))}
                      placeholder="English name"
                      className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-[#56627A] mb-1 block">Description 🇫🇷</label>
                    <input value={editData.description || ''} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                      className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-[#56627A] mb-1 block">Description 🇬🇧</label>
                    <input value={(editData as Partial<Prestation> & { description_en?: string }).description_en || ''} onChange={e => setEditData(d => ({ ...d, description_en: e.target.value }))}
                      placeholder="English description"
                      className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('prestations.duree')}</label>
                    <input type="number" value={editData.duree || 60} onChange={e => setEditData(d => ({ ...d, duree: +e.target.value }))}
                      className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('prestations.prix')}</label>
                    <input type="number" value={editData.prix || ''} onChange={e => setEditData(d => ({ ...d, prix: +e.target.value }))}
                      className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('prestations.couleur')}</label>
                    <input type="color" value={editData.couleur || '#6CAED6'} onChange={e => setEditData(d => ({ ...d, couleur: e.target.value }))}
                      className="w-full h-[38px] border border-[#E7DCCD] rounded-[10px] px-1 cursor-pointer" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => sauvegarder(p.id)} className="flex items-center gap-1 bg-[#1E6B4A] text-white font-bold px-4 py-2 rounded-[10px] text-sm">
                    <Check size={14} />{t('prestations.enregistrer')}
                  </button>
                  <button onClick={() => setEditId(null)} className="flex items-center gap-1 border border-[#E7DCCD] text-[#56627A] font-medium px-4 py-2 rounded-[10px] text-sm">
                    <X size={14} />{t('prestations.annuler')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full shrink-0" style={{ background: p.couleur }} />
                <div className="flex-1">
                  <div className="font-bold text-[#0A1D35]">{p.nom}</div>
                  <div className="text-sm text-[#56627A]">{p.duree} min{p.prix ? ` · ${p.prix} €` : ''}</div>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.actif ? 'bg-[#DCEFE4] text-[#1E6B4A]' : 'bg-[#F7DDD8] text-[#9B2C1F]'}`}>
                  {p.actif ? t('prestations.actif') : t('prestations.masque')}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => startEdit(p)} className="p-2 hover:bg-[#F7F2EB] rounded-[8px] transition-colors text-[#56627A]">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => toggleActif(p)} className="text-xs border border-[#E7DCCD] px-3 py-1.5 rounded-[8px] hover:bg-[#F7F2EB] transition-colors text-[#56627A]">
                    {p.actif ? t('prestations.masquer') : t('prestations.activer')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
