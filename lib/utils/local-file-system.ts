// Type definitions for File System Access API
export interface FileSystemHandle {
  kind: "file" | "directory";
  name: string;
}

export interface FileSystemFileHandle extends FileSystemHandle {
  kind: "file";
  getFile(): Promise<File>;
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: "directory";
  values(): AsyncIterableIterator<FileSystemHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
}

export interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string | WriteParams): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
  close(): Promise<void>;
}

type WriteParams =
  | { type: "write"; position?: number; data: BufferSource | Blob | string }
  | { type: "seek"; position: number }
  | { type: "truncate"; size: number };

declare global {
  interface Window {
    showDirectoryPicker(options?: {
      id?: string;
      mode?: "read" | "readwrite";
      startIn?: string;
    }): Promise<FileSystemDirectoryHandle>;
  }
}

/**
 * Checks if the browser supports the File System Access API.
 */
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/**
 * Iterates through a directory handle and returns all file handles matching the extension.
 * Pass `null` to extensions to get all files.
 */
export async function scanDirectoryForFiles(
  dirHandle: FileSystemDirectoryHandle,
  extensions: string[] | null = [".jpg", ".jpeg"]
): Promise<FileSystemFileHandle[]> {
  const files: FileSystemFileHandle[] = [];
  try {
    for await (const handle of dirHandle.values()) {
      if (handle.kind === "file") {
        if (!extensions) {
          files.push(handle as FileSystemFileHandle);
        } else {
          const lowerName = handle.name.toLowerCase();
          if (extensions.some(ext => lowerName.endsWith(ext))) {
            files.push(handle as FileSystemFileHandle);
          }
        }
      }
    }
  } catch (error) {
    console.error("Error scanning directory:", error);
  }
  return files;
}

/**
 * Copies a file from source handle to destination handle.
 * We use `getFileHandle` on source, then `getFile()`, then write to dest.
 */
export async function copyFileBetweenHandles(
  sourceFileHandle: FileSystemFileHandle,
  destDirHandle: FileSystemDirectoryHandle,
  newName?: string,
  onProgress?: (bytesCopied: number, totalBytes: number) => void
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  try {
    const file = await sourceFileHandle.getFile();
    const targetName = newName || sourceFileHandle.name;

    // Check if file exists in destination (Skip if exists)
    try {
      await destDirHandle.getFileHandle(targetName, { create: false });
      // If we reach here, the file exists. We skip overwriting.
      return { success: true, skipped: true };
    } catch (e: any) {
      // NotFoundError is expected here, meaning we can proceed to copy.
      if (e.name !== "NotFoundError") {
        throw e;
      }
    }

    // Create the new file handle
    const targetHandle = await destDirHandle.getFileHandle(targetName, { create: true });
    
    // Create writable stream
    const writable = await targetHandle.createWritable();
    
    // We can just stream the file contents.
    // If progress tracking is needed, we'd need to manually chunk it.
    // But for simplicity and speed, pipeTo is best.
    await file.stream().pipeTo(writable);

    return { success: true };
  } catch (error: any) {
    console.error("Copy failed for", sourceFileHandle.name, error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

/**
 * Mới: Quét thư mục nguồn và copy toàn bộ các file (bao gồm RAW, XMP) 
 * miễn là có tên gốc (basename) khớp với danh sách được cung cấp.
 */
export async function copyRawAndJpgByBasenames(
  sourceDirHandle: FileSystemDirectoryHandle,
  destDirHandle: FileSystemDirectoryHandle,
  basenames: string[],
  onProgress?: (current: number, total: number, skipped: number) => void
): Promise<{ success: boolean; totalFound: number; skipped: number; error?: string }> {
  try {
    // 1. Quét tất cả file trong source
    const allFiles = await scanDirectoryForFiles(sourceDirHandle, null);
    
    // 2. Chuyển basenames thành mảng lowercase
    const lowerBasenames = basenames.map(b => b.toLowerCase());
    
    // 3. Lọc file có basename nằm trong mảng
    const filesToCopy = allFiles.filter(handle => {
      const lastDotIndex = handle.name.lastIndexOf(".");
      const nameWithoutExt = lastDotIndex > 0 ? handle.name.substring(0, lastDotIndex) : handle.name;
      return lowerBasenames.includes(nameWithoutExt.toLowerCase());
    });

    let current = 0;
    let skipped = 0;

    // 4. Bắt đầu copy
    for (const sourceHandle of filesToCopy) {
      const result = await copyFileBetweenHandles(sourceHandle, destDirHandle);
      if (result.skipped) {
        skipped++;
      }
      current++;
      if (onProgress) {
        onProgress(current, filesToCopy.length, skipped);
      }
    }

    return { success: true, totalFound: filesToCopy.length, skipped };
  } catch (error: any) {
    console.error("Lỗi khi copy RAW & JPG:", error);
    return { success: false, totalFound: 0, skipped: 0, error: error.message };
  }
}
