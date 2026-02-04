/*
 * encryption.c - Cipher algorithm implementations
 * 
 * File Encryption & Decryption Tool
 * OS Course Project - Phase 1
 * 
 * Implements:
 * - Caesar Cipher (byte-level shift)
 * - XOR Cipher (key-based XOR)
 */

#include "../include/encryption.h"

/*
 * Caesar Cipher Encryption
 * Shifts each byte forward by the key value.
 * Works on raw bytes, supporting both text and binary files.
 */
void caesar_encrypt(unsigned char *data, size_t len, int key) {
    /* Normalize key to 0-255 range */
    key = ((key % 256) + 256) % 256;
    
    for (size_t i = 0; i < len; i++) {
        /* Add key and wrap around at 256 */
        data[i] = (unsigned char)((data[i] + key) % 256);
    }
}

/*
 * Caesar Cipher Decryption
 * Shifts each byte backward by the key value (reverse of encryption).
 */
void caesar_decrypt(unsigned char *data, size_t len, int key) {
    /* Normalize key to 0-255 range */
    key = ((key % 256) + 256) % 256;
    
    for (size_t i = 0; i < len; i++) {
        /* Subtract key and handle underflow */
        data[i] = (unsigned char)((data[i] - key + 256) % 256);
    }
}

/*
 * XOR Cipher
 * XOR each byte with corresponding key byte (cycling through key).
 * 
 * XOR Properties:
 * - A ^ B ^ B = A (self-inverting)
 * - Same function works for both encryption and decryption
 */
void xor_cipher(unsigned char *data, size_t len, const char *key, size_t key_len) {
    if (key_len == 0) return;  /* Avoid division by zero */
    
    for (size_t i = 0; i < len; i++) {
        /* XOR with key byte, cycling through key */
        data[i] ^= (unsigned char)key[i % key_len];
    }
}
