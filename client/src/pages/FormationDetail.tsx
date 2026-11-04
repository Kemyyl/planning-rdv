import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, BookOpen, Lock, Unlock, CheckCircle, GraduationCap, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../components/Layout';
import { useClientAuth } from '../contexts/ClientAuthContext';

interface FormationModule {
  id: string;
  formation_id: string;
  titre: string;
  ordre: number;
  contenu?: string;
  video_url?: string;
  duree_minutes?: number;
  is_free: boolean;
}

interface Formation {
  id: string;
  titre: string;
  slug: string;
  description: string;
  prix: number;
  image_url?: string;
  duree_heures?: number;
  is_published: boolean;
  created_at: string;
  modules?: FormationModule[];
  nb_modules?: number;
}

interface FormationAcces {
  formation_id: string;
  paid_at: string;
}

const PLACEHOLDER_GRADIENT = 'from-[#D0E7F5] to-[#6CAED6]';

export default function FormationDetail() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { token: clientToken } = useClientAuth();

  const [formation, setFormation] = useState<Formation | null>(null);
  const [loading, setLoading] = useState(true);
  const [achetee, setAchetee] = useState(false);
  const [checkingAcces, setCheckingAcces] = useState(false);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    async function fetchFormation() {
      try {
        const res = await fetch(`/api/public/formations/${slug}`);
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        setFormation(data);
      } finally {
        setLoading(false);
      }
    }
    fetchFormation();
  }, [slug]);

  useEffect(() => {
    if (!clientToken || !formation) return;
    async function checkAcces() {
      setCheckingAcces(true);
      try {
        const res = await fetch('/api/client/formations/mes-formations', {
          headers: { Authorization: `Bearer ${clientToken}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          const found = data.find((f: FormationAcces) => f.formation_id === formation!.id);
          if (found) setAchetee(true);
        }
      } finally {
        setCheckingAcces(false);
      }
    }
    checkAcces();
  }, [clientToken, formation]);

  async function handleAchat() {
    if (!clientToken) {
      navigate('/login');
      return;
    }
    if (!formation) return;
    setBuying(true);
    try {
      const res = await fetch(`/api/client/formations/${formation.id}/checkout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientToken}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('formations.erreurPaiement'));
      window.location.href = data.url;
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('formations.erreurPaiement'));
      setBuying(false);
    }
  }

  // Loading
  if (loading) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-6 py-14 animate-pulse space-y-6">
          <div className="h-6 bg-[#E7DCCD] rounded-full w-24" />
          <div className="h-56 bg-[#E7DCCD] rounded-[20px]" />
          <div className="h-8 bg-[#E7DCCD] rounded-full w-2/3" />
          <div className="h-4 bg-[#F7F2EB] rounded-full w-full" />
          <div className="h-4 bg-[#F7F2EB] rounded-full w-5/6" />
        </div>
      </PublicLayout>
    );
  }

  // Not found
  if (!formation) {
    return (
      <PublicLayout>
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 bg-[#F7F2EB] rounded-full flex items-center justify-center mx-auto mb-5 border border-[#E7DCCD]">
            <GraduationCap size={26} className="text-[#A8B8C8]" />
          </div>
          <h1 className="text-xl font-extrabold text-[#0A1D35] mb-2">{t('formations.introuvable')}</h1>
          <p className="text-[#56627A] text-sm mb-6">{t('formations.introuvableDesc')}</p>
          <Link to="/formations" className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-2.5 rounded-[12px] hover:bg-[#1C3352] transition-colors text-sm">
            <ArrowLeft size={14} /> {t('formations.retour')}
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const modules = formation.modules ?? [];

  return (
    <PublicLayout>
      {/* Back */}
      <div className="max-w-4xl mx-auto px-6 pt-8 pb-0">
        <Link
          to="/formations"
          className="inline-flex items-center gap-1.5 text-sm text-[#56627A] hover:text-[#0A1D35] font-medium transition-colors"
        >
          <ArrowLeft size={14} /> {t('formations.retour')}
        </Link>
      </div>

      {/* Hero */}
      <section className="bg-[#F7F2EB] mt-5 py-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row gap-10 items-start">
          {/* Left */}
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-[#0A1D35] leading-tight mb-4">{formation.titre}</h1>
            <p className="text-[#56627A] text-base leading-relaxed mb-6">{formation.description}</p>

            {/* Méta */}
            <div className="flex flex-wrap gap-3 mb-8">
              {formation.duree_heures != null && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#56627A] bg-white border border-[#E7DCCD] px-3 py-1.5 rounded-full">
                  <Clock size={13} /> {t('formations.contenuDuree', { heures: formation.duree_heures })}
                </span>
              )}
              {modules.length > 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#56627A] bg-white border border-[#E7DCCD] px-3 py-1.5 rounded-full">
                  <BookOpen size={13} /> {modules.length} {modules.length > 1 ? t('formations.modulesPluriel') : t('formations.modules')}
                </span>
              )}
              {!formation.duree_heures && formation.nb_modules != null && (
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#56627A] bg-white border border-[#E7DCCD] px-3 py-1.5 rounded-full">
                  <BookOpen size={13} /> {formation.nb_modules} {formation.nb_modules > 1 ? t('formations.modulesPluriel') : t('formations.modules')}
                </span>
              )}
            </div>
          </div>

          {/* CTA Card */}
          <div className="w-full md:w-80 shrink-0">
            <div className="bg-white border border-[#E7DCCD] rounded-[20px] overflow-hidden shadow-md">
              {/* Image */}
              <div className="h-40">
                {formation.image_url ? (
                  <img src={formation.image_url} alt={formation.titre} className="w-full h-full object-cover" />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${PLACEHOLDER_GRADIENT} flex items-center justify-center`}>
                    <GraduationCap size={36} className="text-white/70" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="text-2xl font-extrabold text-[#0A1D35] mb-4">{Number(formation.prix).toFixed(2)} €</div>
                {!checkingAcces && achetee ? (
                  <Link
                    to={`/mes-formations/${formation.id}/apprendre`}
                    className="flex items-center justify-center gap-2 w-full bg-[#1E6B4A] text-white font-bold py-3 rounded-[12px] hover:bg-[#17563C] transition-colors text-sm mb-3"
                  >
                    <CheckCircle size={15} /> {t('formations.acceder')}
                  </Link>
                ) : (
                  <button
                    onClick={handleAchat}
                    disabled={buying || checkingAcces}
                    className="flex items-center justify-center gap-2 w-full bg-[#0A1D35] text-white font-bold py-3 rounded-[12px] hover:bg-[#1C3352] transition-colors text-sm mb-3 disabled:opacity-50"
                  >
                    <ShoppingCart size={15} />
                    {buying ? t('formations.redirection') : t('formations.acheter')}
                  </button>
                )}
                {!clientToken && !achetee && (
                  <p className="text-[11px] text-[#A8B8C8] text-center">
                    {t('formations.redirigeConnexion')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      {modules.length > 0 && (
        <section className="bg-white border-t border-[#E7DCCD] py-12">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-xl font-extrabold text-[#0A1D35] mb-6">{t('formations.contenu')}</h2>
            <div className="border border-[#E7DCCD] rounded-[20px] overflow-hidden">
              {modules
                .slice()
                .sort((a, b) => a.ordre - b.ordre)
                .map((module, idx, arr) => (
                  <div
                    key={module.id}
                    className={`flex items-center gap-4 px-5 py-4 ${idx < arr.length - 1 ? 'border-b border-[#F7F2EB]' : ''} hover:bg-[#FAFAFA] transition-colors`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${module.is_free ? 'bg-[#DCEFE4]' : 'bg-[#F7F2EB]'}`}>
                      {module.is_free
                        ? <Unlock size={14} className="text-[#1E6B4A]" />
                        : <Lock size={14} className="text-[#A8B8C8]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[#0A1D35] text-sm truncate">
                        <span className="text-[#A8B8C8] mr-2 font-normal text-xs">#{idx + 1}</span>
                        {module.titre}
                      </div>
                      {module.duree_minutes != null && (
                        <div className="text-xs text-[#A8B8C8] mt-0.5 flex items-center gap-1">
                          <Clock size={10} /> {module.duree_minutes} min
                        </div>
                      )}
                    </div>
                    {module.is_free && (
                      <span className="text-[11px] font-bold text-[#1E6B4A] bg-[#DCEFE4] px-2.5 py-1 rounded-full shrink-0">
                        {t('formations.apercuGratuit')}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="bg-[#0A1D35] py-12">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="text-[#6CAED6] text-xs font-bold uppercase tracking-widest mb-2">{t('formations.pretALancer')}</div>
            <h2 className="text-xl font-extrabold text-white mb-1">{formation.titre}</h2>
            <p className="text-[#8FA3B8] text-sm">{t('formations.accesImmediat')}</p>
          </div>
          {achetee ? (
            <Link
              to={`/mes-formations/${formation.id}/apprendre`}
              className="inline-flex items-center gap-2 bg-[#1E6B4A] text-white font-bold px-7 py-3.5 rounded-[14px] hover:bg-[#17563C] transition-colors whitespace-nowrap text-sm"
            >
              <CheckCircle size={15} /> {t('formations.acceder')}
            </Link>
          ) : (
            <button
              onClick={handleAchat}
              disabled={buying}
              className="inline-flex items-center gap-2 bg-white text-[#0A1D35] font-bold px-7 py-3.5 rounded-[14px] hover:bg-[#F7F2EB] transition-colors whitespace-nowrap text-sm disabled:opacity-50"
            >
              <ShoppingCart size={15} />
              {buying ? t('formations.redirection') : `${t('formations.acheterCourt')} · ${Number(formation.prix).toFixed(2)} €`}
            </button>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
