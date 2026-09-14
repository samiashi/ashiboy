/** Random identifiers shared by every game's networking layer. */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous chars

function randomChunk(): string {
  try {
    const bytes = new Uint32Array(2);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => b.toString(36)).join('');
  } catch {
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
}

export function randomId(): string {
  return 'p-' + randomChunk().slice(0, 8);
}

export function randomToken(): string {
  return randomChunk() + randomChunk();
}

export function makeRoomCode(): string {
  let code = '';
  try {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    return code;
  } catch {
    for (let i = 0; i < 6; i++) {
      code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return code;
  }
}
