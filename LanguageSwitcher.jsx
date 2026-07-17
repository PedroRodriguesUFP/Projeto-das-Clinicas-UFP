import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'pt', label: '🇵🇹 PT' },
  { code: 'en', label: '🇬🇧 EN' },
  { code: 'fr', label: '🇫🇷 FR' },
];

export function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const activeLanguage = i18n.language?.split('-')[0] || 'pt';

  const handleLanguageChange = (language) => {
    if (activeLanguage === language) return;
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  };

  return (
    <div className={`language-switcher ${className}`.trim()}>
      {languages.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          className={`language-option ${activeLanguage === code ? 'active' : ''}`}
          onClick={() => handleLanguageChange(code)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
