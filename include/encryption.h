/*
 * encryption.h - AES-256-GCM file encryption declarations
 */

#ifndef ENCRYPTION_H
#define ENCRYPTION_H

#include <stddef.h>

#define ENC_SUCCESS 0
#define ENC_ERR_INVALID_ARG -1
#define ENC_ERR_MEMORY -2
#define ENC_ERR_RANDOM -3
#define ENC_ERR_KEY_DERIVATION -4
#define ENC_ERR_ENCRYPT -5
#define ENC_ERR_DECRYPT -6
#define ENC_ERR_INVALID_FORMAT -7

/*
 * Encrypts plaintext bytes into a binary payload:
 * [magic(4)][version(1)][iterations(4)][salt(16)][iv(12)][tag(16)][ciphertext]
 */
int aes_encrypt_payload(
    const unsigned char *plaintext,
    size_t plaintext_len,
    const char *passphrase,
    unsigned char **out_payload,
    size_t *out_payload_len
);

/*
 * Decrypts payload produced by aes_encrypt_payload back into plaintext bytes.
 */
int aes_decrypt_payload(
    const unsigned char *payload,
    size_t payload_len,
    const char *passphrase,
    unsigned char **out_plaintext,
    size_t *out_plaintext_len
);

const char *enc_strerror(int error_code);

#endif /* ENCRYPTION_H */
