import axiosClient from "./api";

export const searchCardTypes = async (query) => {
  const response = await axiosClient.get("/search/card-types", {
    params: { query },
  });
  return response.data;
};
