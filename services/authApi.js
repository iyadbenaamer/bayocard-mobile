import axiosClient from "./api";
import {
  buildDeviceAttestation,
  persistAppAttestKeyId,
} from "./deviceAttestation";

// Fetches a fresh device-attestation challenge and folds it, together with
// this device's Play Integrity/App Attest proof, into a request body. Every
// login-equivalent endpoint (login, verify-account, reset-password) needs
// this since each of them can hand back a new session, and signup needs it
// too since account creation itself is gated on a genuine device - see
// AUTH_SESSIONS_PLAN.md.
const postWithDeviceAttestation = async (path, body) => {
  const { data } = await axiosClient.post("/device-challenge");
  const attestation = await buildDeviceAttestation(data.challenge);
  const response = await axiosClient.post(path, {
    ...body,
    ...attestation,
    challenge: data.challenge,
  });

  // Persist a first-time App Attest key only after the server has accepted
  // and registered its attestation. Otherwise a failed login leaves the
  // client asserting with a key the server has never seen.
  if (attestation.platform === "ios" && attestation.attestation) {
    try {
      await persistAppAttestKeyId(attestation.keyId);
    } catch (error) {
      console.error(
        "[authApi] failed to persist the verified App Attest key:",
        error,
      );
    }
  }

  return response.data;
};

export const login = async ({ phone, password, rememberMe } = {}) => {
  return postWithDeviceAttestation("/login", {
    phone,
    password,
    rememberMe,
  });
};

export const register = async ({
  name,
  phone,
  password,
  role,
  turnstileToken,
} = {}) => {
  return postWithDeviceAttestation("/signup", {
    name,
    phone,
    password,
    role,
    turnstileToken,
  });
};

// Session-expiry handling (AUTH_SESSION_EXPIRED/REVOKED/INVALID) is handled
// globally by the response interceptor in ./api.js, so this can just let
// errors propagate.
export const verifyAccessToken = async () => {
  const response = await axiosClient.get("/verify-access");
  return response.data;
};

export const verifyAccountByCode = async ({ phone, code } = {}) => {
  return postWithDeviceAttestation("/verify-account", { phone, code });
};

export const sendVerificationCode = async ({ phone, type } = {}) => {
  const response = await axiosClient.post("/send-verification-code", {
    phone,
    type,
  });
  return response.data;
};

export const checkPhoneForResetPassword = async (phone) => {
  const response = await axiosClient.get(
    `/check-phone-availability/reset-password/${encodeURIComponent(phone)}`,
  );
  return response.data;
};

export const verifyResetPasswordCode = async ({ phone, code } = {}) => {
  const response = await axiosClient.post("/verify-reset-password", {
    phone,
    code,
  });
  return response.data;
};

export const resetPasswordByToken = async ({ token, password } = {}) => {
  return postWithDeviceAttestation(`/reset-password/${token}`, { password });
};

// Revokes the session that's currently authenticating this device.
export const logout = async () => {
  const response = await axiosClient.post("/logout");
  return response.data;
};

// Revokes every session on the account, e.g. after a lost/stolen phone.
export const logoutAll = async () => {
  const response = await axiosClient.post("/logout-all");
  return response.data;
};
