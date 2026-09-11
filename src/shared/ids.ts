/** Random identifiers shared by every game's networking layer. */

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no ambiguous chars

export function randomId(): string {
  return 'p-' + Math.random().toString(36).slice(2, 10);
}

export function randomToken(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

export function makeRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}
