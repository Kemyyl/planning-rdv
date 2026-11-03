import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useDateLocale } from '../hooks/useDateLocale';
import { X, Send, Pencil, Trash2, Check, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import type { RendezVous, NoteSeance } from '@synego/shared';

interface Props {
  rdv: RendezVous;
  onClose: () => void;
}

export default function NoteSeancePanel({ rdv, onClose }: Props) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { token } = useAuth();
  const [notes, setNotes] = useState<NoteSeance[]>([]);
  const [contenu, setContenu] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editContenu, setEditContenu] = useState('');

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    if (!rdv.client_id) return;
    fetch(`/api/admin/clients/${rdv.client_id}/notes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setNotes(Array.isArray(data) ? data.filter((n: NoteSeance) => n.rdv_id === rdv.id) : []));
  }, [rdv.id]);

  async function ajouter() {
    if (!contenu.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/rdv/${rdv.id}/note`, {
        method: 'POST', headers,
        body: JSON.stringify({ contenu }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotes(prev => [data, ...prev]);
      setContenu('');
      toast.success(t('noteSeance.enregistrement'));
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Erreur'); }
    finally { setSaving(false); }
  }

  async function modifier(id: string) {
    try {
      const res = await fetch(`/api/admin/notes/${id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ contenu: editContenu }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotes(prev => prev.map(n => n.id === id ? data : n));
      setEditId(null);
      toast.success('Modifié');
    } catch { toast.error('Erreur'); }
  }

  async function supprimer(id: string) {
    if (!confirm(t('noteSeance.supprimer'))) return;
    await fetch(`/api/admin/notes/${id}`, { method: 'DELETE', headers });
    setNotes(prev => prev.filter(n => n.id !== id));
    toast.success('Supprimé');
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#FFFDFA] rounded-[22px] w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#E7DCCD]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#56627A] mb-1">{t('noteSeance.titre')}</p>
            <h3 className="font-bold text-[#0A1D35]">
              {rdv.client ? `${rdv.client.prenom} ${rdv.client.nom}` : 'Client'}
            </h3>
            <p className="text-xs text-[#56627A] capitalize mt-0.5">
              {format(new Date(rdv.debut), `EEEE d MMMM yyyy '${t('common.at')}' HH:mm`, { locale: dateLocale })} · {rdv.prestation?.nom}
            </p>
            {rdv.commentaire && (
              <div className="mt-3 bg-[#F7F2EB] border border-[#E7DCCD] rounded-[10px] px-4 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#56627A] mb-1">{t('noteSeance.motif')}</p>
                <p className="text-xs text-[#0A1D35] leading-relaxed">{rdv.commentaire}</p>
              </div>
            )}
            {rdv.lien_meet && (
              <a
                href={rdv.lien_meet}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-2 bg-[#0A1D35] text-white text-xs font-bold px-4 py-2 rounded-[10px] hover:bg-[#1C3352] transition-colors"
              >
                <Video size={13} /> {t('noteSeance.rejoindre')}
              </a>
            )}
          </div>
          <button onClick={onClose} className="text-[#56627A] hover:text-[#0A1D35]"><X size={20} /></button>
        </div>

        {/* Notes existantes */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {notes.length === 0 && (
            <p className="text-sm text-[#56627A] text-center py-4">{t('noteSeance.aucunResume')}</p>
          )}
          {notes.map(n => (
            <div key={n.id} className="bg-[#F7F2EB] rounded-[14px] p-4">
              {editId === n.id ? (
                <div className="space-y-2">
                  <textarea value={editContenu} onChange={e => setEditContenu(e.target.value)} rows={4}
                    className="w-full border border-[#E7DCCD] rounded-[10px] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] resize-none bg-white" />
                  <div className="flex gap-2">
                    <button onClick={() => modifier(n.id)} className="flex items-center gap-1 bg-[#1E6B4A] text-white text-xs font-bold px-3 py-1.5 rounded-[8px]">
                      <Check size={12} />{t('noteSeance.enregistrer')}
                    </button>
                    <button onClick={() => setEditId(null)} className="text-xs text-[#56627A] px-3 py-1.5 border border-[#E7DCCD] rounded-[8px]">{t('prestations.annuler')}</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-[#0A1D35] leading-relaxed whitespace-pre-wrap">{n.contenu}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-[#56627A]">{format(new Date(n.created_at!), `d MMM yyyy '${t('common.at')}' HH:mm`, { locale: dateLocale })}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditId(n.id); setEditContenu(n.contenu); }} className="text-[#56627A] hover:text-[#0A1D35]"><Pencil size={13} /></button>
                      <button onClick={() => supprimer(n.id)} className="text-[#9B2C1F] hover:opacity-70"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Nouvelle note */}
        <div className="p-5 border-t border-[#E7DCCD]">
          <textarea
            value={contenu}
            onChange={e => setContenu(e.target.value)}
            placeholder={t('noteSeance.placeholder')}
            rows={3}
            className="w-full border border-[#E7DCCD] rounded-[12px] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] resize-none bg-white mb-3"
          />
          <button onClick={ajouter} disabled={!contenu.trim() || saving}
            className="flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-2.5 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors disabled:opacity-40">
            <Send size={14} />
            {saving ? t('noteSeance.enregistrement') : t('noteSeance.enregistrer')}
          </button>
        </div>
      </div>
    </div>
  );
}
