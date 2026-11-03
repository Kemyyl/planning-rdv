import { useEffect, useState, useCallback } from 'react';
import { FileText, Send, Users, ChevronDown, Minus, Plus, CheckCircle, RotateCcw, Download, Mail, AlertCircle, ArrowLeft, Eye } from 'lucide-react';
import { format, addDays, isPast } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';

interface Client {
  id: string;
  prenom: string;
  nom: string;
  email: string;
}

interface Prestation {
  id: string;
  nom: string;
  duree: number;
  couleur: string;
  actif: boolean;
}

interface DevisItem {
  id: string;
  numero: string;
  client_prenom: string;
  client_nom: string;
  client_email: string;
  prestation_nom: string;
  nb_seances: number;
  total: number;
  validite_date: string;
  email_envoye: boolean;
  statut: string;
  created_at: string;
}

export default function Devis() {
  const { token } = useAuth();
  const [view, setView] = useState<'list' | 'create'>('list');

  // ── List state ───────────────────────────────────────────
  const [devisList, setDevisList] = useState<DevisItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ── Form state ───────────────────────────────────────────
  const [clients, setClients] = useState<Client[]>([]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [selectedPrestationId, setSelectedPrestationId] = useState('');
  const [nbSeances, setNbSeances] = useState(1);
  const [prixParSeance, setPrixParSeance] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [validiteJours, setValiditeJours] = useState(30);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<{ devisNum: string; email: string; emailEnvoye: boolean } | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const loadDevis = useCallback(() => {
    setListLoading(true);
    fetch('/api/admin/devis', { headers })
      .then(r => r.json())
      .then(d => setDevisList(Array.isArray(d) ? d : []))
      .finally(() => setListLoading(false));
  }, [token]);

  useEffect(() => {
    loadDevis();
    fetch('/api/admin/clients', { headers })
      .then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []));
    fetch('/api/admin/prestations', { headers })
      .then(r => r.json()).then(d => setPrestations(Array.isArray(d) ? d.filter((p: Prestation) => p.actif) : []));
  }, [token]);

  // ── Computed ─────────────────────────────────────────────
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedPrestation = prestations.find(p => p.id === selectedPrestationId);
  const clientPrenom = clientMode === 'existing' ? (selectedClient?.prenom || '') : prenom;
  const clientNom = clientMode === 'existing' ? (selectedClient?.nom || '') : nom;
  const clientEmail = clientMode === 'existing' ? (selectedClient?.email || '') : email;
  const total = nbSeances * (Number(prixParSeance) || 0);
  const totalStr = total % 1 === 0 ? `${total} €` : `${total.toFixed(2)} €`;
  const validiteDate = format(addDays(new Date(), validiteJours), 'd MMMM yyyy', { locale: fr });
  const canSubmit = !!(clientPrenom && clientNom && clientEmail && selectedPrestation && prixParSeance !== '' && Number(prixParSeance) >= 0 && nbSeances >= 1);

  // ── Actions ──────────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedPrestation) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/devis', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: clientPrenom, nom: clientNom, email: clientEmail,
          client_id: clientMode === 'existing' && selectedClientId ? Number(selectedClientId) : null,
          prestation_nom: selectedPrestation.nom,
          duree: selectedPrestation.duree,
          nb_seances: nbSeances,
          prix_par_seance: Number(prixParSeance),
          notes: notes.trim() || undefined,
          validite_jours: validiteJours,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent({ devisNum: data.devisNum, email: clientEmail, emailEnvoye: data.emailEnvoye });
      loadDevis();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSent(null);
    setSelectedClientId('');
    setPrenom(''); setNom(''); setEmail('');
    setSelectedPrestationId('');
    setNbSeances(1);
    setPrixParSeance('');
    setNotes('');
    setValiditeJours(30);
    setClientMode('existing');
  }

  async function downloadPdf(item: DevisItem) {
    setDownloadingId(item.id);
    try {
      const res = await fetch(`/api/admin/devis/${item.id}/pdf`, { headers });
      if (!res.ok) throw new Error('Erreur PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${item.numero}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setDownloadingId(null);
    }
  }

  async function resendEmail(item: DevisItem) {
    setResendingId(item.id);
    try {
      const res = await fetch(`/api/admin/devis/${item.id}/renvoyer`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Email renvoyé !');
      loadDevis();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setResendingId(null);
    }
  }

  const inputClass = 'w-full border border-[#E7DCCD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] bg-white placeholder:text-[#A8B8C8] transition';
  const labelClass = 'block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-1.5';
  const cardClass = 'bg-white border border-[#E7DCCD] rounded-[20px] p-7 shadow-sm';

  // ── Success after create ──────────────────────────────────
  if (sent) {
    return (
      <AdminLayout title="Créer un devis">
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-full bg-[#DCEFE4] flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-[#1E6B4A]" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#0A1D35] mb-2">Devis créé !</h2>
          {sent.emailEnvoye ? (
            <p className="text-[#56627A] mb-5">Le PDF a été envoyé par email à <strong>{sent.email}</strong>.</p>
          ) : (
            <p className="text-[#9B2C1F] mb-5 flex items-center justify-center gap-2">
              <AlertCircle size={15} /> Devis enregistré mais l'email n'a pas pu être envoyé.
            </p>
          )}
          <div className="inline-flex items-center gap-3 bg-[#F7F2EB] border border-[#E7DCCD] rounded-xl px-5 py-3 mb-8">
            <FileText size={16} className="text-[#56627A]" />
            <span className="text-xs text-[#56627A]">Référence :</span>
            <span className="text-sm font-bold text-[#0A1D35] font-mono">{sent.devisNum}</span>
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { resetForm(); setView('list'); }}
              className="inline-flex items-center gap-2 bg-[#F7F2EB] border border-[#E7DCCD] text-[#56627A] font-semibold px-5 py-3 rounded-[12px] hover:bg-[#E7DCCD] transition-colors">
              <Eye size={15} /> Voir les devis
            </button>
            <button onClick={resetForm}
              className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-3 rounded-[12px] hover:bg-[#1C3352] transition-colors">
              <RotateCcw size={15} /> Nouveau devis
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ── Create form ───────────────────────────────────────────
  if (view === 'create') {
    return (
      <AdminLayout title="Créer un devis">
        <div className="mb-5">
          <button onClick={() => setView('list')}
            className="inline-flex items-center gap-1.5 text-sm text-[#56627A] hover:text-[#0A1D35] transition-colors font-medium">
            <ArrowLeft size={14} /> Retour aux devis
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start max-w-5xl">

            <div className="space-y-5">
              {/* Client */}
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#F7F2EB] flex items-center justify-center">
                    <Users size={15} className="text-[#56627A]" />
                  </div>
                  <p className="font-bold text-[#0A1D35]">Client</p>
                </div>
                <div className="flex bg-[#F7F2EB] border border-[#E7DCCD] rounded-xl p-1 mb-4">
                  <button type="button" onClick={() => setClientMode('existing')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-[9px] transition-all ${clientMode === 'existing' ? 'bg-white text-[#0A1D35] shadow-sm' : 'text-[#56627A] hover:text-[#0A1D35]'}`}>
                    Client existant
                  </button>
                  <button type="button" onClick={() => setClientMode('new')}
                    className={`flex-1 py-2 text-sm font-semibold rounded-[9px] transition-all ${clientMode === 'new' ? 'bg-white text-[#0A1D35] shadow-sm' : 'text-[#56627A] hover:text-[#0A1D35]'}`}>
                    Nouveau client
                  </button>
                </div>
                {clientMode === 'existing' ? (
                  <div className="relative">
                    <label className={labelClass}>Sélectionner un client</label>
                    <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}
                      className={inputClass + ' appearance-none pr-10'}>
                      <option value="">— Choisir un client —</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.prenom} {c.nom} — {c.email}</option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="absolute right-3 bottom-3.5 text-[#A8B8C8] pointer-events-none" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Prénom *</label>
                        <input value={prenom} onChange={e => setPrenom(e.target.value)} placeholder="Marie" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Nom *</label>
                        <input value={nom} onChange={e => setNom(e.target.value)} placeholder="Dupont" className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Email *</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="marie.dupont@email.com" className={inputClass} />
                    </div>
                  </div>
                )}
              </div>

              {/* Prestation */}
              <div className={cardClass}>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-[#F7F2EB] flex items-center justify-center">
                    <FileText size={15} className="text-[#56627A]" />
                  </div>
                  <p className="font-bold text-[#0A1D35]">Prestation &amp; séances</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Prestation *</label>
                    <div className="relative">
                      <select value={selectedPrestationId} onChange={e => setSelectedPrestationId(e.target.value)}
                        className={inputClass + ' appearance-none pr-10'}>
                        <option value="">— Choisir une prestation —</option>
                        {prestations.map(p => (
                          <option key={p.id} value={p.id}>{p.nom} · {p.duree} min</option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8B8C8] pointer-events-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Nombre de séances *</label>
                      <div className="flex items-center border border-[#E7DCCD] rounded-xl overflow-hidden bg-white">
                        <button type="button" onClick={() => setNbSeances(n => Math.max(1, n - 1))}
                          className="px-4 py-3 text-[#56627A] hover:bg-[#F7F2EB] transition-colors border-r border-[#E7DCCD]">
                          <Minus size={14} />
                        </button>
                        <span className="flex-1 text-center text-sm font-bold text-[#0A1D35]">{nbSeances}</span>
                        <button type="button" onClick={() => setNbSeances(n => Math.min(100, n + 1))}
                          className="px-4 py-3 text-[#56627A] hover:bg-[#F7F2EB] transition-colors border-l border-[#E7DCCD]">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Prix par séance *</label>
                      <div className="relative">
                        <input type="number" min="0" step="0.01"
                          value={prixParSeance}
                          onChange={e => setPrixParSeance(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="0" className={inputClass + ' pr-9'} />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#56627A] text-sm font-semibold">€</span>
                      </div>
                    </div>
                  </div>
                  {prixParSeance !== '' && (
                    <div className="bg-[#F7F2EB] border border-[#E7DCCD] rounded-xl px-5 py-4 flex items-center justify-between">
                      <span className="text-sm text-[#56627A]">{nbSeances} séance{nbSeances > 1 ? 's' : ''} × {prixParSeance} €</span>
                      <span className="text-xl font-extrabold text-[#0A1D35]">{totalStr}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Conditions */}
              <div className={cardClass}>
                <p className="font-bold text-[#0A1D35] mb-5">Conditions</p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Validité du devis</label>
                    <div className="relative">
                      <select value={validiteJours} onChange={e => setValiditeJours(Number(e.target.value))}
                        className={inputClass + ' appearance-none pr-10'}>
                        <option value={15}>15 jours</option>
                        <option value={30}>30 jours</option>
                        <option value={45}>45 jours</option>
                        <option value={60}>60 jours</option>
                        <option value={90}>90 jours</option>
                      </select>
                      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8B8C8] pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Notes <span className="font-normal normal-case text-[#A8B8C8]">(optionnel)</span></label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                      placeholder="Conditions particulières, modalités de paiement…"
                      className={inputClass + ' resize-none'} />
                  </div>
                </div>
              </div>
            </div>

            {/* Preview sidebar */}
            <div className="sticky top-6 space-y-3">
              <div className="bg-[#0A1D35] rounded-[20px] p-6 text-white">
                <p className="text-[#6CAED6] text-[11px] font-bold uppercase tracking-wide mb-5">Aperçu du devis</p>
                <div className="mb-5">
                  <div className="text-[#8FA3B8] text-[11px] mb-1.5">Client</div>
                  {clientPrenom || clientEmail ? (
                    <>
                      <div className="text-white font-semibold">{clientPrenom} {clientNom}</div>
                      <div className="text-[#6CAED6] text-xs mt-0.5">{clientEmail}</div>
                    </>
                  ) : (
                    <div className="text-[#56627A] text-sm italic">Non renseigné</div>
                  )}
                </div>
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  {selectedPrestation ? (
                    <>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: selectedPrestation.couleur }} />
                        <span className="text-white font-semibold text-sm">{selectedPrestation.nom}</span>
                      </div>
                      <div className="text-[#8FA3B8] text-xs">{selectedPrestation.duree} min · {nbSeances} séance{nbSeances > 1 ? 's' : ''}</div>
                    </>
                  ) : (
                    <div className="text-[#56627A] text-sm italic">Aucune prestation</div>
                  )}
                </div>
                <div className="bg-[#6CAED6]/15 border border-[#6CAED6]/25 rounded-xl px-4 py-3.5 flex items-center justify-between mb-4">
                  <span className="text-[#8FA3B8] text-sm">Total</span>
                  <span className="text-2xl font-extrabold text-white">{prixParSeance !== '' ? totalStr : '—'}</span>
                </div>
                <div className="text-[#56627A] text-[11px] mb-5">Valable jusqu'au {validiteDate}</div>
                <button type="submit" disabled={!canSubmit || loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#6CAED6] text-[#0A1D35] font-bold py-3.5 rounded-[12px] hover:opacity-90 transition-opacity disabled:opacity-30">
                  {loading ? (
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-[#0A1D35] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#0A1D35] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#0A1D35] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : <><Send size={15} /> Envoyer par email</>}
                </button>
              </div>
              {!canSubmit && (
                <p className="text-xs text-[#A8B8C8] text-center px-2">
                  Renseignez le client, la prestation et le prix.
                </p>
              )}
            </div>
          </div>
        </form>
      </AdminLayout>
    );
  }

  // ── List view (default) ───────────────────────────────────
  return (
    <AdminLayout title="Devis">
      <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-[#56627A] text-sm">{devisList.length} devis enregistré{devisList.length > 1 ? 's' : ''}</p>
          <button onClick={() => setView('create')}
            className="flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-2.5 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors">
            <FileText size={14} /> Nouveau devis
          </button>
        </div>

        {listLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-[#E7DCCD] rounded-[16px] p-5 animate-pulse">
                <div className="flex justify-between mb-3">
                  <div className="h-4 w-40 bg-[#F7F2EB] rounded-full" />
                  <div className="h-4 w-20 bg-[#F7F2EB] rounded-full" />
                </div>
                <div className="h-3 w-64 bg-[#F7F2EB] rounded-full mb-2" />
                <div className="h-3 w-48 bg-[#F7F2EB] rounded-full" />
              </div>
            ))}
          </div>
        ) : devisList.length === 0 ? (
          <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-14 text-center">
            <div className="w-14 h-14 rounded-full bg-[#F7F2EB] flex items-center justify-center mx-auto mb-4">
              <FileText size={24} className="text-[#A8B8C8]" />
            </div>
            <p className="text-[#0A1D35] font-bold mb-1">Aucun devis pour l'instant</p>
            <p className="text-[#56627A] text-sm mb-5">Créez votre premier devis et envoyez-le par email.</p>
            <button onClick={() => setView('create')}
              className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-2.5 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors">
              <FileText size={14} /> Créer un devis
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {devisList.map(item => {
              const isExpired = isPast(new Date(item.validite_date));
              return (
                <div key={item.id} className="bg-white border border-[#E7DCCD] rounded-[16px] p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="font-bold text-[#0A1D35] font-mono text-sm">{item.numero}</span>
                        {item.email_envoye ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E6B4A] bg-[#DCEFE4] px-2 py-0.5 rounded-full">
                            <CheckCircle size={10} /> Email envoyé
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9B2C1F] bg-[#F7DDD8] px-2 py-0.5 rounded-full">
                            <AlertCircle size={10} /> Email non envoyé
                          </span>
                        )}
                        {isExpired && (
                          <span className="text-[11px] font-semibold text-[#56627A] bg-[#F7F2EB] px-2 py-0.5 rounded-full">
                            Expiré
                          </span>
                        )}
                      </div>
                      <p className="text-[#0A1D35] font-semibold text-sm">
                        {item.client_prenom} {item.client_nom}
                        <span className="text-[#56627A] font-normal"> · {item.client_email}</span>
                      </p>
                      <p className="text-[#56627A] text-xs mt-1">
                        {item.prestation_nom} · {item.nb_seances} séance{item.nb_seances > 1 ? 's' : ''}
                        {' · '}
                        <span className="font-bold text-[#0A1D35]">
                          {Number(item.total) % 1 === 0 ? item.total : Number(item.total).toFixed(2)} €
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-[#56627A] mb-3">
                        {format(new Date(item.created_at), 'd MMM yyyy', { locale: fr })}
                      </p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => downloadPdf(item)} disabled={downloadingId === item.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#56627A] border border-[#E7DCCD] bg-white px-3 py-1.5 rounded-[8px] hover:bg-[#F7F2EB] transition-colors disabled:opacity-40">
                          <Download size={12} /> {downloadingId === item.id ? '…' : 'PDF'}
                        </button>
                        <button onClick={() => resendEmail(item)} disabled={resendingId === item.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#56627A] border border-[#E7DCCD] bg-white px-3 py-1.5 rounded-[8px] hover:bg-[#F7F2EB] transition-colors disabled:opacity-40">
                          <Mail size={12} /> {resendingId === item.id ? '…' : 'Renvoyer'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
