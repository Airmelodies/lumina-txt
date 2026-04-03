// ─── File Action Utilities for Lumina TXT ───────────────────
// Download, clipboard, MIME helpers

/**
 * Download a text file to disk via Blob + anchor click (fallback).
 */
export async function downloadFile(content: string, filename: string): Promise<void> {
  const blob = new Blob([content], { type: getMimeType(filename) + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Save a text file to disk using File System Access API when available.
 * Falls back to Blob download for unsupported browsers.
 * Returns true if saved successfully, false if cancelled.
 */
export async function saveFileToDisk(content: string, filename: string): Promise<boolean> {
  // Try modern File System Access API (Chrome/Edge)
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const ext = getFileExtension(filename) || 'txt';
      const handle = await (window as unknown as { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }).showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Text file',
          accept: { 'text/plain': ['.txt', '.md', '.json', '.html', '.css'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (err: unknown) {
      // User cancelled the picker
      if (err instanceof DOMException && err.name === 'AbortError') return false;
      // Fall through to blob download
    }
  }
  // Fallback: blob download
  downloadFile(content, filename);
  return true;
}

/**
 * Copy text to clipboard with fallback for older browsers.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback: textarea + execCommand
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
}

/**
 * Extract the file extension (lowercase, without dot).
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Save a file to the default directory using a stored FileSystemDirectoryHandle.
 * Used by Ctrl+S dual-write when a default save directory is configured.
 * Returns true on success, false on failure (permission revoked, etc.).
 */
export async function saveToDefaultDirectory(
  dirHandle: FileSystemDirectoryHandle,
  content: string,
  filename: string
): Promise<boolean> {
  try {
    // Try to create or overwrite the file in the directory
    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch {
    // Permission may have been revoked — fail silently
    return false;
  }
}

/**
 * Request a persistent directory handle via showDirectoryPicker.
 * Returns { handle, name } or null if cancelled/unsupported.
 */
export async function requestDirectoryHandle(): Promise<{ handle: FileSystemDirectoryHandle; name: string } | null> {
  if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) return null;
  try {
    const handle = await (window as unknown as { showDirectoryPicker: (opts?: unknown) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker({
      mode: 'readwrite',
    });
    // Request persistent permission so it survives page reloads
    if ((handle as unknown as { queryPermission: (d: unknown) => Promise<string> }).queryPermission) {
      try {
        const perm = await (handle as unknown as { queryPermission: (d: { mode: string }) => Promise<string> }).queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
          await (handle as unknown as { requestPermission: (d: { mode: string }) => Promise<string> }).requestPermission({ mode: 'readwrite' });
        }
      } catch {
        // Permission request denied — still allow one-time use
      }
    }
    return { handle, name: handle.name };
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return null;
    return null;
  }
}

export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  const types: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    json: 'application/json',
    html: 'text/html',
    htm: 'text/html',
    css: 'text/css',
  };
  return types[ext] || 'text/plain';
}
