import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Clock, BookOpen, ArrowRight, GraduationCap, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../components/Layout';
import { useClientAuth } from '../contexts/ClientAuthContext';

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
  nb_modules?: number;
}

interface FormationAchetee {
  formation_id: string;
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E7DCCD] rounded-[20px] overflow-hidden animate-pulse">
      <div className="h-44 bg-[#E7DCCD]" />
      <div className="p-5 space-y-3">
        <div className="h-4 bg-[#E7DCCD] rounded-full w-3/4" />
        <div className="h-3 bg-[#F7F2EB] rounded-full w-full" />
        <div className="h-3 bg-[#F7F2EB] rounded-full w-5/6" />
        <div className="flex gap-2 pt-1">
          <div className="h-5 bg-[#F7F2EB] rounded-full w-20" />
          <div className="h-5 bg-[#F7F2EB] rounded-full w-20" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="h-5 bg-[#E7DCCD] rounded-full w-16" />
          <div className="h-8 bg-[#E7DCCD] rounded-[10px] w-32" />
        </div>
      </div>
    </div>
  );
}

const PLACEHOLDER_GRADIENTS = [
  'from-[#D0E7F5] to-[#6CAED6]',
  'from-[#DCEFE4] to-[#6CAED6]',
  'from-[#F6E7C8] to-[#E7DCCD]',
  'from-[#E9D8F5] to-[#D0E7F5]',
  'from-[#F7DDD8] to-[#F6E7C8]',
];

export default function Formations() {
  const { t } = useTranslation();
  const { token: clientToken } = useClientAuth();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [formationsAchetees, setFormationsAchetees] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchFormations() {
      try {
        const res = await fetch('/api/public/formations');
        const data = await res.json();
        setFormations(Array.isArray(data) ? data : []);
      } finally {
        setLoading(false);
      }
    }
    fetchFormations();
  }, []);

  useEffect(() => {
    if (!clientToken) return;
    async function fetchAchats() {
      try {
        const res = await fetch('/api/client/formations/mes-formations', {
          headers: { Authorization: `Bearer ${clientToken}` },
        });
        const data = await res.json();
        if (Array.isArray(data)) {
          setFormationsAchetees(data.map((f: FormationAchetee) => f.formation_id));
        }
      } catch {
        // silent — not critical
      }
    }
    fetchAchats();
  }, [clientToken]);

  const filtered = formations.filter(f =>
    f.titre.toLowerCase().includes(search.toLowerCase()) ||
    f.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PublicLayout>
      {/* Header */}
      <section className="bg-[#F7F2EB] pt-14 pb-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 bg-[#D0E7F5] text-[#0A5A8A] text-xs font-bold px-3 py-1.5 rounded-full mb-5">
            <GraduationCap size={12} />
            {t('formations.catalogueBadge')}
          </div>
          <h1 className="text-4xl font-extrabold text-[#0A1D35] mb-3">{t('formations.titre')}</h1>
          <p className="text-[#56627A] text-base max-w-xl mb-8">
            {t('formations.description')}
          </p>
          {/* Search */}
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A8B8C8]" />
            <input
              type="text"
              placeholder={t('formations.rechercher')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-[#E7DCCD] rounded-[12px] text-sm text-[#0A1D35] placeholder-[#A8B8C8] focus:outline-none focus:border-[#6CAED6] transition-colors"
            />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="bg-white py-12">
        <div className="max-w-6xl mx-auto px-6">
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="bg-[#F7F2EB] border border-dashed border-[#D9C9B4] rounded-[20px] p-16 text-center">
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-[#E7DCCD]">
                <GraduationCap size={22} className="text-[#A8B8C8]" />
              </div>
              <p className="font-semibold text-[#0A1D35] mb-1">
                {search ? t('formations.aucuneTrouvee') : t('formations.aucuneDispo')}
              </p>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="mt-3 text-sm text-[#6CAED6] font-medium hover:underline"
                >
                  {t('formations.effacerRecherche')}
                </button>
              )}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filtered.map((formation, idx) => {
                const achete = formationsAchetees.includes(formation.id);
                const gradient = PLACEHOLDER_GRADIENTS[idx % PLACEHOLDER_GRADIENTS.length];
                const descTruncated = formation.description.length > 100
                  ? formation.description.slice(0, 100) + '…'
                  : formation.description;
                return (
                  <div key={formation.id} className="bg-white border border-[#E7DCCD] rounded-[20px] overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                    {/* Image */}
                    <div className="h-44 relative overflow-hidden">
                      {formation.image_url ? (
                        <img
                          src={formation.image_url}
                          alt={formation.titre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                          <GraduationCap size={40} className="text-white/70" />
                        </div>
                      )}
                      {achete && (
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center gap-1 bg-[#DCEFE4] text-[#1E6B4A] text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                            <CheckCircle size={11} /> {t('formations.accesDebloque')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-bold text-[#0A1D35] text-base leading-snug mb-2">{formation.titre}</h3>
                      <p className="text-xs text-[#56627A] leading-relaxed mb-3 flex-1">{descTruncated}</p>

                      {/* Méta */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {formation.duree_heures != null && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#56627A] bg-[#F7F2EB] px-2.5 py-1 rounded-full">
                            <Clock size={11} /> {formation.duree_heures}{t('formations.heures')}
                          </span>
                        )}
                        {formation.nb_modules != null && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#56627A] bg-[#F7F2EB] px-2.5 py-1 rounded-full">
                            <BookOpen size={11} /> {formation.nb_modules} {formation.nb_modules > 1 ? t('formations.modulesPluriel') : t('formations.modules')}
                          </span>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#F7F2EB]">
                        <span className="text-lg font-extrabold text-[#0A1D35]">{Number(formation.prix).toFixed(2)} €</span>
                        <Link
                          to={`/formations/${formation.slug}`}
                          className="inline-flex items-center gap-1.5 bg-[#0A1D35] text-white text-xs font-bold px-4 py-2 rounded-[10px] hover:bg-[#1C3352] transition-colors"
                        >
                          {t('formations.voirFormation')} <ArrowRight size={12} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
