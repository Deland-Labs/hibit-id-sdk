export const languages = {
  'en': 'English',
  'cnt': '繁體中文',
  'ja': '日本語',
  'ru': 'Русский',
  // kr: '한국인',
  // tr: 'Türkçe',
  // fr: 'Français',
  // pt: 'Português',
  // es: 'Español'
};

export type Language = keyof typeof languages;

export const getSystemLang = (): Language => {
  const language = window.navigator.language
  const [region, lang] = language.split('-');
  if (lang === 'zh' && (region === 'TW' || region === 'HK')) {
    return 'cnt'
  }
  if (Object.keys(languages).includes(region)) {
    return region as Language;
  }
  return 'en'
}
