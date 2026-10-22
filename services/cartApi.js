import axiosClient from "./api";

/**
 * Check availability of items in the cart.
 * @param {Array<{tierId: string, quantity: number}>} items
 * @returns {Promise<Array<{tierId: string, requested: number, available: number}>>}
 */
export const checkCartAvailability = async (items) => {
  const response = await axiosClient.post("/card-tiers/availability", {
    items,
  });
  return response.data;
};

/**
 * Checkout the items in the cart.
 * @param {Array<{tierId: string, quantity: number}>} items
 * @param {string} checkoutKey - Idempotency key identifying this checkout attempt.
 *   Reusing the same key on a retry lets the server replay the original
 *   result instead of creating a duplicate order if both requests race.
 * @returns {Promise<{cards: Array, balance: number, partialFailure: boolean}>}
 */
export const checkoutCartLocally = async (items, checkoutKey) => {
  const response = await axiosClient.post("/orders/checkout", {
    items,
    checkoutKey,
  });
  return response.data;
};
