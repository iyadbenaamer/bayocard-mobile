import axiosClient from "./api";

/**
 * Fetch the active payment methods available for wallet top-ups.
 * @returns {Promise<{paymentMethods: Array}>}
 */
export const getPaymentMethods = async () => {
  const response = await axiosClient.get("/wallet/payment-methods");
  return response.data;
};

/**
 * Register a pay.net.ly hosted payment for a wallet top-up.
 * @param {Object} payload {paymentMethodId, amount}
 * @returns {Promise<{paymentRef: string, paymentUrl: string, amount: number}>}
 */
export const openTopup = async (payload) => {
  const response = await axiosClient.post("/wallet/topup", payload);
  return response.data;
};

/**
 * Poll a top-up payment's current status. The server reconciles it against
 * pay.net.ly's receipt endpoint on each call, so this resolves correctly even
 * before (or without) a webhook delivery.
 * @param {string} paymentRef
 * @returns {Promise<{paymentRef: string, status: string, amount: number}>}
 */
export const getTopup = async (paymentRef) => {
  const response = await axiosClient.get(
    `/wallet/topup/${encodeURIComponent(paymentRef)}`,
  );
  return response.data;
};

/**
 * Delete a top-up link after the user dismisses the payment screen. Completed
 * payments remain paid.
 * @param {string} paymentRef
 */
export const cancelTopup = async (paymentRef) => {
  const response = await axiosClient.delete(
    `/wallet/topup/${encodeURIComponent(paymentRef)}`,
  );
  return response.data;
};
