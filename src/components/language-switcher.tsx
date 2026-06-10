import React from 'react';
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const change = (lng: string) => i18n.changeLanguage(lng);
  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={() => change('it')}
        className={`px-2 py-1 rounded ${i18n.language === 'it' ? 'bg-lime text-lime-foreground' : 'bg-background text-muted-foreground'}`}
      >IT</button>
      <button
        onClick={() => change('en')}
        className={`px-2 py-1 rounded ${i18n.language === 'en' ? 'bg-lime text-lime-foreground' : 'bg-background text-muted-foreground'}`}
      >EN</button>
    </div>
  );
}
