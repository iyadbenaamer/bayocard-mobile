import axiosClient from "./api";

const DEFAULT_PAGE_SIZE = 15;

export const getUserTransactions = async ({
  sortBy,
  sortOrder,
  page = 1,
  limit = DEFAULT_PAGE_SIZE,
} = {}) => {
  const params = { page, limit };

  if (sortBy) {
    params.sortBy = sortBy;
  }

  if (sortOrder) {
    params.sortOrder = sortOrder;
  }

  const response = await axiosClient.get("/transactions", { params });
  return response.data;
};
