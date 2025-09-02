// public/js/google-init.js
const SCOPES = [
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/drive",
];

let clientId = null;
let tokenClient = null;

// Wait until GIS is available
const gisReady = new Promise((resolve) => {
  (function wait() {
    if (window.google?.accounts?.oauth2) resolve();
    else setTimeout(wait, 50);
  })();
});

export function initGoogle(id) {
  clientId = id;
}

// Internal: get or create token client (after GIS ready)
async function getTokenClient() {
  await gisReady;
  if (!tokenClient) {
    if (!clientId) throw new Error("Google clientId not set. Call initGoogle(clientId) first.");
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES.join(" "),
      callback: () => {},
    });
  }
  return tokenClient;
}

export async function loginAndGetToken() {
  const tc = await getTokenClient();
  return new Promise((resolve) => {
    tc.callback = (resp) => resolve(resp?.access_token);
    tc.requestAccessToken({ prompt: "consent" });
  });
}

// Optional globals for quick testing
window.__initGoogle = initGoogle;
window.__googleLogin = loginAndGetToken;
