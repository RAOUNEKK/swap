import { Moon, Sun, Languages } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useI18n } from '@/context/I18nContext';

export function ToggleControls({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useI18n();

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={toggleLang}
        className={`flex items-center gap-1.5 rounded-full border-2 border-app-border bg-app-surface px-2.5 py-1.5 text-xs font-black text-app-text transition-all hover:bg-[var(--app-accent)] hover:text-ink-900 ${compact ? '' : 'min-w-[60px] justify-center'}`}
        title={lang === 'en' ? 'العربية' : 'English'}
      >
        <Languages className="h-3.5 w-3.5" />
        <span>{lang === 'en' ? 'AR' : 'EN'}</span>
      </button>
      <button
        onClick={toggleTheme}
        className="flex items-center justify-center rounded-full border-2 border-app-border bg-app-surface p-2 text-app-text transition-all hover:bg-[var(--app-accent)] hover:text-ink-900"
        title={theme === 'dark' ? t('light_mode') : t('dark_mode')}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </div>
  );
}
