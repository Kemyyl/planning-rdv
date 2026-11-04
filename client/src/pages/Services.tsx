import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, Video, Shield, CheckCircle, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../components/Layout';
import DevisPanel from '../components/DevisPanel';
import { localizePrestation } from '../lib/i18nUtils';
import { formatDuree } from '../lib/formatDuree';
import type { Prestation } from '@synego/shared';

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E7DCCD] rounded-[22px] p-7 flex flex-col gap-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-[#E7DCCD]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[#E7DCCD] rounded-full w-3/4" />
          <div className="h-3 bg-[#F7F2EB] rounded-full w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-[#F7F2EB] rounded-full" />
        <div className="h-3 bg-[#F7F2EB] rounded-full w-5/6" />
      </div>
      <div className="h-10 bg-[#E7DCCD] rounded-[12px] mt-auto" />
    </div>
  );
}

export default function Services() {
  const { t, i18n } = useTranslation();
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [devisOpen, setDevisOpen] = useState(false);

  useEffect(() => {
    fetch('/api/public/prestations')
      .then(r => r.json())
      .then(data => setPrestations(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <DevisPanel open={devisOpen} onClose={() => setDevisOpen(false)} />

      {/* Hero */}
      <section className="bg-[#F7F2EB] pt-14 pb-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-2xl mb-12">
            <div className="inline-flex items-center gap-2 bg-[#DCEFE4] text-[#1E6B4A] text-xs font-bold px-3 py-1.5 rounded-full mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E6B4A]" />
              {t('services.titre')}
            </div>
            <h1 className="text-4xl font-display text-[#0A1D35] mb-4 leading-tight">
              {t('services.titreHero1')}<br />
              <span className="text-[#6CAED6]">{t('services.titreHero2')}</span>
            </h1>
            <p className="text-[#56627A] text-base leading-relaxed mb-6">
              {t('services.description')}
            </p>
            {/* Reassurance chips */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: Video, label: t('services.chip1') },
                { icon: Shield, label: t('services.chip2') },
                { icon: CheckCircle, label: t('services.chip3') },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 bg-white border border-[#E7DCCD] text-[#56627A] text-xs font-medium px-3 py-1.5 rounded-full">
                  <Icon size={12} className="text-[#6CAED6]" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Cards */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : prestations.length === 0 ? (
            <div className="text-[#56627A] text-sm py-12 text-center">{t('services.aucunService')}</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {prestations.map(raw => {
                const p = localizePrestation(raw, i18n.language);
                const color = p.couleur || '#6CAED6';
                return (
                  <div key={p.id} className="bg-white border border-[#E7DCCD] rounded-[22px] p-7 flex flex-col gap-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                    {/* Icon circle + title */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: color + '20' }}>
                        <div className="w-4 h-4 rounded-full" style={{ background: color }} />
                      </div>
                      <div>
                        <h2 className="font-bold text-[#0A1D35] text-base leading-snug">{p.nom}</h2>
                        {p.description && (
                          <p className="text-sm text-[#56627A] leading-relaxed mt-1">{p.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Meta chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#56627A] bg-[#F7F2EB] px-2.5 py-1 rounded-full">
                        <Clock size={11} /> {formatDuree(p.duree, i18n.language === 'en' ? 'en' : 'fr')}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-[#56627A] bg-[#F7F2EB] px-2.5 py-1 rounded-full">
                        <Video size={11} /> {t('services.visio')}
                      </span>
                    </div>

                    <Link
                      to={`/reservation?prestation=${p.id}`}
                      className="mt-auto flex items-center justify-center gap-2 font-bold text-sm py-3 rounded-[12px] transition-colors text-white"
                      style={{ background: color }}
                    >
                      {t('services.reserver')} <ArrowRight size={14} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#0A1D35] py-14">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="text-[#6CAED6] text-xs font-bold uppercase tracking-widest mb-3">{t('services.ctaBadge')}</div>
            <h2 className="text-2xl font-extrabold text-white mb-2">{t('devis.ctaTitre')}</h2>
            <p className="text-[#8FA3B8] text-sm max-w-md leading-relaxed">{t('devis.ctaDesc')}</p>
          </div>
          <button
            onClick={() => setDevisOpen(true)}
            className="inline-flex items-center gap-2 bg-white text-[#0A1D35] font-bold px-7 py-3.5 rounded-[14px] hover:bg-[#F7F2EB] transition-colors whitespace-nowrap shrink-0"
          >
            <MessageSquare size={16} /> {t('devis.cta')}
          </button>
        </div>
      </section>
    </PublicLayout>
  );
}
