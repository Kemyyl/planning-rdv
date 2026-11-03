import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Video, Zap, Shield, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { PublicLayout } from '../components/Layout';

const FEATURES = [
  { icon: Calendar, title: 'Réservation en ligne', desc: 'Créneaux disponibles 24h/24' },
  { icon: Video, title: 'Séance en visio', desc: 'Google Meet, lien généré auto.' },
  { icon: Zap, title: 'Flexibilité totale', desc: 'Séances de 50 min, sur mesure' },
  { icon: Shield, title: 'Confidentialité', desc: 'Données protégées RGPD' },
];

const TEMOIGNAGES = [
  { initiales: 'ML', nom: 'Marie L.', texte: "J'ai pu reprendre confiance en moi sans jugement. Le praticien est très à l'écoute." },
  { initiales: 'TP', nom: 'Thomas P.', texte: "L'accompagnement est très personnalisé et le praticien est très à l'écoute. Je recommande." },
  { initiales: 'SC', nom: 'Sophie C.', texte: "Très professionnel. J'ai vu une vraie évolution en quelques séances. Je recommande vivement." },
];

const FAQ = [
  { q: 'Comment se déroule une séance en visio ?', r: 'Un lien Google Meet vous est envoyé automatiquement par email. Il vous suffit de cliquer pour rejoindre la séance à l\'heure prévue.' },
  { q: 'Puis-je annuler ou reporter ?', r: 'Oui, vous pouvez annuler gratuitement jusqu\'à 24h avant votre rendez-vous depuis votre espace personnel ou via le lien reçu par email.' },
  { q: 'Combien coûte une séance ?', r: 'Les tarifs varient selon le type de séance. Consultez la page Services pour les détails, ou contactez-nous directement.' },
];

export default function Accueil() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="bg-[#F7F2EB] pt-14 pb-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-[#DCEFE4] text-[#1E6B4A] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1E6B4A]" />
              Première séance découverte offerte
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#0A1D35] leading-tight mb-5">
              Retrouvez l'équilibre,<br />
              où que vous soyez.
            </h1>
            <p className="text-[#56627A] text-base mb-8 leading-relaxed max-w-md">
              Un accompagnement thérapeutique bienveillant et certifié. Réservez votre séance en ligne en quelques secondes.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/reservation"
                className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-6 py-3 rounded-[12px] hover:bg-[#1C3352] transition-colors">
                Réserver une séance
              </Link>
              <a href="#services"
                className="inline-flex items-center gap-2 border border-[#D9C9B4] text-[#0A1D35] font-semibold px-6 py-3 rounded-[12px] hover:bg-white transition-colors">
                En savoir plus
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

      {/* Témoignages */}
      <section className="py-16 bg-[#F7F2EB]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-[#0A1D35] text-center mb-10">Ce que disent nos clients</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {TEMOIGNAGES.map(t => (
              <div key={t.nom} className="bg-white border border-[#E7DCCD] rounded-[22px] p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className="fill-[#F6C90E] text-[#F6C90E]" />
                  ))}
                </div>
                <p className="text-[#0A1D35] text-sm leading-relaxed mb-5">"{t.texte}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#D0E7F5] flex items-center justify-center text-xs font-bold text-[#0A1D35]">
                    {t.initiales}
                  </div>
                  <span className="text-xs font-bold text-[#56627A]">{t.nom}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="contact" className="py-16 bg-white border-t border-[#E7DCCD]">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-2xl font-extrabold text-[#0A1D35] text-center mb-10">Questions fréquentes</h2>
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
