import axiosClient from "./api";

export const getSessions = async () => {
  const response = await axiosClient.get("/sessions");
  return response.data.sessions;
};

export const revokeSession = async (sessionId) => {
  const response = await axiosClient.delete(`/sessions/${sessionId}`);
  return response.data;
};
