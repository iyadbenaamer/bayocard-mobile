import axiosClient from "./api";

export const getDeals = async () => {
  const response = await axiosClient.get("/deals");
  return response.data;
};
