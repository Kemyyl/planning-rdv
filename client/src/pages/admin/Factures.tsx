import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Receipt, Download, Mail, Plus, Check, X, Search, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import type { Prestation, ClientAccount } from '@synego/shared';

interface Facture {
  id: string;
  numero: string;
  facture_numero: string;
  facture_date: string;
  client_prenom: string;
  client_nom: string;
  client_email: string;
  prestation_nom: string;
  nb_seances: number;
  total: number;
  email_envoye: boolean;
  statut: string;
  created_at: string;
  paid_at?: string;
}

export default function AdminFactures() {
  const { token } = useAuth();
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [factures, setFactures] = useState<Facture[]>([]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [prestationId, setPrestationId] = useState<number | null>(null);
  const [nbSeances, setNbSeances] = useState(1);
  const [prixParSeance, setPrixParSeance] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [envoyerEmail, setEnvoyerEmail] = useState(true);
  const [sending, setSending] = useState(false);

  async function reload() {
    try {
      const res = await fetch('/api/admin/factures', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setFactures(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    fetch('/api/admin/prestations', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setPrestations(Array.isArray(d) ? d : []));
    fetch('/api/admin/clients', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []));
  }, []);

  const selectedPrestation = useMemo(() => prestations.find(p => p.id === prestationId), [prestations, prestationId]);

  useEffect(() => {
    if (clientMode === 'existing' && selectedClientId) {
      const c = clients.find(x => x.id === selectedClientId);
      if (c) { setPrenom(c.prenom); setNom(c.nom); setEmail(c.email); }
    }
  }, [selectedClientId, clientMode, clients]);

  useEffect(() => {
    if (selectedPrestation?.prix) setPrixParSeance(Number(selectedPrestation.prix));
  }, [selectedPrestation]);

  function resetForm() {
    setClientMode('existing'); setSelectedClientId(null);
    setPrenom(''); setNom(''); setEmail('');
    setPrestationId(null); setNbSeances(1); setPrixParSeance(0);
    setNotes(''); setEnvoyerEmail(true);
  }

  const canSubmit = prenom.trim() && nom.trim() && email.trim() && selectedPrestation && prixParSeance > 0;

  async function creerFacture(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedPrestation) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/factures', {
        method: 'POST', headers,
        body: JSON.stringify({
          prenom, nom, email,
          client_id: clientMode === 'existing' && selectedClientId ? Number(selectedClientId) : null,
          prestation_nom: selectedPrestation.nom,
          duree: selectedPrestation.duree,
          nb_seances: nbSeances,
          prix_par_seance: Number(prixParSeance),
          notes: notes.trim() || undefined,
          envoyer_email: envoyerEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(envoyerEmail
        ? `Facture ${data.factureNum} créée et envoyée par email`
        : `Facture ${data.factureNum} créée`);
      setShowCreate(false);
      resetForm();
      reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSending(false);
    }
  }

  async function telecharger(f: Facture) {
    try {
      const res = await fetch(`/api/admin/devis/${f.id}/facture`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${f.facture_numero}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Erreur téléchargement'); }
  }

  async function renvoyer(f: Facture) {
    try {
      const res = await fetch(`/api/admin/devis/${f.id}/envoyer-facture`, { method: 'POST', headers });
      if (!res.ok) throw new Error();
      toast.success('Facture renvoyée par email');
      reload();
    } catch { toast.error('Erreur envoi'); }
  }

  const total = factures.reduce((s, f) => s + Number(f.total), 0);
  const filtered = factures.filter(f => {
    const q = search.toLowerCase();
    return !q || f.facture_numero?.toLowerCase().includes(q)
      || `${f.client_prenom} ${f.client_nom}`.toLowerCase().includes(q)
      || f.client_email.toLowerCase().includes(q)
      || f.prestation_nom.toLowerCase().includes(q);
  });

  const inputClass = 'w-full border border-[#E7DCCD] rounded-[10px] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6]';
  const labelClass = 'text-xs font-bold text-[#56627A] mb-1 block uppercase tracking-wide';

  return (
    <AdminLayout title="Factures">
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-sm text-[#56627A]">Créez et envoyez des factures directes à vos clients.</p>
          <p className="text-xs text-[#A8B8C8] mt-1">
            {factures.length} facture{factures.length > 1 ? 's' : ''} émise{factures.length > 1 ? 's' : ''} ·
            Total <span className="font-bold text-[#0A1D35]">{total.toFixed(2)} €</span>
          </p>
        </div>
        <button onClick={() => setShowCreate(s => !s)}
          className="flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-4 py-2 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors">
          <Plus size={15} /> Nouvelle facture
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={creerFacture} className="bg-[#FFFDFA] border-2 border-[#6CAED6] rounded-[18px] p-5 mb-6">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Client */}
            <div className="col-span-2">
              <div className="flex gap-2 mb-3">
                {(['existing', 'new'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setClientMode(m)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                      clientMode === m
                        ? 'bg-[#0A1D35] text-white border-[#0A1D35]'
                        : 'bg-white text-[#56627A] border-[#E7DCCD] hover:bg-[#F7F2EB]'
                    }`}>
                    {m === 'existing' ? 'Client existant' : 'Nouveau client'}
                  </button>
                ))}
              </div>
              {clientMode === 'existing' ? (
                <>
                  <label className={labelClass}>Sélectionner un client</label>
                  <select value={selectedClientId ?? ''} onChange={e => setSelectedClientId(e.target.value ? +e.target.value : null)} className={inputClass}>
                    <option value="">— Choisir un client —</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.prenom} {c.nom} · {c.email}</option>
                    ))}
                  </select>
                </>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Prénom *</label>
                    <input value={prenom} onChange={e => setPrenom(e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Nom *</label>
                    <input value={nom} onChange={e => setNom(e.target.value)} className={inputClass} required />
                  </div>
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} required />
                  </div>
                </div>
              )}
            </div>

            {/* Prestation */}
            <div>
              <label className={labelClass}>Prestation *</label>
              <select value={prestationId ?? ''} onChange={e => setPrestationId(e.target.value ? +e.target.value : null)} className={inputClass} required>
                <option value="">— Choisir —</option>
                {prestations.map(p => (
                  <option key={p.id} value={p.id}>{p.nom} · {p.duree} min</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Nombre de séances *</label>
              <input type="number" min={1} value={nbSeances} onChange={e => setNbSeances(+e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Prix par séance *</label>
              <input type="number" min={0} step="0.01" value={prixParSeance} onChange={e => setPrixParSeance(+e.target.value)} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Total</label>
              <div className="h-[38px] flex items-center font-bold text-[#0A1D35] text-lg">
                {(nbSeances * prixParSeance).toFixed(2)} €
              </div>
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Notes (optionnel)</label>
              <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} className={inputClass} placeholder="Modalités de paiement, référence…" />
            </div>
            <div className="col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-[#0A1D35] cursor-pointer">
                <input type="checkbox" checked={envoyerEmail} onChange={e => setEnvoyerEmail(e.target.checked)} />
                Envoyer la facture par email au client dès création
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={sending || !canSubmit}
              className="flex items-center gap-1.5 bg-[#1E6B4A] text-white font-bold px-5 py-2.5 rounded-[10px] text-sm disabled:opacity-40">
              <Send size={14} /> {sending ? 'Création…' : (envoyerEmail ? 'Créer & envoyer' : 'Créer')}
            </button>
            <button type="button" onClick={() => { setShowCreate(false); resetForm(); }}
              className="flex items-center gap-1 border border-[#E7DCCD] text-[#56627A] font-medium px-4 py-2.5 rounded-[10px] text-sm">
              <X size={14} /> Annuler
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      {factures.length > 0 && (
        <div className="relative mb-4 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#A8B8C8]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par numéro, nom, email, prestation…"
            className="w-full pl-9 pr-4 py-2 bg-white border border-[#E7DCCD] rounded-[10px] text-sm" />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-sm text-[#56627A]">Chargement…</div>
      ) : factures.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E7DCCD] rounded-[20px] p-12 text-center">
          <Receipt size={28} className="text-[#A8B8C8] mx-auto mb-3" />
          <p className="font-semibold text-[#0A1D35] mb-1">Aucune facture pour l'instant</p>
          <p className="text-sm text-[#56627A]">Créez votre première facture avec le bouton ci-dessus.</p>
        </div>
      ) : (
        <div className="bg-[#FFFDFA] border border-[#E7DCCD] rounded-[18px] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F2EB] text-[11px] font-bold text-[#56627A] uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">N° facture</th>
                <th className="text-left px-5 py-3">Client</th>
                <th className="text-left px-5 py-3">Prestation</th>
                <th className="text-right px-5 py-3">Total</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="border-t border-[#F7F2EB] hover:bg-white">
                  <td className="px-5 py-3 font-semibold text-[#0A1D35]">{f.facture_numero}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-[#0A1D35]">{f.client_prenom} {f.client_nom}</div>
                    <div className="text-xs text-[#56627A]">{f.client_email}</div>
                  </td>
                  <td className="px-5 py-3 text-[#56627A]">
                    {f.prestation_nom}
                    {f.nb_seances > 1 && <span className="text-xs"> · ×{f.nb_seances}</span>}
                  </td>
                  <td className="px-5 py-3 text-right font-bold text-[#0A1D35]">{Number(f.total).toFixed(2)} €</td>
                  <td className="px-5 py-3 text-[#56627A]">
                    {f.facture_date && format(new Date(f.facture_date), 'd MMM yyyy', { locale: fr })}
                  </td>
                  <td className="px-5 py-3">
                    {f.email_envoye
                      ? <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#DCEFE4] text-[#1E6B4A] px-2 py-0.5 rounded-full"><Check size={10} /> Envoyé</span>
                      : <span className="text-[11px] text-[#A8B8C8]">Non envoyé</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button onClick={() => telecharger(f)} title="Télécharger PDF"
                        className="p-1.5 hover:bg-[#F7F2EB] rounded-[7px] text-[#56627A]">
                        <Download size={14} />
                      </button>
                      <button onClick={() => renvoyer(f)} title="Renvoyer par email"
                        className="p-1.5 hover:bg-[#F7F2EB] rounded-[7px] text-[#56627A]">
                        <Mail size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
