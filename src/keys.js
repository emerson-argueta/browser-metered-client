const KEYPAIR_KEY = 'bmp_keypair';

/**
 * @param {{ getItem: (key: string) => string|null, setItem: (key: string, value: string) => void }} storage
 */
export function createKeys(storage) {
  /** @returns {Promise<void>} */
  async function generate() {
    const keypair = await crypto.subtle.generateKey(
      { name: 'Ed25519' },
      true,
      ['sign', 'verify']
    );
    const [privateJwk, publicJwk] = await Promise.all([
      crypto.subtle.exportKey('jwk', keypair.privateKey),
      crypto.subtle.exportKey('jwk', keypair.publicKey),
    ]);
    storage.setItem(KEYPAIR_KEY, JSON.stringify({ privateJwk, publicJwk }));
  }

  /** @returns {boolean} */
  function exists() {
    return Boolean(storage.getItem(KEYPAIR_KEY));
  }

  /**
   * Returns the public key as a base64 string, safe to share with the server.
   * @returns {Promise<string|null>}
   */
  async function publicKey() {
    const raw = storage.getItem(KEYPAIR_KEY);
    if (!raw) return null;
    const { publicJwk } = JSON.parse(raw);
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      publicJwk,
      { name: 'Ed25519' },
      true,
      ['verify']
    );
    const rawBytes = await crypto.subtle.exportKey('raw', cryptoKey);
    return btoa(String.fromCharCode(...new Uint8Array(rawBytes)));
  }

  /** @returns {void} */
  function clear() {
    storage.setItem(KEYPAIR_KEY, '');
  }

  /**
   * Signs a canonical message string with the stored private key.
   * @param {string} message
   * @returns {Promise<string>} base64-encoded signature
   */
  async function sign(message) {
    const raw = storage.getItem(KEYPAIR_KEY);
    if (!raw) throw new Error('No keypair found. Call keys.generate() first.');
    const { privateJwk } = JSON.parse(raw);
    const privateKey = await crypto.subtle.importKey(
      'jwk',
      privateJwk,
      { name: 'Ed25519' },
      false,
      ['sign']
    );
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = await crypto.subtle.sign('Ed25519', privateKey, messageBytes);
    return btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
  }

  return { generate, exists, publicKey, clear, sign };
}
