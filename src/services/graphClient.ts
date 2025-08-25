// src/services/graphClient.ts

/**
 * SKELETON GraphClient:
 * - Nu: mock-implementatie (werkt zonder Microsoft Graph).
 * - Later: vervang door echte Graph-calls met het user access token (MSAL).
 *
 * Voor echte Graph:
 *   npm i @microsoft/microsoft-graph-client isomorphic-fetch
 *   (en voeg `import "isomorphic-fetch";` eenmalig toe in je server bootstrap)
 *
 * Endpoints (delegated):
 *   - List OneDrive:   GET  /me/drive/root/children
 *   - Delete item:     DELETE /me/drive/items/{item-id}
 *   - SharePoint:      /sites/{site-id}/drive/root/children  (of via /me/followedSites)
 */

export interface DriveItem {
  id: string;
  name: string;
  size: number;
  isFolder?: boolean;
}

export class GraphClient {
  constructor(private accessToken?: string) {}

  /**
   * Haal bestanden van de gebruiker op (mock).
   * Vervang dit door een echte Graph-call.
   */
  async listUserDrive(): Promise<DriveItem[]> {
    // TODO: ECHT:
    // const client = Client.init({
    //   authProvider: (done) => done(null, this.accessToken ?? ""),
    // });
    // const res = await client.api("/me/drive/root/children").get();
    // return (res.value ?? []).map((it: any) => ({
    //   id: it.id, name: it.name, size: it.size ?? 0, isFolder: it.folder != null
    // }));

    // MOCK:
    return [
      { id: "1", name: "rapport.docx", size: 120_000 },
      { id: "2", name: "dataset.csv", size: 5_000_000 },
      { id: "3", name: "screenshot.png", size: 800_000 },
    ];
  }

  /**
   * Verplaats een item naar de prullenbak (mock).
   * In Graph is dit een DELETE op het drive item.
   */
  async deleteItem(itemId: string): Promise<void> {
    // TODO: ECHT:
    // const client = Client.init({
    //   authProvider: (done) => done(null, this.accessToken ?? ""),
    // });
    // await client.api(`/me/drive/items/${itemId}`).delete();
    return;
  }
}
