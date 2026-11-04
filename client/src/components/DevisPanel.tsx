import { useState } from 'react';
import { X, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function DevisPanel({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', telephone: '', type: '', message: '' });
  const [sending, setSending] = useState(false);

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/public/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: form.nom, prenom: form.prenom, email: form.email,
          telephone: form.telephone || undefined,
          type_accompagnement: form.type || undefined,
          message: form.message,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(t('devis.succes'));
      onClose();
      setForm({ prenom: '', nom: '', email: '', telephone: '', type: '', message: '' });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('devis.erreur'));
    } finally {
      setSending(false);
    }
  }

  const inputClass = 'w-full border border-[#E7DCCD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] bg-white';
  const labelClass = 'block text-xs font-bold text-[#56627A] uppercase tracking-wide mb-1.5';
  const typeOptions = t('devis.typeOptions', { returnObjects: true }) as string[];

  return (
    <Modal open={open} onClose={onClose} align="bottom-sheet">
      <div className="bg-white w-full max-w-lg rounded-t-[28px] md:rounded-[24px] p-7 max-h-[90vh] overflow-y-auto shadow-2xl m-0 md:m-4">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#0A1D35]">{t('devis.titre')}</h2>
            <p className="text-sm text-[#56627A] mt-1">{t('devis.description')}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[#F7F2EB] text-[#56627A] ml-4 shrink-0">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t('devis.prenom')}</label>
              <input required value={form.prenom} onChange={e => set('prenom', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('devis.nom')}</label>
              <input required value={form.nom} onChange={e => set('nom', e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>{t('devis.email')}</label>
            <input type="email" required value={form.email} onChange={e => set('email', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('devis.telephone')}</label>
            <input type="tel" value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="+33 6 …" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>{t('devis.typeAccompagnement')}</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className={inputClass}>
              <option value="">—</option>
              {typeOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>{t('devis.message')}</label>
            <textarea
              required rows={4} value={form.message}
              onChange={e => set('message', e.target.value)}
              placeholder={t('devis.messagePlaceholder')}
              className="w-full border border-[#E7DCCD] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] bg-white resize-none"
            />
          </div>
          <button
            type="submit" disabled={sending}
            className="w-full flex items-center justify-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-3 rounded-[12px] hover:bg-[#1C3352] transition-colors disabled:opacity-40"
          >
            <Send size={15} /> {sending ? t('devis.envoi') : t('devis.envoyer')}
          </button>
        </form>
      </div>
    </Modal>
  );
}
