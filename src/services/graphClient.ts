// src/services/graphClient.ts
import "isomorphic-fetch"; // required once in your app for the Graph SDK
import { Client } from "@microsoft/microsoft-graph-client";

export interface DriveItem {
  id: string;
  name: string;
  size: number;
  isFolder?: boolean;
}

export class GraphClient {
  private client: Client;

  constructor(accessToken?: string) {
    if (!accessToken) {
      throw new Error("GraphClient requires a delegated access token");
    }
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * List files in the user's OneDrive root.
   * You can also navigate into folders by calling `/me/drive/items/{id}/children`.
   */
  async listUserDrive(): Promise<DriveItem[]> {
    const res = await this.client
      .api("/me/drive/root/children")
      .select("id,name,size,folder")
      .top(50)
      .get();

    const items = (res.value ?? []) as Array<any>;
    return items.map((it) => ({
      id: it.id,
      name: it.name,
      size: it.size ?? 0,
      isFolder: !!it.folder,
    }));
  }

  /**
   * Delete a file (moves to recycle bin).
   */
  async deleteItem(itemId: string): Promise<void> {
    await this.client.api(`/me/drive/items/${itemId}`).delete();
  }

  // --- Optional helpers for later ---

  /** List children of a folder by id */
  async listChildren(itemId: string): Promise<DriveItem[]> {
    const res = await this.client
      .api(`/me/drive/items/${itemId}/children`)
      .select("id,name,size,folder")
      .top(50)
      .get();

    const items = (res.value ?? []) as Array<any>;
    return items.map((it) => ({
      id: it.id,
      name: it.name,
      size: it.size ?? 0,
      isFolder: !!it.folder,
    }));
  }

  /** SharePoint example: list a site's drive root */
  async listSharePointSiteDrive(siteId: string): Promise<DriveItem[]> {
    const res = await this.client
      .api(`/sites/${siteId}/drive/root/children`)
      .select("id,name,size,folder")
      .top(50)
      .get();

    const items = (res.value ?? []) as Array<any>;
    return items.map((it) => ({
      id: it.id,
      name: it.name,
      size: it.size ?? 0,
      isFolder: !!it.folder,
    }));
  }
}
