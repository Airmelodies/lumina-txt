/**
 * ─── Lumina Vault: Web Crypto API Wrapper ────────────────────────────
 * Uses AES-GCM (256-bit) with PBKDF2 for key derivation.
 * All operations are client-side. No keys leave the browser.
 */

const ALGO = 'AES-GCM';
const KEY_ALGO = 'PBKDF2';
const HASH = 'SHA-256';
const ITERATIONS = 100000;
const KEY_LEN = 256;

/**
 * Derives a CryptoKey from a plaintext passcode and salt.
 */
async function deriveKey(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passcode),
    { name: KEY_ALGO },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: KEY_ALGO,
      salt,
      iterations: ITERATIONS,
      hash: HASH,
    },
    baseKey,
    { name: ALGO, length: KEY_LEN },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string using a passcode.
 * Format: [SALT (16 bytes)][IV (12 bytes)][CIPHER_TEXT] -- base64 encoded
 */
export async function encrypt(plaintext: string, passcode: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passcode, salt);

  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    enc.encode(plaintext)
  );

  // Combine salt + iv + ciphertext into a single Buffer/Uint8Array
  const combined = new Uint8Array(salt.byteLength + iv.byteLength + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.byteLength);
  combined.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a base64 string using a passcode.
 */
export async function decrypt(base64Cipher: string, passcode: string): Promise<string> {
  try {
    const combined = new Uint8Array(
      atob(base64Cipher)
        .split('')
        .map((c) => c.charCodeAt(0))
    );

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);

    const key = await deriveKey(passcode, salt);
    const decrypted = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ciphertext);

    const dec = new TextDecoder();
    return dec.decode(decrypted);
  } catch (err) {
    console.error('[Vault] Decryption failed:', err);
    throw new Error('Decryption failed. Invalid passcode or corrupted data.');
  }
}
