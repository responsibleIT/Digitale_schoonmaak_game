// public/js/msal-init.js
//
// Placeholder voor Microsoft login. Je kunt nu al zonder MSAL testen.
// Als je later echte login wilt, gebruik msal-browser via CDN of bundler.
//
// Snelle start met CDN (voeg onderaan deze file toe, of maak aparte module):
// import * as msal from "https://cdn.jsdelivr.net/npm/@azure/msal-browser@3.23.0/+esm";
//
// const msalConfig = {
//   auth: {
//     clientId: "<AZURE_CLIENT_ID>",
//     authority: "https://login.microsoftonline.com/<AZURE_TENANT_ID>", // of "common"
//     redirectUri: window.location.origin,
//   },
// };
// const msalInstance = new msal.PublicClientApplication(msalConfig);
//
// export async function loginAndGetToken(scopes = ["Files.ReadWrite"]) {
//   try {
//     const result = await msalInstance.loginPopup({ scopes });
//     const account = result.account;
//     const tokenResp = await msalInstance.acquireTokenSilent({ account, scopes })
//       .catch(() => msalInstance.acquireTokenPopup({ account, scopes }));
//     return tokenResp.accessToken;
//   } catch (e) {
//     console.error("[msal] login error:", e);
//     return undefined;
//   }
// }
//
// // Exposeer een helper voor pagina-scripts (index.html gebruikt dit):
// window.__msalLogin = () => loginAndGetToken();

// --- Voor nu: no-op stub zodat de app werkt zonder MSAL ---
window.__msalLogin = async () => {
  // retourneer undefined om zonder token te werken
  return undefined;
};

// Als je tóch alvast een token in het join-form wilt injecteren via een andere bron:
// window.__setMsalAccessToken && window.__setMsalAccessToken("<your-token>");
