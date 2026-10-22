// The backend returns bilingual { ar, en } objects for card-catalog
// name/title fields (card type name, card tier title, card category name,
// and the order/transaction line items that snapshot a tier's title) instead
// of a plain string. The app has a real language switcher (see
// hooks/use-locale.js), so this must respect the caller's current `locale`
// ("ar" or "en") rather than always preferring Arabic. Falls back to the
// other language only if the preferred one is somehow empty (one of the two
// is required server-side, so this should rarely happen), and passes plain
// strings through unchanged so it's also safe to call on values that were
// already flattened to a string (e.g. cart items persisted by redux-persist
// from before this shape existed).
const getLocalizedText = (value, locale = "ar") => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const preferred = locale === "en" ? value.en : value.ar;
    const fallback = locale === "en" ? value.ar : value.en;
    return preferred || fallback || "";
  }
  return String(value);
};

export default getLocalizedText;
