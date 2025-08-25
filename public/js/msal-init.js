// public/js/msal-init.js
import * as msal from "https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.23.0/+esm";

/**
 * Fill these from your Entra ID app registration.
 * In dev, it's OK to inline. In prod, consider serving these from your server.
 */
const MSAL_CONFIG = {
  auth: {
    clientId: "<AZURE_CLIENT_ID>",            // e.g. "11111111-2222-3333-4444-555555555555"
    authority: "https://login.microsoftonline.com/<AZURE_TENANT_ID>", // e.g. "common" or your tenant GUID
    redirectUri: window.location.origin,      // http://localhost:3000
  },
  cache: {
    cacheLocation: "sessionStorage",          // safer than localStorage for tokens
    storeAuthStateInCookie: false,
  },
};

// The scopes we need for OneDrive file actions
const SCOPES = ["Files.ReadWrite"]; // you can add "User.Read" if you want profile info

const msalInstance = new msal.PublicClientApplication(MSAL_CONFIG);

// Handle redirects if you decide to use redirect flows anywhere
msalInstance.handleRedirectPromise().catch((e) => console.error("[msal] redirect error:", e));

async function chooseAccount() {
  const accts = msalInstance.getAllAccounts();
  if (accts.length > 0) return accts[0];
  return undefined;
}

export async function loginAndGetToken(scopes = SCOPES) {
  let account = await chooseAccount();
  if (!account) {
    // Popup login
    const loginRes = await msalInstance.loginPopup({ scopes });
    account = loginRes.account;
  }
  // Try silent token first, fallback to popup
  try {
    const tokenRes = await msalInstance.acquireTokenSilent({ account, scopes });
    return tokenRes.accessToken;
  } catch {
    const tokenRes = await msalInstance.acquireTokenPopup({ account, scopes });
    return tokenRes.accessToken;
  }
}

// Expose for the pages that call it (index.html uses this)
window.__msalLogin = () => loginAndGetToken();
