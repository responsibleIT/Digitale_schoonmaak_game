import { google, drive_v3 } from "googleapis";

export interface DriveItem {
  id: string;
  name: string;
  size: number;
  isFolder?: boolean;
}

export class GoogleDriveClient {
  private drive: drive_v3.Drive;

  constructor(accessToken?: string) {
    if (!accessToken) throw new Error("GoogleDriveClient requires an access token");
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    this.drive = google.drive({ version: "v3", auth });
  }

  async listUserDrive(): Promise<DriveItem[]> {
    const res = await this.drive.files.list({
      q: "trashed = false",
      pageSize: 100,
      fields: "files(id,name,size,mimeType,trashed)",
      corpora: "user",
      includeItemsFromAllDrives: false,
      supportsAllDrives: false,
    });
    const items = res.data.files ?? [];
    return items.map((f) => ({
      id: f.id!,
      name: f.name ?? "untitled",
      size: Number(f.size ?? 0),
      isFolder: f.mimeType === "application/vnd.google-apps.folder",
    }));
  }

  // Send file to Google Drive Trash
  async deleteItem(fileId: string): Promise<void> {
    await this.drive.files.update({
      fileId,
      requestBody: { trashed: true },
      supportsAllDrives: false,
    });
  }
}
