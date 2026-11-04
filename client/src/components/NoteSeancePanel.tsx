import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useDateLocale, useTimeFormat } from '../hooks/useDateLocale';
import {
  X,
  Pencil,
  Trash2,
  Check,
  Video,
  Bold,
  Italic,
  List,
  Minus,
  Sparkles,
  Loader2,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import type { RendezVous, NoteSeance } from '@synego/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  const lines = html.split('\n');
  let inList = false;
  const result: string[] = [];

  for (const line of lines) {
    if (line.startsWith('- ')) {
      if (!inList) {
        result.push('<ul class="list-disc list-inside space-y-0.5 my-1">');
        inList = true;
      }
      result.push(`<li>${line.slice(2)}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      if (line === '---') {
        result.push('<hr class="border-[#E7DCCD] my-2">');
      } else if (line.startsWith('## ')) {
        result.push(
          `<div class="font-bold text-[#0A1D35] mt-2">${line.slice(3)}</div>`,
        );
      } else if (line) {
        result.push(`<p class="leading-relaxed">${line}</p>`);
      } else {
        result.push('<div class="h-1"></div>');
      }
    }
  }

  if (inList) result.push('</ul>');
  return result.join('');
}

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  before: string,
  after = '',
): { newValue: string; cursorPos: number } {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const newValue =
    value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
  return {
    newValue,
    cursorPos: start + before.length + (end - start) + after.length,
  };
}

function insertLinePrefix(
  textarea: HTMLTextAreaElement,
  prefix: string,
): { newValue: string; cursorPos: number } {
  const value = textarea.value;
  const start = textarea.selectionStart;
  // Find start of current line
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const newValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  return { newValue, cursorPos: start + prefix.length };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  rdv: RendezVous;
  onClose: () => void;
}

// NoteSeance with optional rdv enrichment from the history endpoint
type NoteWithRdv = NoteSeance & {
  rdv?: {
    debut?: string;
    fin?: string;
    prestation?: { nom?: string };
  };
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NoteSeancePanel({ rdv, onClose }: Props) {
  const { t } = useTranslation();
  const dateLocale = useDateLocale();
  const { timeFormat } = useTimeFormat();
  const { token } = useAuth();

  const [notes, setNotes] = useState<NoteWithRdv[]>([]);
  const [contenu, setContenu] = useState('');
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editContenu, setEditContenu] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const draftKey = `draft-note-${rdv.id}`;

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // -------------------------------------------------------------------------
  // Load notes
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!rdv.client_id) return;
    fetch(`/api/admin/clients/${rdv.client_id}/notes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: NoteWithRdv[]) => {
        if (!Array.isArray(data)) return;
        setNotes(data);
        // Pre-fill textarea with draft only if no notes exist for this rdv yet
        const hasExisting = data.some(n => n.rdv_id === rdv.id);
        if (!hasExisting) {
          const draft = localStorage.getItem(draftKey);
          if (draft) {
            setContenu(draft);
            setHasDraft(true);
          }
        }
      });
  }, [rdv.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Auto-grow textarea
  // -------------------------------------------------------------------------
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [contenu]);

  useEffect(() => {
    const ta = editTextareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${ta.scrollHeight}px`;
  }, [editContenu]);

  // -------------------------------------------------------------------------
  // Draft persistence — debounced 400 ms
  // -------------------------------------------------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      if (contenu.trim()) {
        localStorage.setItem(draftKey, contenu);
        setHasDraft(true);
      } else {
        localStorage.removeItem(draftKey);
        setHasDraft(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [contenu, draftKey]);

  // -------------------------------------------------------------------------
  // Keyboard shortcut Ctrl/Cmd + Enter
  // -------------------------------------------------------------------------
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        ajouter();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }); // intentionally re-registers each render so it closes over latest contenu/saving

  // -------------------------------------------------------------------------
  // Toolbar helpers
  // -------------------------------------------------------------------------
  const applyFormat = useCallback(
    (before: string, after = '') => {
      const ta = textareaRef.current;
      if (!ta) return;
      const { newValue, cursorPos } = insertAtCursor(ta, before, after);
      setContenu(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [],
  );

  const applyLinePrefix = useCallback((prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { newValue, cursorPos } = insertLinePrefix(ta, prefix);
    setContenu(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    });
  }, []);

  const appendTemplate = useCallback((block: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const val = ta.value;
    const separator = val && !val.endsWith('\n') ? '\n' : '';
    const newValue = val + separator + block;
    setContenu(newValue);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(newValue.length, newValue.length);
    });
  }, []);

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------
  async function ajouter() {
    if (!contenu.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/rdv/${rdv.id}/note`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ contenu }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotes(prev => [data, ...prev]);
      setContenu('');
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      toast.success(t('noteSeance.enregistrer'));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('common.erreur'));
    } finally {
      setSaving(false);
    }
  }

  async function modifier(id: number) {
    try {
      const res = await fetch(`/api/admin/notes/${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ contenu: editContenu }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...data } : n)));
      setEditId(null);
      toast.success(t('noteSeance.modifie'));
    } catch {
      toast.error(t('common.erreur'));
    }
  }

  async function supprimer(id: number) {
    if (!confirm(t('noteSeance.supprimer'))) return;
    try {
      await fetch(`/api/admin/notes/${id}`, { method: 'DELETE', headers });
      setNotes(prev => prev.filter(n => n.id !== id));
      toast.success(t('noteSeance.supprime'));
    } catch {
      toast.error(t('common.erreur'));
    }
  }

  async function importerGemini() {
    setGeminiLoading(true);
    try {
      const res = await fetch(`/api/admin/rdv/${rdv.id}/find-resume`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      } else {
        toast(t('noteSeance.geminiIntrouvable'), { icon: '🔍' });
      }
    } catch {
      toast.error(t('common.erreur'));
    } finally {
      setGeminiLoading(false);
    }
  }

  // -------------------------------------------------------------------------
  // Derived state
  // -------------------------------------------------------------------------
  const clientName = rdv.client
    ? `${rdv.client.prenom} ${rdv.client.nom}`
    : 'Client';

  const sessionNotes = notes.filter(n => n.rdv_id === rdv.id);

  // History: all other notes grouped by rdv_id, sorted newest first
  const historyNotes = notes.filter(n => n.rdv_id !== rdv.id);
  const grouped = historyNotes.reduce<Record<number, NoteWithRdv[]>>((acc, n) => {
    if (!acc[n.rdv_id]) acc[n.rdv_id] = [];
    acc[n.rdv_id].push(n);
    return acc;
  }, {});
  const groupedEntries = Object.entries(grouped)
    .map(([rdvId, groupNotes]) => ({
      rdvId: Number(rdvId),
      notes: groupNotes,
      debut: groupNotes[0]?.rdv?.debut,
      prestation: groupNotes[0]?.rdv?.prestation?.nom,
    }))
    .sort((a, b) => {
      if (!a.debut && !b.debut) return 0;
      if (!a.debut) return 1;
      if (!b.debut) return -1;
      return new Date(b.debut).getTime() - new Date(a.debut).getTime();
    });

  const isPast = new Date(rdv.debut) < new Date();

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="bg-[#FFFDFA] rounded-[22px] w-full max-w-4xl h-[90vh] flex flex-col shadow-[0_32px_80px_-12px_rgba(10,29,53,0.28)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Gradient accent bar */}
        <div className="flex-none h-1 bg-gradient-to-r from-[#6CAED6] to-[#0A1D35]" />

        {/* ------------------------------------------------------------------ */}
        {/* HEADER                                                              */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex-none border-b border-[#E7DCCD] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 min-w-0 flex-1">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#6CAED6] flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-white text-sm font-bold leading-none">
                  {clientName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>

              <div className="min-w-0 flex-1">
                {/* Top label */}
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#56627A] mb-0.5">
                  {t('noteSeance.titre')}
                </p>
                {/* Client name */}
                <h2 className="text-lg font-bold text-[#0A1D35] truncate">{clientName}</h2>
                {/* Date + prestation */}
                <p className="text-xs text-[#56627A] capitalize mt-0.5">
                  {format(
                    new Date(rdv.debut),
                    `EEEE d MMMM yyyy '${t('common.at')}' ${timeFormat}`,
                    { locale: dateLocale },
                  )}{' '}
                  · {rdv.prestation?.nom || rdv.titre || ''}
                </p>

                {/* Motif */}
                {rdv.commentaire && (
                  <div className="mt-3 bg-[#F7F2EB] border-l-2 border-[#6CAED6] rounded-r-[10px] px-4 py-2.5 max-w-lg">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#56627A] mb-1">
                      {t('noteSeance.motif')}
                    </p>
                    <p className="text-xs text-[#0A1D35] leading-relaxed">{rdv.commentaire}</p>
                  </div>
                )}

                {/* Meet link */}
                {rdv.lien_meet && (
                  <a
                    href={rdv.lien_meet}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 bg-[#0A1D35] text-white text-xs font-bold px-4 py-2 rounded-[10px] hover:bg-[#1C3352] transition-colors shadow-sm"
                  >
                    <Video size={13} />
                    {t('noteSeance.rejoindre')}
                  </a>
                )}
              </div>
            </div>

            {/* Close */}
            <button
              onClick={onClose}
              className="flex-none w-8 h-8 flex items-center justify-center text-[#56627A] hover:text-[#0A1D35] hover:bg-[#F7F2EB] rounded-lg transition-colors"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* BODY — two columns                                                 */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* ================================================================ */}
          {/* LEFT — Editor + current-session notes                            */}
          {/* ================================================================ */}
          <div className="flex flex-col flex-[3] min-w-0 overflow-y-auto border-r border-[#E7DCCD] bg-white">
            {/* ---- Toolbar ---- */}
            <div className="flex-none mx-5 mt-4 mb-2 bg-[#F7F2EB] rounded-xl px-3 py-2 flex items-center gap-1 flex-wrap">
              {/* Formatting buttons */}
              <div className="flex items-center gap-0.5 mr-2">
                <button
                  type="button"
                  title="Gras"
                  onClick={() => applyFormat('**', '**')}
                  className="text-[#56627A] hover:bg-white hover:shadow-sm hover:text-[#0A1D35] rounded-lg p-1.5 transition-all"
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  title="Italique"
                  onClick={() => applyFormat('*', '*')}
                  className="text-[#56627A] hover:bg-white hover:shadow-sm hover:text-[#0A1D35] rounded-lg p-1.5 transition-all"
                >
                  <Italic size={14} />
                </button>
                <button
                  type="button"
                  title="Puce"
                  onClick={() => applyLinePrefix('- ')}
                  className="text-[#56627A] hover:bg-white hover:shadow-sm hover:text-[#0A1D35] rounded-lg p-1.5 transition-all"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  title="Séparateur"
                  onClick={() => appendTemplate('\n---\n')}
                  className="text-[#56627A] hover:bg-white hover:shadow-sm hover:text-[#0A1D35] rounded-lg p-1.5 transition-all"
                >
                  <Minus size={14} />
                </button>
              </div>

              {/* Divider */}
              <div className="w-px h-5 bg-[#E7DCCD] mr-2" />

              {/* Template buttons */}
              <button
                type="button"
                onClick={() => appendTemplate('\n**Objectif :**\n')}
                className="text-xs bg-white border border-[#E7DCCD] shadow-sm px-2.5 py-1 rounded-full hover:border-[#6CAED6] text-[#56627A] transition-all whitespace-nowrap"
              >
                {t('noteSeance.templateObjectif')}
              </button>
              <button
                type="button"
                onClick={() => appendTemplate('\n**Points abordés :**\n- ')}
                className="text-xs bg-white border border-[#E7DCCD] shadow-sm px-2.5 py-1 rounded-full hover:border-[#6CAED6] text-[#56627A] transition-all whitespace-nowrap"
              >
                {t('noteSeance.templatePoints')}
              </button>
              <button
                type="button"
                onClick={() => appendTemplate('\n**Progrès :**\n')}
                className="text-xs bg-white border border-[#E7DCCD] shadow-sm px-2.5 py-1 rounded-full hover:border-[#6CAED6] text-[#56627A] transition-all whitespace-nowrap"
              >
                {t('noteSeance.templateProgres')}
              </button>
              <button
                type="button"
                onClick={() => appendTemplate('\n**À travailler :**\n- ')}
                className="text-xs bg-white border border-[#E7DCCD] shadow-sm px-2.5 py-1 rounded-full hover:border-[#6CAED6] text-[#56627A] transition-all whitespace-nowrap"
              >
                {t('noteSeance.templateATravail')}
              </button>
            </div>

            {/* ---- Textarea ---- */}
            <div className="relative px-5 pb-2">
              <div className="relative shadow-sm rounded-[12px]">
                <textarea
                  ref={textareaRef}
                  value={contenu}
                  onChange={e => setContenu(e.target.value)}
                  onInput={() => {
                    const ta = textareaRef.current;
                    if (!ta) return;
                    ta.style.height = 'auto';
                    ta.style.height = `${ta.scrollHeight}px`;
                  }}
                  placeholder={t('noteSeance.placeholder')}
                  rows={5}
                  className="w-full border border-[#E7DCCD] rounded-[12px] p-3.5 pb-8 text-sm focus:outline-none focus:ring-4 focus:ring-[#6CAED6]/30 focus:border-[#6CAED6] resize-none bg-white leading-relaxed text-[#0A1D35] placeholder:text-[#A0A9B8] transition-all"
                  style={{ minHeight: '120px', overflowY: 'hidden' }}
                />
                {/* Draft badge */}
                {hasDraft && (
                  <span className="absolute bottom-3 right-3 text-[10px] font-semibold bg-[#F7F2EB] border border-[#E7DCCD] text-[#56627A] px-2 py-0.5 rounded-full pointer-events-none">
                    {t('noteSeance.brouillon')}
                  </span>
                )}
              </div>
            </div>

            {/* ---- Action row ---- */}
            <div className="flex items-center gap-3 px-5 pb-5">
              <button
                onClick={ajouter}
                disabled={!contenu.trim() || saving}
                className="flex items-center gap-2 bg-[#0A1D35] text-white font-bold px-5 py-2.5 rounded-[12px] text-sm hover:bg-[#1C3352] transition-colors shadow-md disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {saving ? t('noteSeance.enregistrement') : t('noteSeance.enregistrer')}
              </button>

              {/* Gemini button — past sessions only */}
              {isPast && (
                <button
                  onClick={importerGemini}
                  disabled={geminiLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-[#F7F2EB] to-white border border-[#E7DCCD] text-[#56627A] px-3.5 py-2.5 rounded-[12px] hover:border-[#6CAED6] transition-all disabled:opacity-50"
                >
                  {geminiLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Sparkles size={13} className="text-[#6CAED6]" />
                  )}
                  {t('noteSeance.importerGemini')}
                </button>
              )}

              <span className="ml-auto text-[10px] font-mono text-[#A0A9B8] bg-[#F7F2EB] border border-[#E7DCCD] px-2 py-1 rounded-md">
                Ctrl+↵
              </span>
            </div>

            {/* ---- Notes for this session ---- */}
            <div className="px-5 pb-6 space-y-3">
              {sessionNotes.length === 0 && (
                <p className="text-sm text-[#56627A] text-center py-4 italic">
                  {t('noteSeance.aucunResume')}
                </p>
              )}
              {sessionNotes.map(n => (
                <div key={n.id} className="bg-white border-l-2 border-[#6CAED6] border border-[#EDE6DA] rounded-[12px] p-4 shadow-sm">
                  {editId === n.id ? (
                    <div className="space-y-2">
                      <textarea
                        ref={editTextareaRef}
                        value={editContenu}
                        onChange={e => setEditContenu(e.target.value)}
                        onInput={() => {
                          const ta = editTextareaRef.current;
                          if (!ta) return;
                          ta.style.height = 'auto';
                          ta.style.height = `${ta.scrollHeight}px`;
                        }}
                        rows={4}
                        className="w-full border border-[#E7DCCD] rounded-[10px] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6CAED6] resize-none bg-white"
                        style={{ overflowY: 'hidden' }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => modifier(n.id)}
                          className="flex items-center gap-1 bg-[#1E6B4A] text-white text-xs font-bold px-3 py-1.5 rounded-[8px] hover:bg-[#17563C] transition-colors"
                        >
                          <Check size={12} />
                          {t('noteSeance.enregistrer')}
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="text-xs text-[#56627A] px-3 py-1.5 border border-[#E7DCCD] rounded-[8px] hover:bg-[#F7F2EB] transition-colors"
                        >
                          {t('prestations.annuler')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="text-sm text-[#0A1D35] leading-relaxed prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(n.contenu) }}
                      />
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#F7F2EB]">
                        <span className="text-[10px] text-[#A0A9B8] font-medium">
                          {n.created_at
                            ? format(
                                new Date(n.created_at),
                                `d MMM yyyy '${t('common.at')}' ${timeFormat}`,
                                { locale: dateLocale },
                              )
                            : ''}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditId(n.id);
                              setEditContenu(n.contenu);
                            }}
                            className="text-[#56627A] hover:text-[#0A1D35] transition-colors p-1.5 rounded-lg hover:bg-[#F7F2EB]"
                            title={t('noteSeance.modifie')}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => supprimer(n.id)}
                            className="text-[#9B2C1F] hover:opacity-70 transition-opacity p-1.5 rounded-lg hover:bg-[#F7F2EB]"
                            title={t('noteSeance.supprimer')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ================================================================ */}
          {/* RIGHT — Client history (hidden on small screens)                 */}
          {/* ================================================================ */}
          <div className="hidden md:flex flex-col flex-[2] min-w-0 overflow-y-auto bg-[#FAFAF8]">
            {/* History header */}
            <div className="flex-none px-5 pt-4 pb-3 bg-[#F7F2EB] border-b border-[#E7DCCD]">
              <p className="text-xs font-bold uppercase tracking-widest text-[#56627A]">
                {t('noteSeance.historique')} — {clientName}
              </p>
            </div>

            <div className="flex-1 px-5 py-4 space-y-5">
              {groupedEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-full bg-[#EDE6DA] flex items-center justify-center mb-3">
                    <Pencil size={20} className="text-[#A0A9B8]" />
                  </div>
                  <p className="text-sm text-[#56627A] italic">
                    {t('noteSeance.aucunHistorique')}
                  </p>
                  <p className="text-xs text-[#A0A9B8] mt-1">
                    Les notes des séances précédentes apparaîtront ici.
                  </p>
                </div>
              ) : (
                groupedEntries.map(group => (
                  <div key={group.rdvId} className="space-y-2">
                    {/* Session header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-white bg-[#0A1D35] px-2 py-0.5 rounded-full">
                        {group.debut
                          ? format(new Date(group.debut), 'd MMM yyyy', {
                              locale: dateLocale,
                            })
                          : `${t('noteSeance.seance')} #${group.rdvId}`}
                      </span>
                      {group.prestation && (
                        <span className="text-xs text-[#56627A]">{group.prestation}</span>
                      )}
                    </div>

                    {/* Notes for this past session */}
                    {group.notes.map(n => (
                      <div
                        key={n.id}
                        className="bg-white rounded-[12px] p-3.5 border border-[#EDE6DA] shadow-sm"
                      >
                        <div
                          className="text-xs text-[#0A1D35] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(n.contenu) }}
                        />
                        {n.created_at && (
                          <p className="text-[10px] text-[#A0A9B8] mt-2 pt-2 border-t border-[#F7F2EB]">
                            {format(
                              new Date(n.created_at),
                              `d MMM yyyy '${t('common.at')}' ${timeFormat}`,
                              { locale: dateLocale },
                            )}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
