import axiosClient from "./api";

export const getCardCategories = async () => {
  const response = await axiosClient.get("/card-categories");
  return response.data;
};
