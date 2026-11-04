import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Circle, PlayCircle, GraduationCap, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useClientAuth } from '../contexts/ClientAuthContext';

interface Module {
  id: string;
  titre: string;
  ordre: number;
  contenu?: string;
  video_url?: string;
  duree_minutes?: number;
}

interface Progres {
  module_id: string;
  termine: boolean;
  termine_at?: string;
}

interface Acces {
  id: string;
  titre: string;
  description?: string;
  image_url?: string;
  modules: Module[];
  progres: Progres[];
}

function youtubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (u.hostname.includes('youtu.be')) {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      return `https://player.vimeo.com/video${u.pathname}`;
    }
    return null;
  } catch { return null; }
}

export default function Apprendre() {
  const { t } = useTranslation();
  const { formationId } = useParams<{ formationId: string }>();
  const navigate = useNavigate();
  const { token } = useClientAuth();
  const [acces, setAcces] = useState<Acces | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!token) { navigate('/login'); return; }
    async function fetchAcces() {
      try {
        const res = await fetch(`/api/client/formations/${formationId}/acces`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 403) toast.error(t('formations.pasDAcces'));
          navigate('/mes-formations');
          return;
        }
        const data = await res.json();
        setAcces(data);
        const modules = (data.modules ?? []).slice().sort((a: Module, b: Module) => a.ordre - b.ordre);
        if (modules.length > 0) setActiveId(modules[0].id);
      } finally {
        setLoading(false);
      }
    }
    fetchAcces();
  }, [formationId, token, navigate]);

  const modulesOrdered = useMemo(() => {
    if (!acces) return [];
    return acces.modules.slice().sort((a, b) => a.ordre - b.ordre);
  }, [acces]);

  const progresMap = useMemo(() => {
    const m = new Map<string, boolean>();
    (acces?.progres ?? []).forEach(p => m.set(p.module_id, p.termine));
    return m;
  }, [acces]);

  const activeModule = modulesOrdered.find(m => m.id === activeId) ?? null;
  const activeIdx = modulesOrdered.findIndex(m => m.id === activeId);
  const nbTermines = modulesOrdered.filter(m => progresMap.get(m.id)).length;
  const progressPct = modulesOrdered.length > 0 ? Math.round((nbTermines / modulesOrdered.length) * 100) : 0;

  async function marquerTermine(moduleId: string) {
    if (!token) return;
    setMarking(true);
    try {
      const res = await fetch(`/api/client/formations/${formationId}/modules/${moduleId}/terminer`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setAcces(prev => {
        if (!prev) return prev;
        const existing = prev.progres.filter(p => p.module_id !== moduleId);
        return {
          ...prev,
          progres: [...existing, { module_id: moduleId, termine: true, termine_at: new Date().toISOString() }],
        };
      });
      toast.success(t('formations.moduleTermineOk'));
      const next = modulesOrdered[activeIdx + 1];
      if (next) setActiveId(next.id);
    } catch {
      toast.error(t('formations.erreurMaj'));
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F2EB] flex items-center justify-center">
        <div className="text-[#56627A] text-sm">{t('common.chargement')}</div>
      </div>
    );
  }

  if (!acces) {
    return (
      <div className="min-h-screen bg-[#F7F2EB] flex items-center justify-center p-6">
        <div className="text-center">
          <GraduationCap size={28} className="text-[#A8B8C8] mx-auto mb-3" />
          <p className="text-[#0A1D35] font-semibold mb-2">{t('formations.introuvable')}</p>
          <Link to="/mes-formations" className="text-sm text-[#6CAED6] hover:underline">
            ← {t('formations.mesFormations')}
          </Link>
        </div>
      </div>
    );
  }

  const embedUrl = activeModule?.video_url ? youtubeEmbed(activeModule.video_url) : null;

  return (
    <div className="min-h-screen bg-[#F7F2EB] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white border-r border-[#E7DCCD] shrink-0 flex flex-col">
        <div className="px-5 py-4 border-b border-[#E7DCCD]">
          <Link to="/mes-formations" className="inline-flex items-center gap-1.5 text-xs text-[#56627A] hover:text-[#0A1D35] mb-3">
            <ArrowLeft size={12} /> {t('formations.mesFormations')}
          </Link>
          <h2 className="font-bold text-[#0A1D35] text-base leading-snug">{acces.titre}</h2>
          {/* Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-[#56627A] mb-1">
              <span>{t('formations.progression')}</span>
              <span className="font-bold text-[#0A1D35]">{nbTermines}/{modulesOrdered.length} ({progressPct}%)</span>
            </div>
            <div className="h-1.5 bg-[#F7F2EB] rounded-full overflow-hidden">
              <div className="h-full bg-[#1E6B4A] transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-auto py-2">
          {modulesOrdered.length === 0 ? (
            <div className="px-5 py-8 text-center text-xs text-[#A8B8C8]">
              <BookOpen size={20} className="mx-auto mb-2" />
              {t('formations.aucunModule')}
            </div>
          ) : (
            modulesOrdered.map((m, idx) => {
              const termine = progresMap.get(m.id);
              const active = m.id === activeId;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveId(m.id)}
                  className={`w-full text-left px-5 py-3 flex items-start gap-3 border-l-2 transition-colors ${
                    active
                      ? 'bg-[#F7F2EB] border-[#0A1D35]'
                      : 'border-transparent hover:bg-[#FAFAFA]'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {termine
                      ? <CheckCircle size={16} className="text-[#1E6B4A]" />
                      : <Circle size={16} className="text-[#A8B8C8]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[11px] font-bold ${active ? 'text-[#0A1D35]' : 'text-[#A8B8C8]'}`}>
                      {t('formations.module')} {idx + 1}
                    </div>
                    <div className={`text-sm leading-snug truncate ${active ? 'font-semibold text-[#0A1D35]' : 'text-[#56627A]'}`}>
                      {m.titre}
                    </div>
                    {m.duree_minutes != null && (
                      <div className="text-[11px] text-[#A8B8C8] mt-0.5">{m.duree_minutes} min</div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {activeModule ? (
          <div className="max-w-3xl mx-auto px-6 py-10">
            <div className="text-xs text-[#A8B8C8] font-bold uppercase tracking-widest mb-2">
              {t('formations.module')} {activeIdx + 1} / {modulesOrdered.length}
            </div>
            <h1 className="text-2xl font-extrabold text-[#0A1D35] mb-6">{activeModule.titre}</h1>

            {/* Video */}
            {embedUrl ? (
              <div className="aspect-video bg-black rounded-[14px] overflow-hidden mb-6 border border-[#E7DCCD]">
                <iframe
                  src={embedUrl}
                  title={activeModule.titre}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            ) : activeModule.video_url ? (
              <div className="bg-white border border-[#E7DCCD] rounded-[14px] p-5 mb-6 flex items-center gap-3">
                <PlayCircle size={22} className="text-[#6CAED6] shrink-0" />
                <a
                  href={activeModule.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#0A1D35] font-semibold hover:underline break-all"
                >
                  {activeModule.video_url}
                </a>
              </div>
            ) : null}

            {/* Content */}
            {activeModule.contenu && (
              <div className="bg-white border border-[#E7DCCD] rounded-[14px] p-6 mb-6">
                <div className="text-sm text-[#0A1D35] leading-relaxed whitespace-pre-wrap">{activeModule.contenu}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 border-t border-[#E7DCCD] pt-6">
              <button
                onClick={() => activeIdx > 0 && setActiveId(modulesOrdered[activeIdx - 1].id)}
                disabled={activeIdx === 0}
                className="inline-flex items-center gap-1.5 text-sm text-[#56627A] font-semibold border border-[#E7DCCD] bg-white px-4 py-2 rounded-[10px] disabled:opacity-40 hover:bg-[#F7F2EB] transition-colors"
              >
                <ArrowLeft size={14} /> {t('formations.precedent')}
              </button>

              {progresMap.get(activeModule.id) ? (
                <div className="inline-flex items-center gap-1.5 text-sm text-[#1E6B4A] font-bold">
                  <CheckCircle size={14} /> {t('formations.moduleTermine')}
                </div>
              ) : (
                <button
                  onClick={() => marquerTermine(activeModule.id)}
                  disabled={marking}
                  className="inline-flex items-center gap-1.5 bg-[#1E6B4A] text-white font-bold text-sm px-5 py-2.5 rounded-[10px] hover:bg-[#17563C] transition-colors disabled:opacity-50"
                >
                  <CheckCircle size={14} /> {marking ? t('formations.enregistrement') : t('formations.marquerTermine')}
                </button>
              )}

              <button
                onClick={() => activeIdx < modulesOrdered.length - 1 && setActiveId(modulesOrdered[activeIdx + 1].id)}
                disabled={activeIdx >= modulesOrdered.length - 1}
                className="inline-flex items-center gap-1.5 text-sm text-[#56627A] font-semibold border border-[#E7DCCD] bg-white px-4 py-2 rounded-[10px] disabled:opacity-40 hover:bg-[#F7F2EB] transition-colors"
              >
                {t('formations.suivant')} <ArrowLeft size={14} className="rotate-180" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full p-10 text-center">
            <div>
              <BookOpen size={28} className="text-[#A8B8C8] mx-auto mb-3" />
              <p className="text-[#56627A]">{t('formations.selectionnerModule')}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
