import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Receipt, Download, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useDateLocale } from '../hooks/useDateLocale';
import { PatientLayout } from '../components/Layout';
import { useClientAuth } from '../contexts/ClientAuthContext';

interface Facture {
  id: string;
  numero: string;
  facture_numero: string;
  facture_date: string;
  prestation_nom: string;
  nb_seances: number;
  prix_par_seance: number;
  total: number;
  statut: string;
  paid_at?: string;
  created_at: string;
}

export default function MesFactures() {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { token } = useClientAuth();
  const navigate = useNavigate();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    fetch('/api/client/factures', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setFactures(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  async function telecharger(f: Facture) {
    if (!token) return;
    try {
      const res = await fetch(`/api/client/devis/${f.id}/facture`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${f.facture_numero}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error(t('mesFactures.erreurTelechargement')); }
  }

  const total = factures.reduce((s, f) => s + Number(f.total), 0);

  return (
    <PatientLayout title={t('mesFactures.titre')}>
      {/* Summary */}
      {!loading && factures.length > 0 && (
        <div className="bg-white border border-[#E7DCCD] rounded-[18px] p-5 mb-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-[#56627A] uppercase tracking-widest mb-1">{t('mesFactures.resume')}</div>
            <div className="text-2xl font-extrabold text-[#0A1D35]">{factures.length} {factures.length > 1 ? t('mesFactures.factures') : t('mesFactures.facture')}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-[#56627A] uppercase tracking-widest mb-1">{t('mesFactures.total')}</div>
            <div className="text-2xl font-extrabold text-[#1E6B4A]">{total.toFixed(2)} €</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white border border-[#E7DCCD] rounded-[18px] p-5 animate-pulse">
              <div className="h-4 bg-[#E7DCCD] rounded-full w-1/3 mb-2" />
              <div className="h-3 bg-[#F7F2EB] rounded-full w-1/2" />
            </div>
          ))}
        </div>
      ) : factures.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E7DCCD] rounded-[20px] p-12 text-center">
          <Receipt size={28} className="text-[#A8B8C8] mx-auto mb-3" />
          <p className="font-semibold text-[#0A1D35] mb-1">{t('mesFactures.aucune')}</p>
          <p className="text-sm text-[#56627A]">{t('mesFactures.aucuneDesc')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {factures.map(f => (
            <div key={f.id} className="bg-white border border-[#E7DCCD] rounded-[18px] p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="w-12 h-12 bg-[#DCEFE4] rounded-[12px] flex items-center justify-center shrink-0">
                <Receipt size={20} className="text-[#1E6B4A]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-[#0A1D35]">{f.facture_numero}</span>
                  <span className="text-[11px] font-bold bg-[#DCEFE4] text-[#1E6B4A] px-2 py-0.5 rounded-full">
                    {t('mesFactures.payee')}
                  </span>
                </div>
                <div className="text-sm text-[#56627A]">{f.prestation_nom}</div>
                <div className="text-xs text-[#A8B8C8] mt-1 flex items-center gap-3 flex-wrap">
                  {f.facture_date && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} /> {format(new Date(f.facture_date), 'd MMMM yyyy', { locale: dateLocale })}
                    </span>
                  )}
                  {f.nb_seances > 1 && <span>×{f.nb_seances}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-bold text-[#0A1D35] text-lg mb-1">{Number(f.total).toFixed(2)} €</div>
                <button onClick={() => telecharger(f)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold bg-[#0A1D35] text-white px-3 py-1.5 rounded-[10px] hover:bg-[#1C3352] transition-colors">
                  <Download size={12} /> {t('mesFactures.telecharger')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PatientLayout>
  );
}
