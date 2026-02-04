/*
 * file_io.h - File I/O operations using system calls
 * 
 * File Encryption & Decryption Tool
 * OS Course Project - Phase 1
 */

#ifndef FILE_IO_H
#define FILE_IO_H

#include <stddef.h>

/* Buffer size for file operations (8KB for efficient I/O) */
#define BUFFER_SIZE 8192

/* Error codes */
#define FIO_SUCCESS      0
#define FIO_ERR_OPEN    -1
#define FIO_ERR_READ    -2
#define FIO_ERR_WRITE   -3
#define FIO_ERR_CLOSE   -4
#define FIO_ERR_MEMORY  -5

/*
 * Read entire file into a dynamically allocated buffer
 * Uses system calls: open(), read(), close(), lseek()
 * 
 * @param filename:  Path to file to read
 * @param buffer:    Pointer to store allocated buffer (caller must free)
 * @param size:      Pointer to store file size
 * 
 * @return: FIO_SUCCESS on success, error code on failure
 */
int read_file(const char *filename, unsigned char **buffer, size_t *size);

/*
 * Write buffer to file
 * Uses system calls: open(), write(), close()
 * 
 * @param filename:  Path to output file (created if not exists)
 * @param buffer:    Data buffer to write
 * @param size:      Size of data in bytes
 * 
 * @return: FIO_SUCCESS on success, error code on failure
 */
int write_file(const char *filename, const unsigned char *buffer, size_t size);

/*
 * Get string description of error code
 * 
 * @param error_code:  Error code from read_file/write_file
 * @return: Human-readable error description
 */
const char *fio_strerror(int error_code);

#endif /* FILE_IO_H */
