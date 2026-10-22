const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("ar", {
    numberingSystem: "latn",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
};

export const formatExpiryDate = (dateString, showDay = true) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date)) return "";

  if (showDay) {
    // Built manually rather than via Intl.DateTimeFormat("ar", ...): ICU
    // inserts invisible RLM (U+200F) marks between the date components for
    // that locale, which conflict with the forced-LTR wrapping this value
    // gets everywhere it's displayed (see the `ltr`/`direction: "ltr"`
    // styling at every call site), scrambling the visual digit order.
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } else {
    // Format as mm/yy
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${year}`;
  }
};

export default formatDate;
