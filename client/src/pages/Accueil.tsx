import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Video, Zap, Shield, Star, ChevronDown, ChevronUp, MessageSquare, CheckCircle, ArrowRight, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../components/Layout';
import DevisPanel from '../components/DevisPanel';


export default function Accueil() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [devisOpen, setDevisOpen] = useState(false);

  const TEMOIGNAGES = [
    { initiales: 'ML', nom: 'Marie L.', texte: t('accueil.temoignage1') },
    { initiales: 'TP', nom: 'Thomas P.', texte: t('accueil.temoignage2') },
    { initiales: 'SC', nom: 'Sophie C.', texte: t('accueil.temoignage3') },
  ];

  const ETAPES = [
    { n: '1', icon: Calendar, titre: t('accueil.etape1Titre'), desc: t('accueil.etape1Desc') },
    { n: '2', icon: Clock, titre: t('accueil.etape2Titre'), desc: t('accueil.etape2Desc') },
    { n: '3', icon: Video, titre: t('accueil.etape3Titre'), desc: t('accueil.etape3Desc') },
  ];

  const FEATURES = [
    { icon: Calendar, title: t('accueil.feature1Titre'), desc: t('accueil.feature1Desc'), bg: '#D0E7F5', fg: '#0A5A8A' },
    { icon: Video, title: t('accueil.feature2Titre'), desc: t('accueil.feature2Desc'), bg: '#DCEFE4', fg: '#1E6B4A' },
    { icon: Zap, title: t('accueil.feature3Titre'), desc: t('accueil.feature3Desc'), bg: '#F6E7C8', fg: '#8A5A12' },
    { icon: Shield, title: t('accueil.feature4Titre'), desc: t('accueil.feature4Desc'), bg: '#E9D8F5', fg: '#5A2C8A' },
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
      <section className="bg-[#F7F2EB] pt-14 pb-20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row gap-14 items-center">
          {/* Left */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-[#DCEFE4] text-[#1E6B4A] text-xs font-bold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E6B4A]" />
              {t('accueil.badgeHero')}
            </div>
            <h1 className="text-4xl md:text-5xl font-display text-[#0A1D35] leading-tight mb-5">
              {t('accueil.titre1')}<br />
              <span className="text-[#6CAED6]">{t('accueil.titre2')}</span>
            </h1>
            <p className="text-[#56627A] text-base mb-8 leading-relaxed max-w-md">
              {t('accueil.description')}
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/reservation"
                className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-6 py-3.5 rounded-[14px] hover:bg-[#1C3352] transition-colors shadow-sm">
                {t('accueil.cta')} <ArrowRight size={15} />
              </Link>
              <a href="#comment-ca-marche"
                className="inline-flex items-center gap-2 border border-[#D9C9B4] text-[#0A1D35] font-semibold px-6 py-3.5 rounded-[14px] hover:bg-white transition-colors">
                {t('accueil.ctaSecondaire')}
              </a>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 mt-8">
              <div className="flex -space-x-2">
                {['ML','TP','SC'].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-[#D0E7F5] border-2 border-[#F7F2EB] flex items-center justify-center text-[10px] font-bold text-[#0A1D35]">{i}</div>
                ))}
              </div>
              <div className="text-xs text-[#56627A]">
                <span className="font-bold text-[#0A1D35]">+127</span> {t('accueil.clientsAccomapgnes')}
                <span className="mx-2">·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Star size={11} className="fill-[#F6C90E] text-[#F6C90E]" />
                  <span className="font-bold text-[#0A1D35]">4.9</span>/5
                </span>
              </div>
            </div>
          </div>

          {/* Right — mock appointment card */}
          <div className="flex-shrink-0 w-full md:w-[320px]">
            <div className="bg-white border border-[#E7DCCD] rounded-[22px] p-6 shadow-md">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <span className="text-xs font-bold text-[#56627A] uppercase tracking-wide">{t('accueil.votreSeance')}</span>
                <span className="flex items-center gap-1 bg-[#DCEFE4] text-[#1E6B4A] text-[10px] font-bold px-2 py-1 rounded-full">
                  <CheckCircle size={10} /> {t('accueil.confirmee')}
                </span>
              </div>

              {/* Prestation */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2.5 h-2.5 rounded-full bg-[#6CAED6] shrink-0" />
                <div>
                  <div className="font-bold text-[#0A1D35] text-sm">{t('accueil.consultationIndividuelle')}</div>
                  <div className="text-xs text-[#56627A]">50 {t('common.min')}</div>
                </div>
              </div>

              {/* Date */}
              <div className="bg-[#F7F2EB] rounded-[12px] px-4 py-3 mb-4 flex items-center gap-3">
                <Calendar size={15} className="text-[#56627A] shrink-0" />
                <div>
                  <div className="text-xs font-bold text-[#0A1D35]" translate="no">Lundi 10 nov. · 14:00</div>
                  <div className="text-[11px] text-[#56627A]">{t('accueil.enVisio')}</div>
                </div>
              </div>

              {/* Meet link */}
              <div className="flex items-center gap-2 bg-[#D0E7F5] rounded-[10px] px-3 py-2.5">
                <Video size={13} className="text-[#0A5A8A] shrink-0" />
                <span className="text-xs font-semibold text-[#0A5A8A]">{t('accueil.lienMeetAuto')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment-ca-marche" className="bg-white border-y border-[#E7DCCD] py-16">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-[#0A1D35] text-center mb-12">{t('accueil.commentCaMarche')}</h2>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-5 left-[calc(16.66%+16px)] right-[calc(16.66%+16px)] h-px bg-[#E7DCCD]" />
            {ETAPES.map(({ n, icon: Icon, titre, desc }) => (
              <div key={n} className="flex flex-col items-center text-center gap-4 relative">
                <div className="w-11 h-11 rounded-full bg-[#0A1D35] text-white flex items-center justify-center font-bold text-sm z-10 ring-4 ring-white">
                  {n}
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#F7F2EB] flex items-center justify-center">
                  <Icon size={18} className="text-[#0A1D35]" />
                </div>
                <div>
                  <div className="font-bold text-[#0A1D35] text-sm mb-1">{titre}</div>
                  <div className="text-xs text-[#56627A] leading-relaxed max-w-[200px] mx-auto">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/reservation"
              className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-7 py-3.5 rounded-[14px] hover:bg-[#1C3352] transition-colors">
              {t('accueil.cta')} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Votre praticien */}
      <section className="bg-[#F7F2EB] border-y border-[#E7DCCD] py-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
          {/* Photo */}
          <div className="shrink-0">
            <div className="relative">
              <div className="absolute -inset-3 bg-[#D0E7F5] rounded-[28px] -z-10 translate-x-3 translate-y-3" />
              <img
                src="/melik.jpg"
                alt="Melik Youcef Tahri"
                className="w-64 h-64 md:w-72 md:h-72 object-cover rounded-[24px] border-4 border-white shadow-md"
              />
            </div>
          </div>

          {/* Bio */}
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-white border border-[#E7DCCD] text-[#56627A] text-xs font-bold px-3 py-1.5 rounded-full mb-5">
              {t('accueil.praticienBadge')}
            </div>
            <h2 className="text-3xl md:text-4xl font-display text-[#0A1D35] mb-2 leading-tight">
              Melik Youcef Tahri
            </h2>
            <p className="text-sm font-semibold text-[#6CAED6] uppercase tracking-widest mb-5">
              {t('accueil.praticienRole')}
            </p>
            <p className="text-[#56627A] text-base leading-relaxed mb-6 max-w-xl">
              {t('accueil.praticienBio')}
            </p>
            <div className="flex gap-3 flex-wrap justify-center md:justify-start">
              <Link
                to="/reservation"
                className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-6 py-3 rounded-[12px] hover:bg-[#1C3352] transition-colors text-sm"
              >
                {t('accueil.cta')} <ArrowRight size={14} />
              </Link>
              <a
                href="https://www.linkedin.com/in/melik-youcef-tahri-609b60201/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-[#D9C9B4] text-[#0A1D35] font-semibold px-6 py-3 rounded-[12px] hover:bg-white transition-colors text-sm"
              >
                {t('accueil.praticienLinkedin')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section id="services" className="bg-[#F7F2EB] py-14">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc, bg, fg }) => (
            <div key={title} className="bg-white border border-[#E7DCCD] rounded-[18px] p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={18} style={{ color: fg }} />
              </div>
              <div>
                <div className="font-bold text-[#0A1D35] text-sm mb-1">{title}</div>
                <div className="text-xs text-[#56627A] leading-relaxed">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Témoignages */}
      <section className="py-16 bg-white border-t border-[#E7DCCD]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-[#0A1D35] text-center mb-2">{t('accueil.avisTitle')}</h2>
          <p className="text-center text-sm text-[#56627A] mb-10">
            <span className="inline-flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className="fill-[#F6C90E] text-[#F6C90E]" />)}
            </span>
            <span className="ml-2 font-semibold text-[#0A1D35]">4.9</span> <span className="text-[#56627A]">{t('accueil.avisVerifies')}</span>
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {TEMOIGNAGES.map(item => (
              <div key={item.nom} className="bg-[#FFFDFA] border border-[#E7DCCD] rounded-[22px] p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className="fill-[#F6C90E] text-[#F6C90E]" />
                  ))}
                </div>
                <p className="text-[#0A1D35] text-sm leading-relaxed flex-1">"{item.texte}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-[#F7F2EB]">
                  <div className="w-8 h-8 rounded-full bg-[#D0E7F5] flex items-center justify-center text-xs font-bold text-[#0A1D35] shrink-0">
                    {item.initiales}
                  </div>
                  <span className="text-xs font-bold text-[#56627A]">{item.nom}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Devis CTA */}
      <section className="bg-[#0A1D35] py-14">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="text-[#6CAED6] text-xs font-bold uppercase tracking-widest mb-3">{t('accueil.accompagnementSurMesure')}</div>
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

      {/* FAQ */}
      <section id="contact" className="py-16 bg-[#F7F2EB] border-t border-[#E7DCCD]">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-[#0A1D35] text-center mb-10">{t('accueil.faqTitle')}</h2>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className={`border rounded-[14px] overflow-hidden transition-colors ${openFaq === i ? 'border-[#0A1D35]' : 'border-[#E7DCCD] bg-white'}`}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F7F2EB] transition-colors bg-white">
                  <span className="font-semibold text-[#0A1D35] text-sm pr-4">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp size={16} className="text-[#0A1D35] shrink-0" />
                    : <ChevronDown size={16} className="text-[#56627A] shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-1 text-sm text-[#56627A] leading-relaxed border-t border-[#E7DCCD] bg-white">
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
