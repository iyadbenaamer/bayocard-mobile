import axiosClient from "./api";

export const getTopDiscountedCardTiers = async () => {
  const response = await axiosClient.get("/card-tiers/top-discounted");
  return response.data;
};
