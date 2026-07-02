const defaultApiBaseUrl =
  typeof window !== "undefined" && window.location?.origin
    ? window.location.origin
    : "http://localhost:4000";

export { defaultApiBaseUrl };
