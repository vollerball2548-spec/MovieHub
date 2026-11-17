let accessToken = "";
let role = "";

function decodeRole(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return "";
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded));
    return String(claims?.role || "").toLowerCase();
  } catch {
    return "";
  }
}

export function getAccessToken() { return accessToken; }
export function setAccessToken(token) {
  accessToken = token || "";
  role = decodeRole(accessToken);
}
export function isLoggedIn() { return Boolean(accessToken); }
export function getRole() { return role; }
export function isAdmin() { return role === "admin"; }
export function clearAuth() {
  accessToken = "";
  role = "";
  localStorage.removeItem("username");
  localStorage.removeItem("email");
}
