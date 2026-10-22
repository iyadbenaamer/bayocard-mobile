import axiosClient from "./api";

/**
 * Look up a recipient by phone and preview the fee/total for a balance
 * exchange, without making any changes.
 * @param {Object} payload {phone, amount}
 */
export const previewExchange = async ({ phone, amount }) => {
  const response = await axiosClient.post("/exchange/preview", { phone, amount });
  return response.data;
};

/**
 * Execute a balance exchange to another user by phone number.
 * @param {Object} payload {phone, amount, exchangeKey}
 */
export const sendExchange = async ({ phone, amount, exchangeKey }) => {
  const response = await axiosClient.post("/exchange/send", {
    phone,
    amount,
    exchangeKey,
  });
  return response.data;
};
