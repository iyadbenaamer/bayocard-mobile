import axiosClient from "./api";

export const getApiKeys = async () => {
  const response = await axiosClient.get("/user/api-keys");
  return response.data;
};

export const createApiKey = async (name) => {
  const response = await axiosClient.post("/user/api-keys", { name });
  return response.data;
};

export const deleteApiKey = async (id) => {
  const response = await axiosClient.delete(`/user/api-keys/${id}`);
  return response.data;
};
