import axiosClient from "./api";

export const getFavorites = async () => {
  const response = await axiosClient.get("/favorites");
  return response.data;
};

export const addFavorite = async (cardTypeId) => {
  const response = await axiosClient.post("/favorites", { cardTypeId });
  return response.data;
};

export const removeFavorite = async (cardTypeId) => {
  const response = await axiosClient.delete("/favorites", {
    params: { cardTypeId },
  });
  return response.data;
};
