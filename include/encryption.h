/*
 * encryption.h - Encryption algorithm declarations
 * 
 * File Encryption & Decryption Tool
 * OS Course Project - Phase 1
 */

#ifndef ENCRYPTION_H
#define ENCRYPTION_H

#include <stddef.h>

/* Algorithm types */
typedef enum {
    ALG_CAESAR,
    ALG_XOR
} algorithm_t;

/*
 * Caesar Cipher - Encrypts data by shifting each byte
 * 
 * @param data:  Buffer to encrypt (modified in-place)
 * @param len:   Length of data in bytes
 * @param key:   Shift value (0-255)
 * 
 * Formula: E(x) = (x + key) mod 256
 */
void caesar_encrypt(unsigned char *data, size_t len, int key);

/*
 * Caesar Cipher - Decrypts data by reverse shifting
 * 
 * @param data:  Buffer to decrypt (modified in-place)
 * @param len:   Length of data in bytes
 * @param key:   Original shift value used for encryption
 * 
 * Formula: D(x) = (x - key + 256) mod 256
 */
void caesar_decrypt(unsigned char *data, size_t len, int key);

/*
 * XOR Cipher - Encrypts/Decrypts data using XOR operation
 * 
 * @param data:     Buffer to process (modified in-place)
 * @param len:      Length of data in bytes
 * @param key:      Key string
 * @param key_len:  Length of key string
 * 
 * Note: XOR is self-inverting, same function encrypts and decrypts
 * Formula: data[i] ^= key[i % key_len]
 */
void xor_cipher(unsigned char *data, size_t len, const char *key, size_t key_len);

#endif /* ENCRYPTION_H */
