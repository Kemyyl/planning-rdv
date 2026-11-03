import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle, Calendar, Clock, Mail } from 'lucide-react';
import { PublicLayout } from '../components/Layout';
import type { RendezVous } from '@synego/shared';

export default function Confirmation() {
  const { id } = useParams<{ id: string }>();
  const [rdv, setRdv] = useState<RendezVous | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/public/rdv/${id}`)
      .then(r => r.json())
      .then(data => { if (data.error) setError(true); else setRdv(data); })
      .catch(() => setError(true));
  }, [id]);

  if (error) return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-6 py-20 text-center">
        <p className="text-[#56627A]">Rendez-vous introuvable.</p>
        <Link to="/" className="text-[#0A1D35] font-bold mt-4 inline-block">Retour à l'accueil</Link>
      </div>
    </PublicLayout>
  );

  if (!rdv) return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-6 py-20 text-center text-[#56627A]">Chargement…</div>
    </PublicLayout>
  );

  const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`RDV Synégo — ${rdv.prestation?.nom || ''}`)}&dates=${rdv.debut.replace(/[-:]/g,'').replace('.000Z','Z')}/${rdv.fin.replace(/[-:]/g,'').replace('.000Z','Z')}`;

  return (
    <PublicLayout>
      <div className="max-w-xl mx-auto px-6 py-16">
        <div className="bg-[#FFFDFA] border border-[#E7DCCD] rounded-[22px] p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-[#DCEFE4] rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-[#1E6B4A]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0A1D35] mb-2">Rendez-vous confirmé !</h1>
          <p className="text-[#56627A] mb-8">Un e-mail de confirmation vous a été envoyé.</p>

          <div className="bg-[#F7F2EB] rounded-[14px] p-5 text-left space-y-3 mb-8">
            <div className="flex items-center gap-3 text-sm">
              <Clock size={16} className="text-[#56627A] shrink-0" />
              <span className="text-[#0A1D35] font-semibold capitalize">
                {format(new Date(rdv.debut), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })}
              </span>
            </div>
            {rdv.prestation && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-[#56627A] shrink-0" />
                <span className="text-[#0A1D35] font-semibold">{rdv.prestation.nom} · {rdv.prestation.duree} min</span>
              </div>
            )}
            {rdv.client && (
              <div className="flex items-center gap-3 text-sm">
                <Mail size={16} className="text-[#56627A] shrink-0" />
                <span className="text-[#56627A]">{rdv.client.email}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-[#0A1D35] text-white font-bold py-3 rounded-[14px] hover:bg-[#1C3352] transition-colors"
            >
              <Calendar size={16} />
              Ajouter à Google Agenda
            </a>
            <Link
              to={`/mes-rdv?jeton=${rdv.jeton_annulation}`}
              className="flex items-center justify-center gap-2 border border-[#E7DCCD] text-[#56627A] font-semibold py-3 rounded-[14px] hover:border-[#0A1D35] hover:text-[#0A1D35] transition-colors text-sm"
            >
              Voir ou modifier mon rendez-vous
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
