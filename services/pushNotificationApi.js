import axiosClient from "./api";

export const registerPushToken = async (token) => {
  const response = await axiosClient.post("/user/push-token", { token });
  return response.data;
};

export const unregisterPushToken = async (token) => {
  const response = await axiosClient.delete("/user/push-token", {
    data: { token },
  });
  return response.data;
};
