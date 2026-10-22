export const isValidLocalPhoneNumber = (phone) =>
  /^(?:09\d{8}|9\d{8})$/.test(phone);

export const normalizeLocalPhoneNumber = (phone) =>
  /^9\d{8}$/.test(phone) ? `0${phone}` : phone;
