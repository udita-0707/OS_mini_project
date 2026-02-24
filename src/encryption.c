/*
 * encryption.c - AES-256-GCM + PBKDF2-SHA256 implementation
 */

#include "../include/encryption.h"

#include <stdint.h>
#include <stdlib.h>
#include <string.h>

#include <openssl/evp.h>
#include <openssl/crypto.h>
#include <openssl/rand.h>

#define PAYLOAD_MAGIC "FENC"
#define PAYLOAD_MAGIC_LEN 4
#define PAYLOAD_VERSION 1
#define PBKDF2_ITERATIONS 250000
#define SALT_LEN 16
#define IV_LEN 12
#define TAG_LEN 16
#define KEY_LEN 32
#define FIXED_HEADER_LEN (PAYLOAD_MAGIC_LEN + 1 + 4 + SALT_LEN + IV_LEN + TAG_LEN)

static void write_u32_be(unsigned char *buf, uint32_t value) {
    buf[0] = (unsigned char)((value >> 24) & 0xFF);
    buf[1] = (unsigned char)((value >> 16) & 0xFF);
    buf[2] = (unsigned char)((value >> 8) & 0xFF);
    buf[3] = (unsigned char)(value & 0xFF);
}

static uint32_t read_u32_be(const unsigned char *buf) {
    return ((uint32_t)buf[0] << 24) |
           ((uint32_t)buf[1] << 16) |
           ((uint32_t)buf[2] << 8) |
           (uint32_t)buf[3];
}

int aes_encrypt_payload(
    const unsigned char *plaintext,
    size_t plaintext_len,
    const char *passphrase,
    unsigned char **out_payload,
    size_t *out_payload_len
) {
    if (!passphrase || !out_payload || !out_payload_len) {
        return ENC_ERR_INVALID_ARG;
    }

    if (!plaintext && plaintext_len != 0) {
        return ENC_ERR_INVALID_ARG;
    }

    int rc = ENC_ERR_ENCRYPT;
    EVP_CIPHER_CTX *ctx = NULL;
    unsigned char salt[SALT_LEN];
    unsigned char iv[IV_LEN];
    unsigned char key[KEY_LEN];
    unsigned char tag[TAG_LEN];
    unsigned char *payload = NULL;
    unsigned char *ciphertext = NULL;
    int out_len = 0;
    int final_len = 0;

    *out_payload = NULL;
    *out_payload_len = 0;

    if (RAND_bytes(salt, SALT_LEN) != 1 || RAND_bytes(iv, IV_LEN) != 1) {
        rc = ENC_ERR_RANDOM;
        goto cleanup;
    }

    if (PKCS5_PBKDF2_HMAC(
            passphrase,
            (int)strlen(passphrase),
            salt,
            SALT_LEN,
            PBKDF2_ITERATIONS,
            EVP_sha256(),
            KEY_LEN,
            key
        ) != 1) {
        rc = ENC_ERR_KEY_DERIVATION;
        goto cleanup;
    }

    ciphertext = (unsigned char *)malloc(plaintext_len == 0 ? 1 : plaintext_len);
    if (!ciphertext) {
        rc = ENC_ERR_MEMORY;
        goto cleanup;
    }

    ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        rc = ENC_ERR_ENCRYPT;
        goto cleanup;
    }

    if (EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), NULL, NULL, NULL) != 1 ||
        EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, IV_LEN, NULL) != 1 ||
        EVP_EncryptInit_ex(ctx, NULL, NULL, key, iv) != 1) {
        rc = ENC_ERR_ENCRYPT;
        goto cleanup;
    }

    if (EVP_EncryptUpdate(ctx, ciphertext, &out_len, plaintext, (int)plaintext_len) != 1) {
        rc = ENC_ERR_ENCRYPT;
        goto cleanup;
    }

    if (EVP_EncryptFinal_ex(ctx, ciphertext + out_len, &final_len) != 1) {
        rc = ENC_ERR_ENCRYPT;
        goto cleanup;
    }
    out_len += final_len;

    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, TAG_LEN, tag) != 1) {
        rc = ENC_ERR_ENCRYPT;
        goto cleanup;
    }

    *out_payload_len = FIXED_HEADER_LEN + (size_t)out_len;
    payload = (unsigned char *)malloc(*out_payload_len);
    if (!payload) {
        rc = ENC_ERR_MEMORY;
        goto cleanup;
    }

    memcpy(payload, PAYLOAD_MAGIC, PAYLOAD_MAGIC_LEN);
    payload[4] = PAYLOAD_VERSION;
    write_u32_be(payload + 5, PBKDF2_ITERATIONS);
    memcpy(payload + 9, salt, SALT_LEN);
    memcpy(payload + 25, iv, IV_LEN);
    memcpy(payload + 37, tag, TAG_LEN);
    if (out_len > 0) {
        memcpy(payload + FIXED_HEADER_LEN, ciphertext, (size_t)out_len);
    }

    *out_payload = payload;
    rc = ENC_SUCCESS;

cleanup:
    if (ctx) EVP_CIPHER_CTX_free(ctx);
    if (ciphertext) free(ciphertext);
    if (rc != ENC_SUCCESS) {
        if (payload) free(payload);
        *out_payload = NULL;
        *out_payload_len = 0;
    }
    OPENSSL_cleanse(key, sizeof(key));
    return rc;
}

int aes_decrypt_payload(
    const unsigned char *payload,
    size_t payload_len,
    const char *passphrase,
    unsigned char **out_plaintext,
    size_t *out_plaintext_len
) {
    if (!payload || !passphrase || !out_plaintext || !out_plaintext_len) {
        return ENC_ERR_INVALID_ARG;
    }

    if (payload_len < FIXED_HEADER_LEN) {
        return ENC_ERR_INVALID_FORMAT;
    }

    if (memcmp(payload, PAYLOAD_MAGIC, PAYLOAD_MAGIC_LEN) != 0 || payload[4] != PAYLOAD_VERSION) {
        return ENC_ERR_INVALID_FORMAT;
    }

    const uint32_t iterations = read_u32_be(payload + 5);
    if (iterations < 10000) {
        return ENC_ERR_INVALID_FORMAT;
    }

    const unsigned char *salt = payload + 9;
    const unsigned char *iv = payload + 25;
    const unsigned char *tag = payload + 37;
    const unsigned char *ciphertext = payload + FIXED_HEADER_LEN;
    const size_t ciphertext_len = payload_len - FIXED_HEADER_LEN;

    int rc = ENC_ERR_DECRYPT;
    EVP_CIPHER_CTX *ctx = NULL;
    unsigned char key[KEY_LEN];
    unsigned char *plaintext = NULL;
    int out_len = 0;
    int final_len = 0;

    *out_plaintext = NULL;
    *out_plaintext_len = 0;

    if (PKCS5_PBKDF2_HMAC(
            passphrase,
            (int)strlen(passphrase),
            salt,
            SALT_LEN,
            (int)iterations,
            EVP_sha256(),
            KEY_LEN,
            key
        ) != 1) {
        rc = ENC_ERR_KEY_DERIVATION;
        goto cleanup;
    }

    plaintext = (unsigned char *)malloc(ciphertext_len == 0 ? 1 : ciphertext_len);
    if (!plaintext) {
        rc = ENC_ERR_MEMORY;
        goto cleanup;
    }

    ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        rc = ENC_ERR_DECRYPT;
        goto cleanup;
    }

    if (EVP_DecryptInit_ex(ctx, EVP_aes_256_gcm(), NULL, NULL, NULL) != 1 ||
        EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, IV_LEN, NULL) != 1 ||
        EVP_DecryptInit_ex(ctx, NULL, NULL, key, iv) != 1) {
        rc = ENC_ERR_DECRYPT;
        goto cleanup;
    }

    if (EVP_DecryptUpdate(ctx, plaintext, &out_len, ciphertext, (int)ciphertext_len) != 1) {
        rc = ENC_ERR_DECRYPT;
        goto cleanup;
    }

    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG, TAG_LEN, (void *)tag) != 1) {
        rc = ENC_ERR_DECRYPT;
        goto cleanup;
    }

    if (EVP_DecryptFinal_ex(ctx, plaintext + out_len, &final_len) != 1) {
        rc = ENC_ERR_DECRYPT;
        goto cleanup;
    }
    out_len += final_len;

    *out_plaintext = plaintext;
    *out_plaintext_len = (size_t)out_len;
    plaintext = NULL;
    rc = ENC_SUCCESS;

cleanup:
    if (ctx) EVP_CIPHER_CTX_free(ctx);
    if (plaintext) free(plaintext);
    OPENSSL_cleanse(key, sizeof(key));
    return rc;
}

const char *enc_strerror(int error_code) {
    switch (error_code) {
        case ENC_SUCCESS:
            return "Success";
        case ENC_ERR_INVALID_ARG:
            return "Invalid input argument";
        case ENC_ERR_MEMORY:
            return "Memory allocation failed";
        case ENC_ERR_RANDOM:
            return "Secure random generation failed";
        case ENC_ERR_KEY_DERIVATION:
            return "Key derivation failed";
        case ENC_ERR_ENCRYPT:
            return "Encryption failed";
        case ENC_ERR_DECRYPT:
            return "Decryption failed (wrong key or corrupted data)";
        case ENC_ERR_INVALID_FORMAT:
            return "Invalid encrypted file format";
        default:
            return "Unknown encryption error";
    }
}
