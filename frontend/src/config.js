/**
 * API base URL for fetch calls. Call this at request time (not once at module load)
 * so LAN access always matches the current page host (e.g. 192.168.x.x).
 *
 * - REACT_APP_API_URL overrides everything (production or custom dev).
 * - Otherwise: same hostname as the page, port 5050 (Flask default).
 */
export function getApiBaseUrl() {
  const fromEnv = process.env.REACT_APP_API_URL;
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location) {
    const { protocol, hostname } = window.location;
    const port = process.env.REACT_APP_API_PORT || "5050";
    return `${protocol}//${hostname}:${port}`;
  }
  const port = process.env.REACT_APP_API_PORT || "5050";
  return `http://127.0.0.1:${port}`;
}
