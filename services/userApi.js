import axiosClient from "./api";

export const getUserById = async (id) => {
  const response = await axiosClient.get(`/user`, { params: { id } });
  return response.data;
};

export const updateUserProfile = async (payload = {}) => {
  const response = await axiosClient.patch("/user", payload);
  return response.data;
};
