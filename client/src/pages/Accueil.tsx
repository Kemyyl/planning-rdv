import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Video, Zap, Shield, Star, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../components/Layout';
import DevisPanel from '../components/DevisPanel';

const TEMOIGNAGES = [
  { initiales: 'ML', nom: 'Marie L.', texte: "J'ai pu reprendre confiance en moi sans jugement. Le praticien est très à l'écoute." },
  { initiales: 'TP', nom: 'Thomas P.', texte: "L'accompagnement est très personnalisé et le praticien est très à l'écoute. Je recommande." },
  { initiales: 'SC', nom: 'Sophie C.', texte: "Très professionnel. J'ai vu une vraie évolution en quelques séances. Je recommande vivement." },
];

export default function Accueil() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [devisOpen, setDevisOpen] = useState(false);

  const FEATURES = [
    { icon: Calendar, title: t('accueil.feature1Titre'), desc: t('accueil.feature1Desc') },
    { icon: Video, title: t('accueil.feature2Titre'), desc: t('accueil.feature2Desc') },
    { icon: Zap, title: t('accueil.feature3Titre'), desc: t('accueil.feature3Desc') },
    { icon: Shield, title: t('accueil.feature4Titre'), desc: t('accueil.feature4Desc') },
  ];

  const FAQ = [
    { q: t('accueil.faq1Question'), r: t('accueil.faq1Reponse') },
    { q: t('accueil.faq2Question'), r: t('accueil.faq2Reponse') },
    { q: t('accueil.faq3Question'), r: t('accueil.faq3Reponse') },
  ];

  return (
    <PublicLayout>
      <DevisPanel open={devisOpen} onClose={() => setDevisOpen(false)} />
      {/* Hero */}
      <section className="bg-[#F7F2EB] pt-14 pb-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl font-display text-[#0A1D35] mb-5">
              {t('accueil.titre1')}<br />
              {t('accueil.titre2')}
            </h1>
            <p className="text-[#56627A] text-base mb-8 leading-relaxed max-w-md">
              {t('accueil.description')}
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/reservation"
                className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-6 py-3 rounded-[12px] hover:bg-[#1C3352] transition-colors">
                {t('accueil.cta')}
              </Link>
              <a href="#services"
                className="inline-flex items-center gap-2 border border-[#D9C9B4] text-[#0A1D35] font-semibold px-6 py-3 rounded-[12px] hover:bg-white transition-colors">
                {t('accueil.ctaSecondaire')}
              </a>
            </div>
          </div>

          <div className="flex-shrink-0 w-full md:w-80">
            <div className="bg-white border border-[#E7DCCD] rounded-[22px] p-8 shadow-sm">
              <div className="w-12 h-12 bg-[#D0E7F5] rounded-xl flex items-center justify-center mb-5">
                <Video size={22} className="text-[#0A1D35]" />
              </div>
              <div className="font-bold text-[#0A1D35] text-lg mb-1">Visioconférence sécurisée</div>
              <div className="text-sm text-[#56627A] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6CAED6]" />
                Google Meet · Lien automatique
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section id="services" className="bg-white border-y border-[#E7DCCD] py-10">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex flex-col gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#F7F2EB] flex items-center justify-center mb-1">
                <Icon size={18} className="text-[#0A1D35]" />
              </div>
              <div className="font-bold text-[#0A1D35] text-sm">{title}</div>
              <div className="text-xs text-[#56627A] leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Devis CTA */}
      <section className="bg-white py-12 border-t border-[#E7DCCD]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-extrabold text-[#0A1D35] mb-2">{t('devis.ctaTitre')}</h2>
            <p className="text-[#56627A] text-sm max-w-md">{t('devis.ctaDesc')}</p>
          </div>
          <button
            onClick={() => setDevisOpen(true)}
            className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-7 py-3.5 rounded-[14px] hover:bg-[#1C3352] transition-colors whitespace-nowrap shrink-0"
          >
            <MessageSquare size={16} /> {t('devis.cta')}
          </button>
        </div>
      </section>

      {/* Témoignages */}
      <section className="py-16 bg-[#F7F2EB]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-[#0A1D35] text-center mb-10">{t('accueil.avisTitle')}</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TEMOIGNAGES.map(item => (
              <div key={item.nom} className="bg-white border border-[#E7DCCD] rounded-[22px] p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className="fill-[#F6C90E] text-[#F6C90E]" />
                  ))}
                </div>
                <p className="text-[#0A1D35] text-sm leading-relaxed mb-5">"{item.texte}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#D0E7F5] flex items-center justify-center text-xs font-bold text-[#0A1D35]">
                    {item.initiales}
                  </div>
                  <span className="text-xs font-bold text-[#56627A]">{item.nom}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="contact" className="py-16 bg-white border-t border-[#E7DCCD]">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-[#0A1D35] text-center mb-10">{t('accueil.faqTitle')}</h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-[#E7DCCD] rounded-[14px] overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F7F2EB] transition-colors">
                  <span className="font-semibold text-[#0A1D35] text-sm">{item.q}</span>
                  {openFaq === i ? <ChevronUp size={16} className="text-[#56627A] shrink-0" /> : <ChevronDown size={16} className="text-[#56627A] shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-[#56627A] leading-relaxed border-t border-[#E7DCCD] pt-3 bg-[#F7F2EB]">
                    {item.r}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
