import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, GraduationCap, Users, BookOpen, Lock, Unlock, ChevronDown, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';

interface Formation {
  id: string;
  titre: string;
  slug: string;
  description?: string;
  prix: number;
  image_url?: string;
  duree_heures?: number;
  is_published: boolean;
  created_at: string;
  modules_count?: number;
  achats_count?: number;
}

interface Module {
  id: string;
  formation_id: string;
  titre: string;
  ordre: number;
  contenu?: string;
  video_url?: string;
  duree_minutes?: number;
  is_free: boolean;
}

interface Etudiant {
  id: string;
  client_email: string;
  paid_at: string;
  client?: { prenom: string; nom: string; email: string };
}

export default function AdminFormations() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loading, setLoading] = useState(true);

  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Formation>>({});

  const [showCreate, setShowCreate] = useState(false);
  const [createData, setCreateData] = useState({ titre: '', description: '', prix: 0, image_url: '', duree_heures: 0 });
  const [creating, setCreating] = useState(false);

  const [modulesOpen, setModulesOpen] = useState<string | null>(null);
  const [modules, setModules] = useState<Record<string, Module[]>>({});

  const [etudiantsModal, setEtudiantsModal] = useState<{ formationId: string; titre: string } | null>(null);
  const [etudiants, setEtudiants] = useState<Etudiant[]>([]);

  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  async function fetchFormations() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/formations', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFormations(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchFormations(); }, []);

  async function fetchModules(formationId: string) {
    try {
      const res = await fetch(`/api/admin/formations/${formationId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setModules(prev => ({ ...prev, [formationId]: data.modules || [] }));
    } catch { toast.error(t('adminFormations.erreurChargement')); }
  }

  async function creer() {
    if (!createData.titre.trim()) { toast.error(t('adminFormations.titreRequis')); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/formations', {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          titre: createData.titre.trim(),
          description: createData.description.trim() || undefined,
          prix: createData.prix || 0,
          image_url: createData.image_url.trim() || undefined,
          duree_heures: createData.duree_heures || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(t('adminFormations.formationCree'));
      setShowCreate(false);
      setCreateData({ titre: '', description: '', prix: 0, image_url: '', duree_heures: 0 });
      fetchFormations();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('adminFormations.erreur'));
    } finally {
      setCreating(false);
    }
  }

  function startEdit(f: Formation) {
    setEditId(f.id);
    setEditData({
      titre: f.titre,
      description: f.description,
      prix: Number(f.prix) || 0,
      image_url: f.image_url,
      duree_heures: f.duree_heures,
    });
    setModulesOpen(null);
  }

  async function sauvegarder(id: string) {
    try {
      const res = await fetch(`/api/admin/formations/${id}`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error();
      setFormations(prev => prev.map(f => f.id === id ? { ...f, ...editData } as Formation : f));
      setEditId(null);
      toast.success(t('adminFormations.formationMaj'));
    } catch { toast.error(t('adminFormations.erreur')); }
  }

  async function togglePublish(f: Formation) {
    try {
      const res = await fetch(`/api/admin/formations/${f.id}/publier`, { method: 'PATCH', headers: authHeaders });
      if (!res.ok) throw new Error();
      setFormations(prev => prev.map(x => x.id === f.id ? { ...x, is_published: !x.is_published } : x));
    } catch { toast.error(t('adminFormations.erreur')); }
  }

  async function supprimer(id: string) {
    if (!confirm(t('adminFormations.confirmerSuppression'))) return;
    try {
      const res = await fetch(`/api/admin/formations/${id}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) throw new Error();
      toast.success(t('adminFormations.formationSupprimee'));
      setFormations(prev => prev.filter(f => f.id !== id));
    } catch { toast.error(t('adminFormations.erreur')); }
  }

  async function toggleModulesPanel(formationId: string) {
    if (modulesOpen === formationId) { setModulesOpen(null); return; }
    setModulesOpen(formationId);
    setEditId(null);
    if (!modules[formationId]) await fetchModules(formationId);
  }

  async function ouvrirEtudiants(formationId: string, titre: string) {
    setEtudiantsModal({ formationId, titre });
    try {
      const res = await fetch(`/api/admin/formations/${formationId}/etudiants`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setEtudiants(Array.isArray(data) ? data : []);
    } catch { toast.error(t('adminFormations.erreur')); }
  }

  return (
    <AdminLayout title={t('admin.formations')}>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-[#56627A]">{t('adminFormations.desc')}</p>
        <button onClick={() => { setShowCreate(true); setEditId(null); }}
          className="flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-4 py-2 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors">
          <Plus size={15} /> {t('adminFormations.ajouter')}
        </button>
      </div>

      <div className="space-y-3">
        {/* Create form */}
        {showCreate && (
          <div className="bg-[#FFFDFA] border-2 border-[#6CAED6] rounded-[18px] p-5">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.titre')}</label>
                  <input value={createData.titre} autoFocus
                    onChange={e => setCreateData(d => ({ ...d, titre: e.target.value }))}
                    placeholder={t('adminFormations.titrePlaceholder')}
                    className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.description')}</label>
                  <textarea value={createData.description} rows={3}
                    onChange={e => setCreateData(d => ({ ...d, description: e.target.value }))}
                    className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.prix')}</label>
                  <input type="number" value={createData.prix}
                    onChange={e => setCreateData(d => ({ ...d, prix: +e.target.value }))}
                    className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.duree')}</label>
                  <input type="number" value={createData.duree_heures}
                    onChange={e => setCreateData(d => ({ ...d, duree_heures: +e.target.value }))}
                    className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.imageUrl')}</label>
                  <input value={createData.image_url}
                    onChange={e => setCreateData(d => ({ ...d, image_url: e.target.value }))}
                    placeholder="https://…"
                    className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={creer} disabled={creating || !createData.titre.trim()}
                  className="flex items-center gap-1 bg-[#1E6B4A] text-white font-bold px-4 py-2 rounded-[10px] text-sm disabled:opacity-40">
                  <Check size={14} /> {creating ? t('adminFormations.creation') : t('adminFormations.creer')}
                </button>
                <button onClick={() => setShowCreate(false)}
                  className="flex items-center gap-1 border border-[#E7DCCD] text-[#56627A] font-medium px-4 py-2 rounded-[10px] text-sm">
                  <X size={14} /> {t('adminFormations.annuler')}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-sm text-[#56627A]">{t('common.chargement')}</div>
        )}

        {!loading && formations.length === 0 && !showCreate && (
          <div className="bg-white border border-dashed border-[#E7DCCD] rounded-[20px] p-12 text-center">
            <GraduationCap size={28} className="text-[#A8B8C8] mx-auto mb-3" />
            <p className="font-semibold text-[#0A1D35] mb-1">{t('adminFormations.aucune')}</p>
            <p className="text-sm text-[#56627A]">{t('adminFormations.aucuneDesc')}</p>
          </div>
        )}

        {formations.map(f => (
          <div key={f.id} className="bg-[#FFFDFA] border border-[#E7DCCD] rounded-[18px] p-5">
            {editId === f.id ? (
              // ── Edit mode ──────────────────────────────────────────────
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.titre')}</label>
                    <input value={editData.titre || ''}
                      onChange={e => setEditData(d => ({ ...d, titre: e.target.value }))}
                      className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.description')}</label>
                    <textarea value={editData.description || ''} rows={3}
                      onChange={e => setEditData(d => ({ ...d, description: e.target.value }))}
                      className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.prix')}</label>
                    <input type="number" value={editData.prix || 0}
                      onChange={e => setEditData(d => ({ ...d, prix: +e.target.value }))}
                      className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.duree')}</label>
                    <input type="number" value={editData.duree_heures || 0}
                      onChange={e => setEditData(d => ({ ...d, duree_heures: +e.target.value }))}
                      className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.imageUrl')}</label>
                    <input value={editData.image_url || ''}
                      onChange={e => setEditData(d => ({ ...d, image_url: e.target.value }))}
                      className="w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => sauvegarder(f.id)}
                    className="flex items-center gap-1 bg-[#1E6B4A] text-white font-bold px-4 py-2 rounded-[10px] text-sm">
                    <Check size={14} /> {t('adminFormations.enregistrer')}
                  </button>
                  <button onClick={() => setEditId(null)}
                    className="flex items-center gap-1 border border-[#E7DCCD] text-[#56627A] font-medium px-4 py-2 rounded-[10px] text-sm">
                    <X size={14} /> {t('adminFormations.annuler')}
                  </button>
                </div>
              </div>
            ) : (
              // ── View mode ──────────────────────────────────────────────
              <>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#F7F2EB] rounded-[10px] shrink-0 overflow-hidden flex items-center justify-center">
                    {f.image_url
                      ? <img src={f.image_url} alt={f.titre} className="w-full h-full object-cover" />
                      : <GraduationCap size={20} className="text-[#A8B8C8]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[#0A1D35]">{f.titre}</div>
                    <div className="text-sm text-[#56627A]">
                      {Number(f.prix).toFixed(2)} €
                      {f.duree_heures ? ` · ${f.duree_heures}h` : ''}
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${f.is_published ? 'bg-[#DCEFE4] text-[#1E6B4A]' : 'bg-[#F7DDD8] text-[#9B2C1F]'}`}>
                    {f.is_published ? t('adminFormations.publie') : t('adminFormations.brouillon')}
                  </span>
                  <button
                    onClick={() => ouvrirEtudiants(f.id, f.titre)}
                    className="text-xs font-bold bg-[#E8F0FB] text-[#1A56A4] px-2 py-0.5 rounded-full hover:bg-[#D0E7F5] transition-colors flex items-center gap-1"
                    title={t('adminFormations.voirEtudiants')}
                  >
                    <Users size={10} /> {f.achats_count ?? 0}
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(f)}
                      title={t('adminFormations.modifier')}
                      className="p-2 hover:bg-[#F7F2EB] rounded-[8px] transition-colors text-[#56627A]">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => togglePublish(f)}
                      className="text-xs border border-[#E7DCCD] px-3 py-1.5 rounded-[8px] hover:bg-[#F7F2EB] transition-colors text-[#56627A]">
                      {f.is_published ? t('adminFormations.depublier') : t('adminFormations.publier')}
                    </button>
                    <button onClick={() => toggleModulesPanel(f.id)}
                      className="text-xs border border-[#E7DCCD] px-3 py-1.5 rounded-[8px] hover:bg-[#F7F2EB] transition-colors text-[#56627A] flex items-center gap-1">
                      {modulesOpen === f.id ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      {t('adminFormations.modules')} ({f.modules_count ?? 0})
                    </button>
                    <button onClick={() => supprimer(f.id)}
                      title={t('adminFormations.supprimer')}
                      className="p-2 hover:bg-[#F7DDD8] hover:text-[#9B2C1F] rounded-[8px] transition-colors text-[#56627A]">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* ── Modules panel (inline accordion) ────────────────── */}
                {modulesOpen === f.id && (
                  <ModulesPanel
                    formationId={f.id}
                    modules={modules[f.id] || []}
                    onRefresh={() => fetchModules(f.id).then(() => fetchFormations())}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Students modal ───────────────────────────────────────────── */}
      {etudiantsModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEtudiantsModal(null)}>
          <div className="bg-white rounded-[18px] max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E7DCCD]">
              <div>
                <div className="text-xs text-[#A8B8C8] font-bold uppercase tracking-widest">{t('adminFormations.etudiants')}</div>
                <div className="font-bold text-[#0A1D35]">{etudiantsModal.titre}</div>
              </div>
              <button onClick={() => setEtudiantsModal(null)} className="p-2 hover:bg-[#F7F2EB] rounded-[8px] text-[#56627A]">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {etudiants.length === 0 ? (
                <div className="p-10 text-center">
                  <Users size={22} className="text-[#A8B8C8] mx-auto mb-2" />
                  <p className="text-sm text-[#56627A]">{t('adminFormations.aucunEtudiant')}</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[#F7F2EB] text-[11px] font-bold text-[#56627A] uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-5 py-3">{t('adminFormations.nom')}</th>
                      <th className="text-left px-5 py-3">{t('adminFormations.email')}</th>
                      <th className="text-left px-5 py-3">{t('adminFormations.achat')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {etudiants.map(e => {
                      const nom = e.client ? `${e.client.prenom || ''} ${e.client.nom || ''}`.trim() : '—';
                      return (
                        <tr key={e.id} className="border-t border-[#F7F2EB]">
                          <td className="px-5 py-3 text-[#0A1D35] font-medium">{nom || '—'}</td>
                          <td className="px-5 py-3 text-[#56627A]">{e.client_email}</td>
                          <td className="px-5 py-3 text-[#56627A]">{new Date(e.paid_at).toLocaleDateString('fr-FR')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// ─── Modules panel (inline under a formation card) ─────────────────────
function ModulesPanel({ formationId, modules, onRefresh }: {
  formationId: string;
  modules: Module[];
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const { token } = useAuth();
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [showAdd, setShowAdd] = useState(false);
  const [newModule, setNewModule] = useState({ titre: '', contenu: '', video_url: '', duree_minutes: 0, is_free: false });
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Module>>({});

  const ordered = modules.slice().sort((a, b) => a.ordre - b.ordre);

  async function ajouter() {
    if (!newModule.titre.trim()) { toast.error(t('adminFormations.titreRequis')); return; }
    try {
      const res = await fetch(`/api/admin/formations/${formationId}/modules`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          titre: newModule.titre.trim(),
          contenu: newModule.contenu.trim() || undefined,
          video_url: newModule.video_url.trim() || undefined,
          duree_minutes: newModule.duree_minutes || undefined,
          is_free: newModule.is_free,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t('adminFormations.moduleAjoute'));
      setNewModule({ titre: '', contenu: '', video_url: '', duree_minutes: 0, is_free: false });
      setShowAdd(false);
      onRefresh();
    } catch { toast.error(t('adminFormations.erreur')); }
  }

  function startEdit(m: Module) {
    setEditId(m.id);
    setEditData({ titre: m.titre, contenu: m.contenu, video_url: m.video_url, duree_minutes: m.duree_minutes, is_free: m.is_free, ordre: m.ordre });
  }

  async function sauvegarder(moduleId: string) {
    try {
      const res = await fetch(`/api/admin/formations/${formationId}/modules/${moduleId}`, {
        method: 'PATCH', headers: authHeaders, body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error();
      toast.success(t('adminFormations.moduleMaj'));
      setEditId(null);
      onRefresh();
    } catch { toast.error(t('adminFormations.erreur')); }
  }

  async function supprimer(moduleId: string) {
    if (!confirm(t('adminFormations.confirmerSuppressionModule'))) return;
    try {
      const res = await fetch(`/api/admin/formations/${formationId}/modules/${moduleId}`, {
        method: 'DELETE', headers: authHeaders,
      });
      if (!res.ok) throw new Error();
      toast.success(t('adminFormations.moduleSupprime'));
      onRefresh();
    } catch { toast.error(t('adminFormations.erreur')); }
  }

  return (
    <div className="mt-5 pt-5 border-t border-[#E7DCCD]">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-bold text-[#56627A] uppercase tracking-wider">{t('adminFormations.modules')} ({ordered.length})</div>
        <button onClick={() => setShowAdd(s => !s)}
          className="flex items-center gap-1 bg-[#0A1D35] text-white font-bold px-3 py-1.5 rounded-[8px] text-xs">
          <Plus size={12} /> {t('adminFormations.ajouterModule')}
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border-2 border-[#6CAED6] rounded-[12px] p-4 mb-3">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.moduleTitre')}</label>
              <input value={newModule.titre} autoFocus
                onChange={e => setNewModule(d => ({ ...d, titre: e.target.value }))}
                className="w-full border border-[#E7DCCD] rounded-[8px] px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.moduleContenu')}</label>
              <textarea rows={2} value={newModule.contenu}
                onChange={e => setNewModule(d => ({ ...d, contenu: e.target.value }))}
                className="w-full border border-[#E7DCCD] rounded-[8px] px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.moduleVideoUrl')}</label>
              <input value={newModule.video_url}
                onChange={e => setNewModule(d => ({ ...d, video_url: e.target.value }))}
                placeholder="https://youtube.com/watch?v=…"
                className="w-full border border-[#E7DCCD] rounded-[8px] px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-[#56627A] mb-1 block">{t('adminFormations.moduleDureeMin')}</label>
              <input type="number" value={newModule.duree_minutes}
                onChange={e => setNewModule(d => ({ ...d, duree_minutes: +e.target.value }))}
                className="w-full border border-[#E7DCCD] rounded-[8px] px-3 py-2 text-sm" />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-[#0A1D35] cursor-pointer">
                <input type="checkbox" checked={newModule.is_free}
                  onChange={e => setNewModule(d => ({ ...d, is_free: e.target.checked }))} />
                {t('adminFormations.moduleGratuit')}
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={ajouter}
              className="flex items-center gap-1 bg-[#1E6B4A] text-white font-bold px-3 py-1.5 rounded-[8px] text-xs">
              <Check size={12} /> {t('adminFormations.ajouter')}
            </button>
            <button onClick={() => setShowAdd(false)}
              className="flex items-center gap-1 border border-[#E7DCCD] text-[#56627A] font-medium px-3 py-1.5 rounded-[8px] text-xs">
              <X size={12} /> {t('adminFormations.annuler')}
            </button>
          </div>
        </div>
      )}

      {ordered.length === 0 && !showAdd && (
        <div className="bg-white border border-dashed border-[#E7DCCD] rounded-[12px] p-6 text-center">
          <BookOpen size={20} className="text-[#A8B8C8] mx-auto mb-2" />
          <p className="text-xs text-[#56627A]">{t('adminFormations.aucunModule')}</p>
        </div>
      )}

      <div className="space-y-2">
        {ordered.map((m, idx) => (
          <div key={m.id} className="bg-white border border-[#E7DCCD] rounded-[10px] p-3">
            {editId === m.id ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-[#56627A] mb-1 block">{t('adminFormations.moduleTitre')}</label>
                  <input value={editData.titre || ''}
                    onChange={e => setEditData(d => ({ ...d, titre: e.target.value }))}
                    className="w-full border border-[#E7DCCD] rounded-[6px] px-2 py-1.5 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-[#56627A] mb-1 block">{t('adminFormations.moduleContenu')}</label>
                  <textarea rows={2} value={editData.contenu || ''}
                    onChange={e => setEditData(d => ({ ...d, contenu: e.target.value }))}
                    className="w-full border border-[#E7DCCD] rounded-[6px] px-2 py-1.5 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px] font-bold text-[#56627A] mb-1 block">{t('adminFormations.moduleVideoUrl')}</label>
                  <input value={editData.video_url || ''}
                    onChange={e => setEditData(d => ({ ...d, video_url: e.target.value }))}
                    className="w-full border border-[#E7DCCD] rounded-[6px] px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#56627A] mb-1 block">{t('adminFormations.moduleOrdre')}</label>
                  <input type="number" value={editData.ordre || 0}
                    onChange={e => setEditData(d => ({ ...d, ordre: +e.target.value }))}
                    className="w-full border border-[#E7DCCD] rounded-[6px] px-2 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#56627A] mb-1 block">{t('adminFormations.moduleDureeMin')}</label>
                  <input type="number" value={editData.duree_minutes || 0}
                    onChange={e => setEditData(d => ({ ...d, duree_minutes: +e.target.value }))}
                    className="w-full border border-[#E7DCCD] rounded-[6px] px-2 py-1.5 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="inline-flex items-center gap-2 text-sm text-[#0A1D35] cursor-pointer">
                    <input type="checkbox" checked={!!editData.is_free}
                      onChange={e => setEditData(d => ({ ...d, is_free: e.target.checked }))} />
                    {t('adminFormations.moduleGratuit')}
                  </label>
                </div>
                <div className="col-span-2 flex gap-2">
                  <button onClick={() => sauvegarder(m.id)}
                    className="flex items-center gap-1 bg-[#1E6B4A] text-white font-bold px-3 py-1.5 rounded-[8px] text-xs">
                    <Check size={12} /> {t('adminFormations.enregistrer')}
                  </button>
                  <button onClick={() => setEditId(null)}
                    className="flex items-center gap-1 border border-[#E7DCCD] text-[#56627A] font-medium px-3 py-1.5 rounded-[8px] text-xs">
                    <X size={12} /> {t('adminFormations.annuler')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[#F7F2EB] border border-[#E7DCCD] text-[11px] font-bold text-[#56627A] flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#0A1D35] text-sm truncate">{m.titre}</div>
                  <div className="text-[11px] text-[#A8B8C8] mt-0.5 flex flex-wrap gap-3">
                    {m.duree_minutes != null && m.duree_minutes > 0 && <span>{m.duree_minutes} min</span>}
                    {m.video_url && <span className="truncate max-w-xs">🎥 {m.video_url}</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                  m.is_free ? 'bg-[#DCEFE4] text-[#1E6B4A]' : 'bg-[#F7F2EB] text-[#56627A]'
                }`}>
                  {m.is_free ? <><Unlock size={9} /> {t('adminFormations.gratuit')}</> : <><Lock size={9} /> {t('adminFormations.payant')}</>}
                </span>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(m)}
                    className="p-1.5 hover:bg-[#F7F2EB] rounded-[6px] text-[#56627A]">
                    <Pencil size={12} />
                  </button>
                  <button onClick={() => supprimer(m.id)}
                    className="p-1.5 hover:bg-[#F7DDD8] hover:text-[#9B2C1F] rounded-[6px] text-[#56627A]">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
