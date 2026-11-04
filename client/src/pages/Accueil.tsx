import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Video, Zap, Shield, Star, ChevronDown, ChevronUp, MessageSquare, CheckCircle, ArrowRight, Clock, Sparkles } from 'lucide-react';
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
    { n: '01', icon: Calendar, titre: t('accueil.etape1Titre'), desc: t('accueil.etape1Desc') },
    { n: '02', icon: Clock, titre: t('accueil.etape2Titre'), desc: t('accueil.etape2Desc') },
    { n: '03', icon: Video, titre: t('accueil.etape3Titre'), desc: t('accueil.etape3Desc') },
  ];

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

      {/* ═══════════ HERO — asymmetric magazine ═══════════ */}
      <section className="relative overflow-hidden pt-16 pb-28 md:pt-24 md:pb-40">
        {/* Decorative oversized serif background word */}
        <div className="absolute -top-8 left-0 right-0 text-center pointer-events-none select-none">
          <span className="font-display text-[160px] md:text-[280px] leading-none text-[#E7DCCD]/40 tracking-tighter">
            Synégo
          </span>
        </div>

        <div className="relative max-w-6xl mx-auto px-6 grid md:grid-cols-12 gap-10 items-center">
          {/* Left — portrait */}
          <div className="md:col-span-5 relative">
            <div className="relative aspect-[4/5] max-w-sm mx-auto md:mx-0">
              <div className="absolute -top-4 -left-4 w-full h-full bg-[#0A1D35] rounded-[32px] -z-10" />
              <div className="absolute -bottom-4 -right-4 w-full h-full border-2 border-[#6CAED6] rounded-[32px] -z-10" />
              <img src="/melik.jpg" alt="Melik Youcef Tahri"
                className="w-full h-full object-cover rounded-[32px] shadow-xl" />
              {/* Floating badge */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 md:-left-6 md:translate-x-0 bg-white border border-[#E7DCCD] rounded-full px-4 py-2 flex items-center gap-2 shadow-md whitespace-nowrap">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1E6B4A] animate-pulse" />
                <span className="text-[11px] font-bold text-[#0A1D35] uppercase tracking-widest">
                  {t('accueil.disponible')}
                </span>
              </div>
            </div>
          </div>

          {/* Right — big serif headline */}
          <div className="md:col-span-7">
            <div className="text-[11px] font-bold text-[#56627A] uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
              <span className="w-8 h-px bg-[#56627A]" />
              {t('accueil.heroEyebrow')}
            </div>
            <h1 className="font-display text-5xl md:text-7xl text-[#0A1D35] leading-[0.95] tracking-tight mb-8">
              {t('accueil.heroLine1')}
              <br />
              <em className="text-[#6CAED6] font-normal italic">{t('accueil.heroLine2')}</em>
              <br />
              {t('accueil.heroLine3')}
            </h1>
            <p className="text-[#56627A] text-lg leading-relaxed mb-10 max-w-lg">
              {t('accueil.description')}
            </p>
            <div className="flex gap-4 flex-wrap items-center">
              <Link to="/reservation"
                className="group inline-flex items-center gap-3 bg-[#0A1D35] text-white font-semibold px-7 py-4 rounded-full hover:bg-[#1C3352] transition-all">
                {t('accueil.cta')}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className="fill-[#F6C90E] text-[#F6C90E]" />
                  ))}
                </span>
                <span className="text-[#56627A]"><span className="font-bold text-[#0A1D35]">4.9</span> · 127 {t('accueil.clientsAccomapgnes')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ STATS bande ═══════════ */}
      <section className="bg-[#0A1D35] text-white py-14">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { num: '127+', lbl: t('accueil.statClients') },
            { num: '4.9', lbl: t('accueil.statNote') },
            { num: '50min', lbl: t('accueil.statDuree') },
            { num: '24/7', lbl: t('accueil.statDispo') },
          ].map(s => (
            <div key={s.lbl} className="text-center md:text-left">
              <div className="font-display text-5xl md:text-6xl mb-1 tracking-tight">{s.num}</div>
              <div className="text-xs text-[#6CAED6] uppercase tracking-widest font-semibold">{s.lbl}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════ PRATICIEN — editorial pull-quote ═══════════ */}
      <section className="bg-[#F7F2EB] py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[11px] font-bold text-[#56627A] uppercase tracking-[0.3em] mb-5">
              {t('accueil.praticienBadge')}
            </div>
            <h2 className="font-display text-4xl md:text-5xl text-[#0A1D35] leading-tight">
              Melik Youcef Tahri<span className="text-[#6CAED6]">.</span>
            </h2>
            <p className="text-sm font-semibold text-[#56627A] uppercase tracking-widest mt-3">
              {t('accueil.praticienRole')}
            </p>
          </div>

          <blockquote className="font-display text-2xl md:text-3xl text-[#0A1D35] leading-relaxed text-center max-w-3xl mx-auto mb-10 italic">
            <span className="text-5xl text-[#6CAED6] leading-none">"</span>
            {t('accueil.praticienBio')}
            <span className="text-5xl text-[#6CAED6] leading-none">"</span>
          </blockquote>

          <div className="flex justify-center">
            <a href="https://www.linkedin.com/in/melik-youcef-tahri-609b60201/"
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0A1D35] border-b-2 border-[#0A1D35] hover:border-[#6CAED6] hover:text-[#6CAED6] transition-colors pb-1">
              {t('accueil.praticienLinkedin')} →
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════ COMMENT ÇA MARCHE — bento with oversized numbers ═══════════ */}
      <section id="comment-ca-marche" className="bg-white border-y border-[#E7DCCD] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-14 flex-wrap gap-4">
            <div>
              <div className="text-[11px] font-bold text-[#56627A] uppercase tracking-[0.3em] mb-3">
                {t('accueil.processus')}
              </div>
              <h2 className="font-display text-4xl md:text-5xl text-[#0A1D35] leading-tight max-w-md">
                {t('accueil.commentCaMarche')}
              </h2>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {ETAPES.map(({ n, icon: Icon, titre, desc }) => (
              <div key={n} className="group relative bg-[#F7F2EB] rounded-[24px] p-8 hover:bg-[#0A1D35] hover:text-white transition-all duration-500">
                <div className="font-display text-7xl text-[#D9C9B4] group-hover:text-[#6CAED6] leading-none mb-6 transition-colors">
                  {n}
                </div>
                <Icon size={20} className="text-[#0A1D35] group-hover:text-[#6CAED6] mb-4 transition-colors" />
                <div className="font-display text-xl text-[#0A1D35] group-hover:text-white mb-2 transition-colors">{titre}</div>
                <div className="text-sm text-[#56627A] group-hover:text-[#A8B8C8] leading-relaxed transition-colors">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES bento ═══════════ */}
      <section id="services" className="bg-[#F7F2EB] py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-[11px] font-bold text-[#56627A] uppercase tracking-[0.3em] mb-3 text-center">
            {t('accueil.cePourquoiVousNous')}
          </div>
          <h2 className="font-display text-4xl md:text-5xl text-[#0A1D35] text-center mb-16 leading-tight">
            {t('accueil.pourquoi')}
          </h2>
          <div className="grid md:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-[24px] p-6 flex flex-col gap-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-[#E7DCCD]">
                <Icon size={22} className="text-[#6CAED6]" />
                <div>
                  <div className="font-display text-lg text-[#0A1D35] mb-2 leading-snug">{title}</div>
                  <div className="text-xs text-[#56627A] leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TÉMOIGNAGES — magazine ═══════════ */}
      <section className="bg-white py-24 border-y border-[#E7DCCD]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="text-[11px] font-bold text-[#56627A] uppercase tracking-[0.3em] mb-3">
              {t('accueil.ilsOntDit')}
            </div>
            <h2 className="font-display text-4xl md:text-5xl text-[#0A1D35] leading-tight">
              {t('accueil.avisTitle')}
            </h2>
            <p className="text-sm text-[#56627A] mt-4 inline-flex items-center gap-2">
              <span className="inline-flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className="fill-[#F6C90E] text-[#F6C90E]" />)}
              </span>
              <span className="font-bold text-[#0A1D35]">4.9</span> {t('accueil.avisVerifies')}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TEMOIGNAGES.map((item, idx) => (
              <div key={item.nom} className={`${idx === 1 ? 'md:mt-10' : ''} group`}>
                <div className="font-display text-6xl text-[#D9C9B4] leading-none mb-4">"</div>
                <p className="font-display italic text-xl text-[#0A1D35] leading-relaxed mb-6">
                  {item.texte}
                </p>
                <div className="flex items-center gap-3 pt-5 border-t border-[#E7DCCD]">
                  <div className="w-9 h-9 rounded-full bg-[#0A1D35] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {item.initiales}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#0A1D35]">{item.nom}</div>
                    <div className="text-[11px] text-[#56627A] uppercase tracking-widest">{t('accueil.clientVerifie')}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ DEVIS CTA — bold ═══════════ */}
      <section className="bg-[#0A1D35] py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none select-none">
          <div className="absolute -right-20 -bottom-20 font-display text-[280px] text-[#1C3352] leading-none">
            S
          </div>
        </div>
        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <Sparkles size={24} className="text-[#6CAED6] mx-auto mb-5" />
          <div className="text-[11px] font-bold text-[#6CAED6] uppercase tracking-[0.3em] mb-5">
            {t('accueil.accompagnementSurMesure')}
          </div>
          <h2 className="font-display text-4xl md:text-6xl text-white leading-tight mb-6 max-w-3xl mx-auto">
            {t('devis.ctaTitre')}
          </h2>
          <p className="text-[#8FA3B8] text-base max-w-xl mx-auto leading-relaxed mb-10">
            {t('devis.ctaDesc')}
          </p>
          <button
            onClick={() => setDevisOpen(true)}
            className="inline-flex items-center gap-3 bg-white text-[#0A1D35] font-semibold px-8 py-4 rounded-full hover:bg-[#F7F2EB] transition-colors"
          >
            <MessageSquare size={16} /> {t('devis.cta')}
          </button>
        </div>
      </section>

      {/* ═══════════ FAQ ═══════════ */}
      <section id="contact" className="bg-[#F7F2EB] py-24">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-14">
            <div className="text-[11px] font-bold text-[#56627A] uppercase tracking-[0.3em] mb-3">
              FAQ
            </div>
            <h2 className="font-display text-4xl md:text-5xl text-[#0A1D35] leading-tight">
              {t('accueil.faqTitle')}
            </h2>
          </div>
          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className={`bg-white border rounded-[20px] overflow-hidden transition-all ${openFaq === i ? 'border-[#0A1D35] shadow-md' : 'border-[#E7DCCD]'}`}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left gap-4"
                >
                  <span className="font-display text-lg text-[#0A1D35]">{item.q}</span>
                  {openFaq === i
                    ? <ChevronUp size={18} className="text-[#0A1D35] shrink-0" />
                    : <ChevronDown size={18} className="text-[#56627A] shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-sm text-[#56627A] leading-relaxed">
                    {item.r}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FINAL CTA ═══════════ */}
      <section className="bg-white border-t border-[#E7DCCD] py-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-display text-3xl md:text-4xl text-[#0A1D35] leading-tight mb-2">
              {t('accueil.readyTitre')}
            </h2>
            <p className="text-sm text-[#56627A]">{t('accueil.readyDesc')}</p>
          </div>
          <Link to="/reservation"
            className="inline-flex items-center gap-3 bg-[#0A1D35] text-white font-semibold px-7 py-4 rounded-full hover:bg-[#1C3352] transition-colors whitespace-nowrap">
            <CheckCircle size={16} /> {t('accueil.cta')}
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
