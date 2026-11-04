import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Clock, BookOpen, ArrowRight, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { PatientLayout } from '../components/Layout';
import { useClientAuth } from '../contexts/ClientAuthContext';

interface Formation {
  id: string;
  titre: string;
  slug: string;
  description: string;
  prix: number;
  image_url?: string;
  duree_heures?: number;
}

interface Achat {
  formation_id: string;
  paid_at: string;
  progres_count: number;
  formation: Formation;
}

const PLACEHOLDER_GRADIENTS = [
  'from-[#D0E7F5] to-[#6CAED6]',
  'from-[#DCEFE4] to-[#6CAED6]',
  'from-[#F6E7C8] to-[#E7DCCD]',
  'from-[#E9D8F5] to-[#D0E7F5]',
];

export default function MesFormations() {
  const { t } = useTranslation();
  const { token } = useClientAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [achats, setAchats] = useState<Achat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }

    const paiement = searchParams.get('payment');
    if (paiement === 'success') toast.success(t('formations.paiementSucces'));
    if (paiement === 'cancel') toast.error(t('formations.paiementAnnule'));

    async function fetchAchats() {
      try {
        const res = await fetch('/api/client/formations/mes-formations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) setAchats(data);
      } finally {
        setLoading(false);
      }
    }
    fetchAchats();
  }, [token, navigate, searchParams]);

  return (
    <PatientLayout title={t('formations.mesFormations')}>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map(i => (
            <div key={i} className="bg-white border border-[#E7DCCD] rounded-[20px] overflow-hidden animate-pulse">
              <div className="h-40 bg-[#E7DCCD]" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-[#E7DCCD] rounded-full w-3/4" />
                <div className="h-3 bg-[#F7F2EB] rounded-full w-full" />
                <div className="h-3 bg-[#F7F2EB] rounded-full w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : achats.length === 0 ? (
        <div className="bg-white border border-dashed border-[#E7DCCD] rounded-[20px] p-16 text-center">
          <div className="w-14 h-14 bg-[#F7F2EB] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#E7DCCD]">
            <GraduationCap size={22} className="text-[#A8B8C8]" />
          </div>
          <p className="font-semibold text-[#0A1D35] mb-1">{t('formations.aucuneAchetee')}</p>
          <p className="text-sm text-[#56627A] mb-5">{t('formations.decouvrezCatalogue')}</p>
          <Link
            to="/formations"
            className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-2.5 rounded-[12px] hover:bg-[#1C3352] transition-colors text-sm"
          >
            <GraduationCap size={14} /> {t('formations.voirCatalogue')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {achats.map((achat, idx) => {
            const f = achat.formation;
            const gradient = PLACEHOLDER_GRADIENTS[idx % PLACEHOLDER_GRADIENTS.length];
            return (
              <div key={achat.formation_id} className="bg-white border border-[#E7DCCD] rounded-[20px] overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="h-40 relative">
                  {f.image_url ? (
                    <img src={f.image_url} alt={f.titre} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                      <GraduationCap size={38} className="text-white/70" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 bg-[#DCEFE4] text-[#1E6B4A] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      <CheckCircle size={11} /> {t('formations.accesComplet')}
                    </span>
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-[#0A1D35] text-base mb-2">{f.titre}</h3>
                  <p className="text-xs text-[#56627A] leading-relaxed mb-3 flex-1 line-clamp-2">{f.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {f.duree_heures != null && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#56627A] bg-[#F7F2EB] px-2.5 py-1 rounded-full">
                        <Clock size={11} /> {f.duree_heures}{t('formations.heures')}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#56627A] bg-[#F7F2EB] px-2.5 py-1 rounded-full">
                      <BookOpen size={11} /> {achat.progres_count} {achat.progres_count > 1 ? t('formations.modulesPluriel') : t('formations.modules')} {achat.progres_count > 1 ? t('formations.modulesTerminesPluriel') : t('formations.modulesTermines')}
                    </span>
                  </div>
                  <Link
                    to={`/mes-formations/${achat.formation_id}/apprendre`}
                    className="inline-flex items-center justify-center gap-1.5 bg-[#0A1D35] text-white text-xs font-bold px-4 py-2.5 rounded-[10px] hover:bg-[#1C3352] transition-colors"
                  >
                    {t('formations.continuer')} <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PatientLayout>
  );
}
