import { useEffect, useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useDateLocale } from '../hooks/useDateLocale';
import { Download, CheckCircle, RotateCw, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { PatientLayout } from '../components/Layout';
import { useClientAuth } from '../contexts/ClientAuthContext';

interface DevisClientItem {
  id: string;
  numero: string;
  prestation_nom: string;
  nb_seances: number;
  total: number;
  statut: 'envoye' | 'accepte' | 'refuse' | 'expire' | 'paye';
  email_envoye: boolean;
  validite_date: string;
  created_at: string;
  facture_numero?: string;
  facture_date?: string;
  prix_par_seance: number;
}

export default function MesDevis() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const [params] = useSearchParams();
  const { token: clientToken, prenom } = useClientAuth();

  useEffect(() => {
    const payment = params.get('payment');
    if (payment === 'success') toast.success(t('mesRdv.paiementOk'));
    else if (payment === 'cancel') toast(t('mesRdv.paiementAnnule'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [devisList, setDevisList] = useState<DevisClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingDevisId, setAcceptingDevisId] = useState<string | null>(null);
  const [downloadingFactureId, setDownloadingFactureId] = useState<string | null>(null);
  const [payingDevisId, setPayingDevisId] = useState<string | null>(null);
  const [downloadingDevisId, setDownloadingDevisId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  async function fetchDevis() {
    if (!clientToken) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/client/devis', { headers: { Authorization: `Bearer ${clientToken}` } });
      const data = await res.json();
      setDevisList(Array.isArray(data) ? data : []);
      setLastSync(new Date());
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }

  useEffect(() => { fetchDevis(); }, [clientToken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function accepterDevis(id: string) {
    if (!clientToken) return;
    setAcceptingDevisId(id);
    try {
      const res = await fetch(`/api/client/devis/${id}/accepter`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(t('mesRdv.devisAccepteOk'));
      fetchDevis();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('mesRdv.erreurAcceptDevis'));
    } finally {
      setAcceptingDevisId(null);
    }
  }

  async function downloadFactureClient(item: DevisClientItem) {
    if (!clientToken) return;
    setDownloadingFactureId(item.id);
    try {
      const res = await fetch(`/api/client/devis/${item.id}/facture`, { headers: { Authorization: `Bearer ${clientToken}` } });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${item.facture_numero ?? item.numero}-facture.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('mesRdv.erreurPdf'));
    } finally {
      setDownloadingFactureId(null);
    }
  }

  async function payDevis(id: string) {
    if (!clientToken) return;
    setPayingDevisId(id);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ devis_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('mesRdv.erreurPaiement'));
      setPayingDevisId(null);
    }
  }

  async function downloadDevisPdf(item: DevisClientItem) {
    if (!clientToken) return;
    setDownloadingDevisId(item.id);
    try {
      const res = await fetch(`/api/client/devis/${item.id}/devis-pdf`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      if (!res.ok) throw new Error('Erreur');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${item.numero}-devis.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('mesRdv.erreurPdf'));
    } finally {
      setDownloadingDevisId(null);
    }
  }

  if (!clientToken && !loading) return <Navigate to="/login" replace />;

  return (
    <PatientLayout title={t('nav.mesDevis')}>
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-extrabold text-[#0A1D35]">{t('nav.mesDevis')}</h2>
          <div className="flex items-center gap-2">
            {lastSync && (
              <span className="text-[10px] text-[#A0A9B8]">
                {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={fetchDevis}
              disabled={syncing}
              className="flex items-center gap-1.5 text-xs font-semibold border border-[#E7DCCD] text-[#56627A] px-3 py-1.5 rounded-[10px] hover:bg-[#F7F2EB] transition-colors disabled:opacity-50"
            >
              <RotateCw size={13} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Sync...' : 'Synchroniser'}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-[#E7DCCD] rounded-[16px] p-5 animate-pulse h-24" />
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && devisList.length === 0 && (
          <div className="bg-white border border-dashed border-[#D9C9B4] rounded-[20px] p-14 text-center">
            <div className="w-12 h-12 bg-[#F7F2EB] rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={20} className="text-[#A8B8C8]" />
            </div>
            <p className="font-semibold text-[#0A1D35] mb-1">{t('mesRdv.aucunDevis')}</p>
          </div>
        )}

        {/* List */}
        {!loading && devisList.length > 0 && (
          <div className="space-y-3">
            {devisList.map(item => {
              const statutConfig: Record<DevisClientItem['statut'], { bg: string; text: string; label: string }> = {
                envoye:  { bg: 'bg-[#E8F0FB]', text: 'text-[#1A56A4]', label: t('mesRdv.devisEnvoye') },
                accepte: { bg: 'bg-[#DCEFE4]', text: 'text-[#1E6B4A]', label: t('mesRdv.devisAccepte') },
                refuse:  { bg: 'bg-[#F7DDD8]', text: 'text-[#9B2C1F]', label: t('mesRdv.devisRefuse') },
                expire:  { bg: 'bg-[#F7F2EB]', text: 'text-[#56627A]', label: t('mesRdv.devisExpire') },
                paye:    { bg: 'bg-[#DCEFE4]', text: 'text-[#1E6B4A]', label: t('mesRdv.devisPaye') },
              };
              const { bg, text, label } = statutConfig[item.statut];
              return (
                <div key={item.id} className="bg-white border border-[#E7DCCD] rounded-[16px] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-[#56627A] bg-[#F7F2EB] px-2.5 py-1 rounded-full font-mono">
                          {item.facture_numero ?? item.numero}
                        </span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${bg} ${text}`}>
                          {label}
                        </span>
                      </div>
                      <div className="font-semibold text-[#0A1D35] text-sm leading-snug mb-1">
                        {item.prestation_nom}
                      </div>
                      <div className="text-xs text-[#56627A] space-y-0.5">
                        <div>
                          {item.nb_seances} {item.nb_seances > 1 ? t('mesRdv.seancePluriels') : t('mesRdv.seance').toLowerCase()} &middot; {Number(item.prix_par_seance).toFixed(2)} € {t('mesRdv.parSeance')}
                        </div>
                        <div className="font-bold text-[#0A1D35]">
                          {t('mesRdv.total')} {Number(item.total).toFixed(2)} €
                        </div>
                        <div>
                          {item.facture_date
                            ? `${t('mesRdv.factureDate')} ${format(new Date(item.facture_date), 'd MMM yyyy', { locale: dateLocale })}`
                            : `${t('mesRdv.creeLe')} ${format(new Date(item.created_at), 'd MMM yyyy', { locale: dateLocale })}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {item.statut === 'envoye' && (
                        <button
                          onClick={() => accepterDevis(item.id)}
                          disabled={acceptingDevisId === item.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E6B4A] border border-[#DCEFE4] bg-white px-3 py-1.5 rounded-[8px] hover:bg-[#DCEFE4] transition-colors disabled:opacity-40">
                          <CheckCircle size={12} /> {acceptingDevisId === item.id ? '…' : t('mesRdv.accepterDevis')}
                        </button>
                      )}
                      {item.statut === 'accepte' && (
                        <button
                          onClick={() => payDevis(item.id)}
                          disabled={payingDevisId === item.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#1E6B4A] border border-[#1E6B4A] px-3 py-1.5 rounded-[8px] hover:bg-[#17563C] transition-colors disabled:opacity-40">
                          <CheckCircle size={12} /> {payingDevisId === item.id ? '…' : t('mesRdv.payerDevis')}
                        </button>
                      )}
                      {item.statut === 'paye' && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E6B4A] bg-[#DCEFE4] px-3 py-1.5 rounded-[8px]">
                          <CheckCircle size={12} /> {t('mesRdv.devisPaye')}
                        </span>
                      )}
                      {item.statut === 'paye' && item.facture_numero && (
                        <button
                          onClick={() => downloadFactureClient(item)}
                          disabled={downloadingFactureId === item.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A56A4] border border-[#E8F0FB] bg-white px-3 py-1.5 rounded-[8px] hover:bg-[#E8F0FB] transition-colors disabled:opacity-40">
                          <Download size={12} /> {downloadingFactureId === item.id ? '…' : t('mesRdv.telechargerFacture')}
                        </button>
                      )}
                      {(item.statut === 'envoye' || item.statut === 'accepte' || item.statut === 'paye') && (
                        <button
                          onClick={() => downloadDevisPdf(item)}
                          disabled={downloadingDevisId === item.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#56627A] border border-[#E7DCCD] bg-white px-3 py-1.5 rounded-[8px] hover:bg-[#F7F2EB] transition-colors disabled:opacity-40">
                          <Download size={12} /> {downloadingDevisId === item.id ? '…' : t('mesRdv.telechargerDevis')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
