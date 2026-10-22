import axiosClient from "./api";

export const getCardTypesByCategory = async ({
  categoryId,
  page = 1,
  limit = 10,
} = {}) => {
  const params = {
    categoryId,
    page,
    limit,
    isActive: true,
  };

  const response = await axiosClient.get("/card-types/by-category", { params });
  return response.data;
};

export const getCardTypeById = async (id) => {
  const response = await axiosClient.get("/card-types/get-one", {
    params: { id },
  });
  return response.data;
};

export const getTopSoldCardTypes = async () => {
  const response = await axiosClient.get("/card-types/top-sold");
  return response.data;
};
