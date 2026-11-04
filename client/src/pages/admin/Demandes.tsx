import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useDateLocale } from '../../hooks/useDateLocale';
import { Inbox, Mail, FileText, CheckCircle, Eye, Clock, Phone, MessageSquare, Tag, RotateCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Demande {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  type_accompagnement?: string;
  message: string;
  statut: 'nouveau' | 'vu' | 'traite';
  created_at: string;
}

export default function Demandes() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState<Demande[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  async function fetchData() {
    if (!token) return;
    setSyncing(true);
    try {
      const r = await fetch('/api/admin/demandes', { headers });
      const d = await r.json();
      setDemandes(Array.isArray(d) ? d : []);
      setLastSync(new Date());
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  async function updateStatut(id: string, statut: Demande['statut']) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/demandes/${id}/statut`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut }),
      });
      if (!res.ok) throw new Error();
      setDemandes(prev => prev.map(d => d.id === id ? { ...d, statut } : d));
    } catch {
      toast.error(t('common.erreur'));
    } finally {
      setUpdating(null);
    }
  }

  function creerDevis(d: Demande) {
    const params = new URLSearchParams({
      prenom: d.prenom,
      nom: d.nom,
      email: d.email,
      ...(d.telephone ? { telephone: d.telephone } : {}),
    });
    navigate(`/admin/devis?${params.toString()}`);
  }

  const statutConfig = {
    nouveau: { bg: 'bg-[#E8F0FB]', text: 'text-[#1A56A4]', label: t('demandes.nouveau'), icon: Clock },
    vu:      { bg: 'bg-[#F6E7C8]', text: 'text-[#8A5A12]', label: t('demandes.vu'), icon: Eye },
    traite:  { bg: 'bg-[#DCEFE4]', text: 'text-[#1E6B4A]', label: t('demandes.traite'), icon: CheckCircle },
  };

  const selectedDemande = demandes.find(d => d.id === selected) ?? null;
  const nouveaux = demandes.filter(d => d.statut === 'nouveau').length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-[#0A1D35]">{t('demandes.titre')}</h1>
          {nouveaux > 0 && (
            <span className="bg-[#1A56A4] text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
              {nouveaux}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {lastSync && (
            <span className="text-[10px] text-[#A0A9B8]">
              Mis à jour à {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={fetchData}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-semibold border border-[#E7DCCD] text-[#56627A] px-3 py-1.5 rounded-[10px] hover:bg-[#F7F2EB] transition-colors disabled:opacity-50"
          >
            <RotateCw size={13} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sync...' : 'Synchroniser'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-[#E7DCCD] rounded-[16px] p-5 animate-pulse h-20" />
          ))}
        </div>
      )}

      {!loading && demandes.length === 0 && (
        <div className="bg-white border border-dashed border-[#D9C9B4] rounded-[20px] p-16 text-center">
          <Inbox size={32} className="text-[#A8B8C8] mx-auto mb-3" />
          <p className="text-[#56627A] font-medium">{t('demandes.aucune')}</p>
        </div>
      )}

      {!loading && demandes.length > 0 && (
        <div className="grid md:grid-cols-[320px_1fr] gap-5 items-start">

          {/* List */}
          <div className="space-y-2">
            {demandes.map(d => {
              const { bg, text, label, icon: Icon } = statutConfig[d.statut];
              const isActive = selected === d.id;
              return (
                <button key={d.id} onClick={() => {
                  setSelected(d.id);
                  if (d.statut === 'nouveau') updateStatut(d.id, 'vu');
                }}
                  className={`w-full text-left bg-white border rounded-[14px] p-4 transition-all ${
                    isActive ? 'border-[#0A1D35] shadow-md' : 'border-[#E7DCCD] hover:border-[#A8B8C8]'
                  }`}>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="font-semibold text-[#0A1D35] text-sm truncate">{d.prenom} {d.nom}</div>
                    <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${bg} ${text}`}>
                      <Icon size={10} /> {label}
                    </span>
                  </div>
                  <div className="text-xs text-[#56627A] truncate mb-1">{d.email}</div>
                  <div className="text-xs text-[#A8B8C8] flex items-center justify-between">
                    <span className="truncate max-w-[180px] italic text-[#56627A]">{d.message.slice(0, 60)}{d.message.length > 60 ? '…' : ''}</span>
                    <span translate="no">{format(new Date(d.created_at), 'd MMM', { locale: dateLocale })}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail */}
          {selectedDemande ? (
            <div className="bg-white border border-[#E7DCCD] rounded-[20px] p-7 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-extrabold text-[#0A1D35]">{selectedDemande.prenom} {selectedDemande.nom}</h2>
                  <p className="text-sm text-[#56627A] mt-0.5">{selectedDemande.email}</p>
                </div>
                <div className="shrink-0 text-xs text-[#A8B8C8]" translate="no">
                  {format(new Date(selectedDemande.created_at), 'd MMM yyyy · HH:mm', { locale: dateLocale })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                {selectedDemande.telephone && (
                  <div className="bg-[#F7F2EB] rounded-[12px] p-3">
                    <div className="flex items-center gap-1.5 text-xs text-[#56627A] font-bold uppercase tracking-wide mb-1">
                      <Phone size={11} /> {t('demandes.telephone')}
                    </div>
                    <p className="text-sm font-semibold text-[#0A1D35]">{selectedDemande.telephone}</p>
                  </div>
                )}
                {selectedDemande.type_accompagnement && (
                  <div className="bg-[#F7F2EB] rounded-[12px] p-3">
                    <div className="flex items-center gap-1.5 text-xs text-[#56627A] font-bold uppercase tracking-wide mb-1">
                      <Tag size={11} /> {t('demandes.type')}
                    </div>
                    <p className="text-sm font-semibold text-[#0A1D35]">{selectedDemande.type_accompagnement}</p>
                  </div>
                )}
              </div>

              <div className="bg-[#F7F2EB] rounded-[12px] p-4 mb-6">
                <div className="flex items-center gap-1.5 text-xs text-[#56627A] font-bold uppercase tracking-wide mb-2">
                  <MessageSquare size={11} /> {t('demandes.message')}
                </div>
                <p className="text-sm text-[#0A1D35] whitespace-pre-wrap leading-relaxed">{selectedDemande.message}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <a href={`mailto:${selectedDemande.email}?subject=Re: Demande de devis — ${selectedDemande.prenom} ${selectedDemande.nom}`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#0A1D35] px-4 py-2.5 rounded-[10px] hover:bg-[#1C3352] transition-colors">
                  <Mail size={14} /> {t('demandes.repondre')}
                </a>
                <button onClick={() => creerDevis(selectedDemande)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1E6B4A] border border-[#DCEFE4] bg-white px-4 py-2.5 rounded-[10px] hover:bg-[#DCEFE4] transition-colors">
                  <FileText size={14} /> {t('demandes.creerDevis')}
                </button>
                {selectedDemande.statut !== 'traite' && (
                  <button
                    onClick={() => updateStatut(selectedDemande.id, 'traite')}
                    disabled={updating === selectedDemande.id}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#56627A] border border-[#E7DCCD] bg-white px-4 py-2.5 rounded-[10px] hover:bg-[#F7F2EB] transition-colors disabled:opacity-40">
                    <CheckCircle size={14} /> {t('demandes.marquerTraite')}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-dashed border-[#D9C9B4] rounded-[20px] p-14 flex flex-col items-center justify-center text-center">
              <MessageSquare size={28} className="text-[#A8B8C8] mb-3" />
              <p className="text-sm text-[#56627A]">Sélectionnez une demande pour voir le détail.</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
