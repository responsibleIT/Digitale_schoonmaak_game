// public/js/google-init.js
const SCOPES = [
  "https://www.googleapis.com/auth/drive.metadata.readonly", // list metadata
  "https://www.googleapis.com/auth/drive"                    // read/write incl. Trash
];

let tokenClient;
let currentToken;

export function initGoogle(clientId) {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES.join(" "),
    callback: (resp) => {
      if (resp?.access_token) {
        currentToken = resp.access_token;
        window.__setGoogleAccessToken && window.__setGoogleAccessToken(currentToken);
      } else if (resp?.error) {
        console.error("[google] token error", resp);
      }
    },
  });
}

export async function loginAndGetToken() {
  return new Promise((resolve) => {
    tokenClient.callback = (resp) => resolve(resp?.access_token);
    tokenClient.requestAccessToken({ prompt: "consent" });
  });
}

// Optional globals (your index.html already expects a setter)
window.__initGoogle = initGoogle;
window.__googleLogin = loginAndGetToken;