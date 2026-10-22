// RFC 4122 v4-ish UUID generator. Only used as a client-side idempotency
// key for checkout requests, so Math.random() is sufficient here — no
// cryptographic guarantees are required.
const generateUuid = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export default generateUuid;
