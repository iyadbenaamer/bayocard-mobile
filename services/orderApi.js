import axiosClient from "./api";

const DEFAULT_PAGE_SIZE = 15;

/**
 * Fetch the user's purchase history (grouped by orders)
 * @param {Object} params containing page, limit, etc.
 * @returns {Promise<{orders: Array, pagination: Object}>} paginated orders
 */
export const getPurchaseHistory = async ({
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
} = {}) => {
  const params = { page, limit };
  const response = await axiosClient.get("/orders", { params });
  return response.data;
};

/**
 * Fetch a single order by ID
 * @param {string} id The order ID
 * @returns {Promise<Object>} order details
 */
export const getOrderById = async (id) => {
  const response = await axiosClient.get(`/orders/${id}`);
  return response.data;
};
