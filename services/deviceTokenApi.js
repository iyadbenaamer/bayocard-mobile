import axiosClient from "./api";

// Public endpoint (no auth) - registers/unregisters this device's Expo push
// token before it has ever logged in, so the panel can reach "unauthorized
// users" notifications at it. See services/pushNotificationApi.js for the
// authenticated counterpart used once a User is logged in.
export const registerAnonymousDeviceToken = async (token, platform) => {
  const response = await axiosClient.post("/device-tokens", { token, platform });
  return response.data;
};

export const removeAnonymousDeviceToken = async (token) => {
  const response = await axiosClient.delete("/device-tokens", {
    data: { token },
  });
  return response.data;
};
