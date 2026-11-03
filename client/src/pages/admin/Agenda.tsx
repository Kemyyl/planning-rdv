import { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import type { Horaire } from '@synego/shared';
import toast from 'react-hot-toast';
import { Calendar, CheckCircle, Unlink } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function AdminAgenda() {
  const { token } = useAuth();
  const [horaires, setHoraires] = useState<Horaire[]>([]);
  const [saving, setSaving] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleCalendarId, setGoogleCalendarId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetch('/api/admin/horaires', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => setHoraires(Array.isArray(data) ? data : []));

    fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => {
        setGoogleConnected(!!data.google_connected);
        setGoogleCalendarId(data.google_calendar_id || '');
      });
  }, [token]);

  useEffect(() => {
    const googleStatus = searchParams.get('google');
    if (googleStatus === 'connected') {
      toast.success('Google Calendar connecté !');
      setGoogleConnected(true);
      fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(data => setGoogleCalendarId(data.google_calendar_id || ''));
      setSearchParams({});
    } else if (googleStatus === 'error') {
      toast.error('Erreur de connexion Google. Réessaie.');
      setSearchParams({});
    }
  }, [searchParams]);

  async function connectGoogle() {
    setConnecting(true);
    try {
      const res = await fetch('/api/admin/google-auth', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast.error('OAuth non configuré sur le serveur'); return; }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error('Erreur lors de la connexion Google');
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectGoogle() {
    await fetch('/api/admin/me/google', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setGoogleConnected(false);
    setGoogleCalendarId('');
    toast.success('Google Calendar déconnecté');
  }

  async function sauvegarder() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/horaires', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(horaires),
      });
      if (!res.ok) throw new Error();
      toast.success('Horaires sauvegardés');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  function update(id: string, field: keyof Horaire, value: string | boolean) {
    setHoraires(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h));
  }

  return (
    <AdminLayout title="Agenda & Paramètres">
      <div className="max-w-2xl space-y-8">

        {/* Section Google Calendar */}
        <div>
          <h2 className="text-base font-bold text-[#0A1D35] mb-1">Intégration Google Calendar</h2>
          <p className="text-sm text-[#56627A] mb-4">
            Connecte ton compte Google pour que chaque RDV génère automatiquement un lien Meet et apparaisse dans ton agenda.
          </p>
          <div className="bg-[#FFFDFA] border border-[#E7DCCD] rounded-[18px] p-6">
            {googleConnected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#DCEFE4] flex items-center justify-center">
                    <CheckCircle size={20} className="text-[#1E6B4A]" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#0A1D35]">Google Calendar connecté</div>
                    {googleCalendarId && (
                      <div className="text-xs text-[#56627A] mt-0.5">{googleCalendarId}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={disconnectGoogle}
                  className="flex items-center gap-1.5 text-sm text-[#9B2C1F] border border-[#F7DDD8] bg-[#F7DDD8] px-3 py-2 rounded-[10px] hover:bg-[#f0ccc5] transition-colors"
                >
                  <Unlink size={14} /> Déconnecter
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#F7F2EB] border border-[#E7DCCD] flex items-center justify-center">
                    <Calendar size={18} className="text-[#56627A]" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-[#0A1D35]">Non connecté</div>
                    <div className="text-xs text-[#56627A] mt-0.5">Les RDVs utiliseront Jitsi en fallback</div>
                  </div>
                </div>
                <button
                  onClick={connectGoogle}
                  disabled={connecting}
                  className="flex items-center gap-1.5 bg-[#0A1D35] text-white text-sm font-semibold px-4 py-2 rounded-[12px] hover:bg-[#1C3352] transition-colors disabled:opacity-50"
                >
                  {connecting ? 'Redirection…' : 'Connecter Google'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section Horaires */}
        <div>
          <h2 className="text-base font-bold text-[#0A1D35] mb-1">Horaires d'ouverture</h2>
          <p className="text-sm text-[#56627A] mb-4">Les jours non actifs ne proposent aucun créneau.</p>
          <div className="bg-[#FFFDFA] border border-[#E7DCCD] rounded-[18px] divide-y divide-[#E7DCCD] mb-6">
            {horaires.sort((a, b) => a.jour - b.jour).map(h => (
              <div key={h.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-28 font-semibold text-sm text-[#0A1D35]">{JOURS[h.jour]}</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={h.actif} onChange={e => update(h.id, 'actif', e.target.checked)} className="w-4 h-4 accent-[#0A1D35]" />
                  <span className="text-sm text-[#56627A]">Ouvert</span>
                </label>
                {h.actif && (
                  <>
                    <input
                      type="time"
                      value={h.ouverture || ''}
                      onChange={e => update(h.id, 'ouverture', e.target.value)}
                      className="border border-[#E7DCCD] rounded-[10px] px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6CAED6]"
                    />
                    <span className="text-[#56627A] text-sm">→</span>
                    <input
                      type="time"
                      value={h.fermeture || ''}
                      onChange={e => update(h.id, 'fermeture', e.target.value)}
                      className="border border-[#E7DCCD] rounded-[10px] px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6CAED6]"
                    />
                  </>
                )}
                {!h.actif && <span className="text-sm text-[#56627A] italic">Fermé</span>}
              </div>
            ))}
          </div>
          <button
            onClick={sauvegarder}
            disabled={saving}
            className="bg-[#0A1D35] text-white font-bold px-8 py-3 rounded-[14px] hover:bg-[#1C3352] transition-colors disabled:opacity-50"
          >
            {saving ? 'Sauvegarde…' : 'Enregistrer les horaires'}
          </button>
        </div>

      </div>
    </AdminLayout>
  );
}
