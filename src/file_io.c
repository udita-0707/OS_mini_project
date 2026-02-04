/*
 * file_io.c - File I/O using POSIX system calls
 * 
 * File Encryption & Decryption Tool
 * OS Course Project - Phase 1
 * 
 * Demonstrates OS concepts:
 * - System calls: open(), read(), write(), close(), lseek()
 * - File descriptors
 * - User-kernel boundary interaction
 * - Error handling with errno
 */

#include "../include/file_io.h"

#include <fcntl.h>      /* File control: open(), O_RDONLY, O_WRONLY, etc. */
#include <unistd.h>     /* POSIX API: read(), write(), close(), lseek() */
#include <stdlib.h>     /* Memory: malloc(), free() */
#include <errno.h>      /* Error handling */
#include <sys/stat.h>   /* File status */

/*
 * Read entire file into memory using system calls
 * 
 * System calls used:
 * - open()  : Open file and get file descriptor
 * - lseek() : Move to end to get file size
 * - read()  : Read data into buffer
 * - close() : Release file descriptor
 */
int read_file(const char *filename, unsigned char **buffer, size_t *size) {
    int fd;
    off_t file_size;
    ssize_t bytes_read;
    
    /* Open file for reading only */
    fd = open(filename, O_RDONLY);
    if (fd == -1) {
        return FIO_ERR_OPEN;
    }
    
    /* Get file size by seeking to end */
    file_size = lseek(fd, 0, SEEK_END);
    if (file_size == -1) {
        close(fd);
        return FIO_ERR_READ;
    }
    
    /* Seek back to beginning */
    if (lseek(fd, 0, SEEK_SET) == -1) {
        close(fd);
        return FIO_ERR_READ;
    }
    
    /* Allocate buffer for file contents */
    *buffer = (unsigned char *)malloc(file_size);
    if (*buffer == NULL) {
        close(fd);
        return FIO_ERR_MEMORY;
    }
    
    /* Read entire file into buffer */
    bytes_read = read(fd, *buffer, file_size);
    if (bytes_read != file_size) {
        free(*buffer);
        *buffer = NULL;
        close(fd);
        return FIO_ERR_READ;
    }
    
    *size = (size_t)file_size;
    
    /* Close file descriptor */
    if (close(fd) == -1) {
        /* File was read successfully, but close failed - still return success */
        /* In production, you might want to handle this differently */
    }
    
    return FIO_SUCCESS;
}

/*
 * Write buffer to file using system calls
 * 
 * System calls used:
 * - open()  : Create/truncate file and get file descriptor
 * - write() : Write data from buffer
 * - close() : Release file descriptor
 */
int write_file(const char *filename, const unsigned char *buffer, size_t size) {
    int fd;
    ssize_t bytes_written;
    
    /* 
     * Open/create file for writing
     * O_WRONLY : Write only
     * O_CREAT  : Create if doesn't exist
     * O_TRUNC  : Truncate if exists
     * 0644    : Permissions (rw-r--r--)
     */
    fd = open(filename, O_WRONLY | O_CREAT | O_TRUNC, 0644);
    if (fd == -1) {
        return FIO_ERR_OPEN;
    }
    
    /* Write entire buffer to file */
    bytes_written = write(fd, buffer, size);
    if (bytes_written == -1 || (size_t)bytes_written != size) {
        close(fd);
        return FIO_ERR_WRITE;
    }
    
    /* Close file descriptor */
    if (close(fd) == -1) {
        return FIO_ERR_CLOSE;
    }
    
    return FIO_SUCCESS;
}

/*
 * Get human-readable error description
 */
const char *fio_strerror(int error_code) {
    switch (error_code) {
        case FIO_SUCCESS:
            return "Success";
        case FIO_ERR_OPEN:
            return "Failed to open file";
        case FIO_ERR_READ:
            return "Failed to read file";
        case FIO_ERR_WRITE:
            return "Failed to write file";
        case FIO_ERR_CLOSE:
            return "Failed to close file";
        case FIO_ERR_MEMORY:
            return "Memory allocation failed";
        default:
            return "Unknown error";
    }
}
