const getPath = (dict, key) =>
  key.split(".").reduce((acc, part) => (acc == null ? acc : acc[part]), dict);

const interpolate = (template, params) => {
  if (typeof template !== "string" || !params) {
    return template;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    params[name] === undefined || params[name] === null
      ? match
      : String(params[name]),
  );
};

// Falls back to the Arabic dictionary (the app's original language, so it is
// always complete) whenever a key is missing from the active locale, and
// finally to the key itself so a missing translation is visible instead of
// crashing the screen.
export const createTranslator = (dictionaries, locale, fallbackLocale = "ar") => {
  const dict = dictionaries[locale] || dictionaries[fallbackLocale];
  const fallbackDict = dictionaries[fallbackLocale];

  return (key, params) => {
    const template = getPath(dict, key) ?? getPath(fallbackDict, key) ?? key;
    return interpolate(template, params);
  };
};
