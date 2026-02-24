// Emoji Cipher mapping: each alphanumeric character maps to a unique emoji
const emojiMap = {
    a: '😀', b: '😁', c: '😂', d: '🤣', e: '😃', f: '😄', g: '😅', h: '😆', i: '😉', j: '😊', k: '😎', l: '😍', m: '😘', n: '🥰', o: '😗', p: '😙', q: '😚', r: '☺️', s: '🙂', t: '🤗', u: '🤩', v: '🤔', w: '🤨', x: '😐', y: '😑', z: '😶',
    A: '🧐', B: '🤓', C: '😏', D: '😒', E: '😞', F: '😔', G: '😟', H: '😕', I: '🙁', J: '☹️', K: '😣', L: '😖', M: '😫', N: '😩', O: '🥺', P: '😢', Q: '😭', R: '😤', S: '😠', T: '😡', U: '🤬', V: '🤯', W: '😳', X: '🥵', Y: '🥶', Z: '😱',
    '0': '🔟', '1': '1️⃣', '2': '2️⃣', '3': '3️⃣', '4': '4️⃣', '5': '5️⃣', '6': '6️⃣', '7': '7️⃣', '8': '8️⃣', '9': '9️⃣'
};

// Build reverse map for decryption
const reverseEmojiMap = Object.entries(emojiMap).reduce((acc, [char, emoji]) => {
    acc[emoji] = char;
    return acc;
}, {});

/**
 * Encrypt plain text using the Emoji Cipher.
 * Characters not in the map (e.g., spaces, punctuation) are left unchanged.
 */
export function emojiEncrypt(text) {
    return Array.from(text).map(ch => emojiMap[ch] || ch).join('');
}

/**
 * Decrypt an Emoji‑ciphered string back to plain text.
 */
export function emojiDecrypt(cipherText) {
    // Since emojis can be multi‑code‑point, we need to iterate over the string
    // and replace known emojis with their original characters.
    let result = '';
    let i = 0;
    while (i < cipherText.length) {
        // Try to match any emoji in the reverse map starting at position i
        let matched = false;
        for (const [emoji, char] of Object.entries(reverseEmojiMap)) {
            if (cipherText.startsWith(emoji, i)) {
                result += char;
                i += emoji.length;
                matched = true;
                break;
            }
        }
        if (!matched) {
            // No emoji match – copy the character as‑is
            result += cipherText[i];
            i += 1;
        }
    }
    return result;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();
const AES_ALGO = 'AES-GCM';
const PBKDF2_HASH = 'SHA-256';
const PBKDF2_ITERATIONS = 250000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PAYLOAD_VERSION = 'v1';

const bytesToBase64 = (bytes) => {
    let binary = '';
    bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
    });
    return btoa(binary);
};

const base64ToBytes = (base64) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
};

const deriveKey = async (passphrase, saltBytes) => {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: PBKDF2_ITERATIONS,
            hash: PBKDF2_HASH
        },
        keyMaterial,
        { name: AES_ALGO, length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

export async function blockEncrypt(plainText, passphrase) {
    if (!passphrase) {
        throw new Error('Missing encryption passphrase');
    }

    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(passphrase, salt);
    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: AES_ALGO, iv },
        key,
        textEncoder.encode(plainText)
    );

    const encryptedBytes = new Uint8Array(encryptedBuffer);
    return [
        PAYLOAD_VERSION,
        bytesToBase64(salt),
        bytesToBase64(iv),
        bytesToBase64(encryptedBytes)
    ].join(':');
}

export async function blockDecrypt(cipherText, passphrase) {
    if (!passphrase) {
        throw new Error('Missing encryption passphrase');
    }

    const [version, saltBase64, ivBase64, payloadBase64] = (cipherText || '').split(':');
    if (version !== PAYLOAD_VERSION || !saltBase64 || !ivBase64 || !payloadBase64) {
        throw new Error('Unsupported cipher payload');
    }

    const salt = base64ToBytes(saltBase64);
    const iv = base64ToBytes(ivBase64);
    const encryptedBytes = base64ToBytes(payloadBase64);
    const key = await deriveKey(passphrase, salt);

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: AES_ALGO, iv },
        key,
        encryptedBytes
    );
    return textDecoder.decode(decryptedBuffer);
}
