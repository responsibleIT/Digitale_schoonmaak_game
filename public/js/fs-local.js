// public/js/fs-local.js
// Helpers for the File System Access API (Chromium; HTTPS or http://localhost)

/** Ask the user to pick a directory with read/write access */
export async function pickRoot() {
  if (!("showDirectoryPicker" in window)) {
    throw new Error("File System Access API not supported (use Chrome/Edge).");
  }
  // id helps the browser remember the last chosen folder name
  return await window.showDirectoryPicker({ id: "dashboardgame", mode: "readwrite" });
}

/**
 * Depth-first traversal with progress callbacks.
 * We don't know total upfront, so report only "processed" count. Caller can map that to a %.
 */
export async function scanWithProgress(rootHandle, { maxDepth = 10, onProgress } = {}) {
  const files = [];
  const idToHandle = new Map();      // id -> FileSystemFileHandle
  const idToParentDir = new Map();   // id -> FileSystemDirectoryHandle

  let processed = 0;
  let lastTick = 0;

  async function walk(dirHandle, depth, prefix = "") {
    if (depth > maxDepth) return;
    for await (const [name, handle] of dirHandle.entries()) {
      try {
        if (handle.kind === "file") {
          const file = await handle.getFile();
          const id = prefix + name; // pseudo-path id
          files.push({ id, name, size: file.size, canTrash: true });
          idToHandle.set(id, handle);
          idToParentDir.set(id, dirHandle);
          processed++;
        } else if (handle.kind === "directory") {
          await walk(handle, depth + 1, prefix + name + "/");
        }
      } catch (e) {
        // Skip unreadable entries
        console.warn("Skipping entry due to error:", name, e);
      }

      const now = performance.now();
      if (onProgress && now - lastTick > 100) {
        lastTick = now;
        onProgress({ processed });
      }
    }
  }

  await walk(rootHandle, 0, "");
  if (onProgress) onProgress({ processed, done: true });

  return { files, idToHandle, idToParentDir };
}

/**
 * Soft delete: copy file to a hidden ".DashboardgameTrash" folder at the root,
 * then remove original from its parent directory.
 */
export async function softDeleteById(rootHandle, id, idToHandle, idToParentDir) {
  const fileHandle = idToHandle.get(id);
  const parentDir = idToParentDir.get(id);
  if (!fileHandle || !parentDir) {
    throw new Error("Unknown file handle or parent directory for id=" + id);
  }

  // Ensure trash directory exists
  const trashDir = await rootHandle.getDirectoryHandle(".DashboardgameTrash", { create: true });

  // Read the file and write it into trash (overwrite if exists)
  const srcFile = await fileHandle.getFile();
  const destHandle = await trashDir.getFileHandle(srcFile.name, { create: true });
  const writable = await destHandle.createWritable();
  await writable.write(await srcFile.arrayBuffer());
  await writable.close();

  // Remove original
  await parentDir.removeEntry(fileHandle.name);

  return { ok: true };
}

/* (Optional) Utilities you might still want elsewhere */
export async function listFilesWithParents(rootHandle, { maxDepth = 2 } = {}) {
  const files = [];
  const idToHandle = new Map();
  const idToParentDir = new Map();

  async function walk(dirHandle, depth, prefix = "") {
    if (depth > maxDepth) return;
    for await (const [name, handle] of dirHandle.entries()) {
      try {
        if (handle.kind === "file") {
          const file = await handle.getFile();
          const id = prefix + name;
          files.push({ id, name, size: file.size, canTrash: true });
          idToHandle.set(id, handle);
          idToParentDir.set(id, dirHandle);
        } else if (handle.kind === "directory") {
          await walk(handle, depth + 1, prefix + name + "/");
        }
      } catch (e) {
        console.warn("Skipping entry due to error:", name, e);
      }
    }
  }

  await walk(rootHandle, 0, "");
  return { files, idToHandle, idToParentDir };
}
