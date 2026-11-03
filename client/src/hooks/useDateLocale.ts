import { useTranslation } from 'react-i18next';
import { fr, enUS } from 'date-fns/locale';
import type { Locale } from 'date-fns';

export function useDateLocale(): Locale {
  const { i18n } = useTranslation();
  return i18n.language.startsWith('en') ? enUS : fr;
}

export function useTimeFormat(): { timeFormat: string; atWord: string } {
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');
  return { timeFormat: isEn ? 'h:mm a' : 'HH:mm', atWord: isEn ? 'at' : 'à' };
}
