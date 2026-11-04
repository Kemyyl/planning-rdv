import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Positionnement du contenu — center (default), end (slide right), bottom-sheet (mobile) */
  align?: 'center' | 'end' | 'bottom-sheet';
  /** Classes supplémentaires pour l'overlay */
  overlayClassName?: string;
}

/**
 * Modal via createPortal → rendu dans document.body, immunisé contre les
 * filter/backdrop-filter/transform des parents qui cassent position: fixed.
 * Verrouille le scroll du body quand ouvert.
 */
export default function Modal({ open, onClose, children, align = 'center', overlayClassName = '' }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const alignClass =
    align === 'end' ? 'items-stretch justify-end'
    : align === 'bottom-sheet' ? 'items-end md:items-center justify-center'
    : 'items-center justify-center';

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex ${alignClass} bg-black/40 backdrop-blur-sm ${overlayClassName}`}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} className="contents">
        {children}
      </div>
    </div>,
    document.body,
  );
}
