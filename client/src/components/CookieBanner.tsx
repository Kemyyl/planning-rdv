import { useEffect, useState } from 'react';
import { Cookie, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'synego.cookies.choice';

export default function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  function choose(choice: 'accept' | 'refuse') {
    localStorage.setItem(STORAGE_KEY, choice);
    localStorage.setItem(STORAGE_KEY + '.at', new Date().toISOString());
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-[90]">
      <div className="bg-[#0A1D35] text-white rounded-[20px] p-5 shadow-2xl border border-[#1C3352] relative">
        <button
          onClick={() => choose('refuse')}
          className="absolute top-3 right-3 text-[#8FA3B8] hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <X size={16} />
        </button>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-[#1C3352] flex items-center justify-center shrink-0">
            <Cookie size={16} className="text-[#6CAED6]" />
          </div>
          <div className="flex-1">
            <div className="font-display text-lg leading-tight mb-1">
              {t('cookies.titre')}
            </div>
            <p className="text-xs text-[#8FA3B8] leading-relaxed">
              {t('cookies.description')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => choose('accept')}
            className="flex-1 bg-white text-[#0A1D35] text-xs font-bold px-4 py-2.5 rounded-full hover:bg-[#F7F2EB] transition-colors uppercase tracking-wider"
          >
            {t('cookies.accepter')}
          </button>
          <button
            onClick={() => choose('refuse')}
            className="flex-1 bg-transparent border border-[#1C3352] text-[#8FA3B8] text-xs font-bold px-4 py-2.5 rounded-full hover:border-[#8FA3B8] hover:text-white transition-colors uppercase tracking-wider"
          >
            {t('cookies.refuser')}
          </button>
        </div>
      </div>
    </div>
  );
}
