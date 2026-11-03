import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { PublicLayout } from '../components/Layout';
import type { Prestation } from '@synego/shared';

export default function Services() {
  const [prestations, setPrestations] = useState<Prestation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/prestations')
      .then(r => r.json())
      .then(data => setPrestations(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PublicLayout>
      <section className="bg-[#F7F2EB] pt-14 pb-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-10">
            <h1 className="text-4xl font-extrabold text-[#0A1D35] mb-3">Nos accompagnements</h1>
            <p className="text-[#56627A] text-base max-w-xl leading-relaxed">
              Chaque séance est conduite en visioconférence, dans un cadre bienveillant et confidentiel. Réservez directement en ligne.
            </p>
          </div>

          {loading && (
            <div className="text-[#56627A] text-sm py-12">Chargement…</div>
          )}

          {!loading && prestations.length === 0 && (
            <div className="text-[#56627A] text-sm py-12">Aucun service disponible pour le moment.</div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prestations.map(p => (
              <div key={p.id} className="bg-white border border-[#E7DCCD] rounded-[22px] p-7 flex flex-col gap-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: p.couleur || '#6CAED6' }}
                  />
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-[#0A1D35] leading-snug">{p.nom}</h2>
                  </div>
                </div>

                {p.description && (
                  <p className="text-sm text-[#56627A] leading-relaxed">{p.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-[#56627A]">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {p.duree} min
                  </span>
                  <span className="text-xs bg-[#F7F2EB] text-[#56627A] px-2.5 py-1 rounded-full font-medium">
                    Sur devis
                  </span>
                </div>

                <Link
                  to={`/reservation?prestation=${p.id}`}
                  className="mt-auto flex items-center justify-center gap-2 bg-[#0A1D35] text-white font-semibold text-sm py-2.5 rounded-[12px] hover:bg-[#1C3352] transition-colors"
                >
                  Réserver <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-white border-t border-[#E7DCCD]">
        <div className="max-w-xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-extrabold text-[#0A1D35] mb-3">Première séance découverte offerte</h2>
          <p className="text-[#56627A] text-sm leading-relaxed mb-8">
            Vous hésitez encore ? La première séance est gratuite et sans engagement, pour faire connaissance et voir si l'accompagnement vous convient.
          </p>
          <Link
            to="/reservation"
            className="inline-flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-8 py-3.5 rounded-[14px] hover:bg-[#1C3352] transition-colors"
          >
            Réserver ma séance découverte
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
