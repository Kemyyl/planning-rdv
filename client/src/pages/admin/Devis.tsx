import { useEffect, useState } from 'react';
import { FileText, Send, Users, ChevronDown, Minus, Plus, CheckCircle, RotateCcw } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';

interface Client {
  id: number;
  prenom: string;
  nom: string;
  email: string;
}

interface Prestation {
  id: number;
  nom: string;
  duree: number;
  couleur: string;
  actif: boolean;
}

export default function Devis() {
  const { token } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [clientMode, setClientMode] = useState<'existing' | 'new'>('existing');
  const [selectedClientId, setSelectedClientId] = useState<number | ''>('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [selectedPrestationId, setSelectedPrestationId] = useState<number | ''>('');
  const [nbSeances, setNbSeances] = useState(1);
  const [prixParSeance, setPrixParSeance] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [validiteJours, setValiditeJours] = useState(30);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<{ devisNum: string; email: string } | null>(null);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    fetch('/api/admin/clients', { headers })
      .then(r => r.json()).then(d => setClients(Array.isArray(d) ? d : []));
    fetch('/api/admin/prestations', { headers })
      .then(r => r.json()).then(d => setPrestations(Array.isArray(d) ? d.filter((p: Prestation) => p.actif) : []));
  }, [token]);

  const selectedClient = clients.find(c => c.id === Number(selectedClientId));
  const selectedPrestation = prestations.find(p => p.id === Number(selectedPrestationId));
  const clientPrenom = clientMode === 'existing' ? (selectedClient?.prenom || '') : prenom;
  const clientNom = clientMode === 'existing' ? (selectedClient?.nom || '') : nom;
  const clientEmail = clientMode === 'existing' ? (selectedClient?.email || '') : email;
  const total = nbSeances * (Number(prixParSeance) || 0);
  const totalStr = total % 1 === 0 ? `${total} €` : `${total.toFixed(2)} €`;
  const validiteDate = format(addDays(new Date(), validiteJours), 'd MMMM yyyy', { locale: fr });

  const canSubmit = !!(clientPrenom && clientNom && clientEmail && selectedPrestation && prixParSeance !== '' && Number(prixParSeance) >= 0 && nbSeances >= 1);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedPrestation) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/devis', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom: clientPrenom, nom: clientNom, email: clientEmail,
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
      setSent({ devisNum: data.devisNum, email: clientEmail });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
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

  const inputClass = 'w-full border border-[#E7DCCD] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] bg-white placeholder:text-[#A8B8C8] transition';
  const labelClass = 'block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-1.5';
  const cardClass = 'bg-white border border-[#E7DCCD] rounded-[20px] p-7 shadow-sm';

  if (sent) {
    return (
      <AdminLayout title="Créer un devis">
        <div className="max-w-lg mx-auto text-center py-16">
          <div className="w-16 h-16 rounded-full bg-[#DCEFE4] flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-[#1E6B4A]" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#0A1D35] mb-2">Devis envoyé !</h2>
          <p className="text-[#56627A] mb-5">
            Le devis PDF a été envoyé par email à <strong>{sent.email}</strong>.
          </p>
          <div className="inline-flex items-center gap-3 bg-[#F7F2EB] border border-[#E7DCCD] rounded-xl px-5 py-3 mb-8">
            <FileText size={16} className="text-[#56627A]" />
            <span className="text-xs text-[#56627A]">Référence :</span>
            <span className="text-sm font-bold text-[#0A1D35] font-mono">{sent.devisNum}</span>
          </div>
          <div>
            <button onClick={reset}
              className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-6 py-3 rounded-[12px] hover:bg-[#1C3352] transition-colors">
              <RotateCcw size={15} /> Créer un nouveau devis
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Créer un devis">
      <form onSubmit={submit}>
        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start max-w-5xl">

          {/* ── Left: Form ─────────────────────────────────────── */}
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
                <div>
                  <label className={labelClass}>Sélectionner un client</label>
                  <div className="relative">
                    <select value={selectedClientId}
                      onChange={e => setSelectedClientId(Number(e.target.value) || '')}
                      className={inputClass + ' appearance-none pr-10'}>
                      <option value="">— Choisir un client —</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.prenom} {c.nom} — {c.email}</option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A8B8C8] pointer-events-none" />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Prénom *</label>
                      <input value={prenom} onChange={e => setPrenom(e.target.value)}
                        placeholder="Marie" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Nom *</label>
                      <input value={nom} onChange={e => setNom(e.target.value)}
                        placeholder="Dupont" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Email *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="marie.dupont@email.com" className={inputClass} />
                  </div>
                </div>
              )}
            </div>

            {/* Prestation & Séances */}
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
                    <select value={selectedPrestationId}
                      onChange={e => setSelectedPrestationId(Number(e.target.value) || '')}
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
                      <button type="button"
                        onClick={() => setNbSeances(n => Math.max(1, n - 1))}
                        className="px-4 py-3 text-[#56627A] hover:bg-[#F7F2EB] transition-colors border-r border-[#E7DCCD]">
                        <Minus size={14} />
                      </button>
                      <span className="flex-1 text-center text-sm font-bold text-[#0A1D35]">{nbSeances}</span>
                      <button type="button"
                        onClick={() => setNbSeances(n => Math.min(100, n + 1))}
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
                        placeholder="0"
                        className={inputClass + ' pr-9'} />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#56627A] text-sm font-semibold">€</span>
                    </div>
                  </div>
                </div>

                {prixParSeance !== '' && (
                  <div className="bg-[#F7F2EB] border border-[#E7DCCD] rounded-xl px-5 py-4 flex items-center justify-between">
                    <span className="text-sm text-[#56627A]">
                      {nbSeances} séance{nbSeances > 1 ? 's' : ''} × {prixParSeance} €
                    </span>
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
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Informations complémentaires, conditions particulières, modalités de paiement…"
                    className={inputClass + ' resize-none'} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Preview ─────────────────────────────────── */}
          <div className="sticky top-6 space-y-3">
            <div className="bg-[#0A1D35] rounded-[20px] p-6 text-white">
              <p className="text-[#6CAED6] text-[11px] font-bold uppercase tracking-wide mb-5">Aperçu du devis</p>

              {/* Client */}
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

              {/* Prestation */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                {selectedPrestation ? (
                  <>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: selectedPrestation.couleur }} />
                      <span className="text-white font-semibold text-sm leading-snug">{selectedPrestation.nom}</span>
                    </div>
                    <div className="text-[#8FA3B8] text-xs">{selectedPrestation.duree} min · {nbSeances} séance{nbSeances > 1 ? 's' : ''}</div>
                  </>
                ) : (
                  <div className="text-[#56627A] text-sm italic">Aucune prestation</div>
                )}
              </div>

              {/* Total */}
              <div className="bg-[#6CAED6]/15 border border-[#6CAED6]/25 rounded-xl px-4 py-3.5 flex items-center justify-between mb-4">
                <span className="text-[#8FA3B8] text-sm">Total</span>
                <span className="text-2xl font-extrabold text-white">
                  {prixParSeance !== '' ? totalStr : '—'}
                </span>
              </div>

              {/* Validite */}
              <div className="text-[#56627A] text-[11px] mb-5">
                Valable jusqu'au {validiteDate}
              </div>

              {/* Submit */}
              <button type="submit" disabled={!canSubmit || loading}
                className="w-full flex items-center justify-center gap-2 bg-[#6CAED6] text-[#0A1D35] font-bold py-3.5 rounded-[12px] hover:opacity-90 transition-opacity disabled:opacity-30">
                {loading ? (
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-[#0A1D35] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#0A1D35] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#0A1D35] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                ) : (
                  <><Send size={15} /> Envoyer par email</>
                )}
              </button>
            </div>

            {!canSubmit && (
              <p className="text-xs text-[#A8B8C8] text-center px-2">
                Renseignez le client, la prestation et le prix pour envoyer le devis.
              </p>
            )}
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}
