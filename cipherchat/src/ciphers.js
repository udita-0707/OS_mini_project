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
const FILE_MAGIC = 'FENC';
const FILE_VERSION = 1;
const FILE_TAG_LENGTH = 16;
const FILE_HEADER_LENGTH = 4 + 1 + 4 + SALT_LENGTH + IV_LENGTH + FILE_TAG_LENGTH;

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

const strToBytes = (value) => textEncoder.encode(value);

const bytesToStr = (bytes) => textDecoder.decode(bytes);

const readUint32BE = (bytes, offset) => (
    (bytes[offset] << 24)
    | (bytes[offset + 1] << 16)
    | (bytes[offset + 2] << 8)
    | bytes[offset + 3]
);

const writeUint32BE = (target, offset, value) => {
    target[offset] = (value >>> 24) & 0xff;
    target[offset + 1] = (value >>> 16) & 0xff;
    target[offset + 2] = (value >>> 8) & 0xff;
    target[offset + 3] = value & 0xff;
};

export async function encryptFileBytes(fileBytes, passphrase) {
    if (!passphrase) {
        throw new Error('Missing encryption passphrase');
    }

    const plainBytes = fileBytes instanceof Uint8Array ? fileBytes : new Uint8Array(fileBytes);
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(passphrase, salt);

    const encryptedBuffer = await crypto.subtle.encrypt(
        { name: AES_ALGO, iv },
        key,
        plainBytes
    );
    const encryptedBytes = new Uint8Array(encryptedBuffer);
    if (encryptedBytes.length < FILE_TAG_LENGTH) {
        throw new Error('Encryption produced invalid payload');
    }
    const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - FILE_TAG_LENGTH);
    const tag = encryptedBytes.slice(encryptedBytes.length - FILE_TAG_LENGTH);

    const output = new Uint8Array(FILE_HEADER_LENGTH + ciphertext.length);
    output.set(strToBytes(FILE_MAGIC), 0);
    output[4] = FILE_VERSION;
    writeUint32BE(output, 5, PBKDF2_ITERATIONS);
    output.set(salt, 9);
    output.set(iv, 9 + SALT_LENGTH);
    output.set(tag, 9 + SALT_LENGTH + IV_LENGTH);
    output.set(ciphertext, FILE_HEADER_LENGTH);
    return output;
}

export async function decryptFileBytes(fileBytes, passphrase) {
    if (!passphrase) {
        throw new Error('Missing encryption passphrase');
    }

    const payload = fileBytes instanceof Uint8Array ? fileBytes : new Uint8Array(fileBytes);
    if (payload.length < FILE_HEADER_LENGTH) {
        throw new Error('Invalid encrypted file format');
    }

    const magic = bytesToStr(payload.slice(0, 4));
    const version = payload[4];
    if (magic !== FILE_MAGIC || version !== FILE_VERSION) {
        throw new Error('Unsupported encrypted file format');
    }

    const iterations = readUint32BE(payload, 5);
    if (iterations < 10000) {
        throw new Error('Unsupported encrypted file format');
    }

    const salt = payload.slice(9, 9 + SALT_LENGTH);
    const iv = payload.slice(9 + SALT_LENGTH, 9 + SALT_LENGTH + IV_LENGTH);
    const tag = payload.slice(9 + SALT_LENGTH + IV_LENGTH, FILE_HEADER_LENGTH);
    const ciphertext = payload.slice(FILE_HEADER_LENGTH);
    const encrypted = new Uint8Array(ciphertext.length + tag.length);
    encrypted.set(ciphertext, 0);
    encrypted.set(tag, ciphertext.length);

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        textEncoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations,
            hash: PBKDF2_HASH
        },
        keyMaterial,
        { name: AES_ALGO, length: 256 },
        false,
        ['decrypt']
    );

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: AES_ALGO, iv },
        key,
        encrypted
    );
    return new Uint8Array(decryptedBuffer);
}
