const ENC = new TextEncoder();
const DEC = new TextDecoder();

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    ENC.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 120_000,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export interface EncryptedBlob {
  v: 1;
  salt: string;
  iv: string;
  ciphertext: string;
}

export async function encryptString(
  plaintext: string,
  passphrase: string,
): Promise<EncryptedBlob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    ENC.encode(plaintext),
  );
  return {
    v: 1,
    salt: toB64(salt.buffer),
    iv: toB64(iv.buffer),
    ciphertext: toB64(ciphertext),
  };
}

export async function decryptString(
  blob: EncryptedBlob,
  passphrase: string,
): Promise<string> {
  const salt = fromB64(blob.salt);
  const iv = fromB64(blob.iv);
  const key = await deriveKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    fromB64(blob.ciphertext),
  );
  return DEC.decode(plain);
}

export function isEncryptedBlob(value: unknown): value is EncryptedBlob {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return v.v === 1 && typeof v.salt === 'string' && typeof v.iv === 'string' && typeof v.ciphertext === 'string';
}
