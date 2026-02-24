"""
SecureVault OS - Secure Delete Service
Implements DoD 5220.22-M style secure deletion.

OS Security Concept - Secure Deletion:
When you "delete" a file normally, the OS merely removes the directory entry
and marks the disk blocks as free. The actual data remains on disk until
overwritten by new data, making forensic recovery possible.

Secure deletion overwrites the file content with random bytes multiple times
before removing it, preventing forensic recovery of the original data.

Passes:
  1. Overwrite with random bytes
  2. Overwrite with complement of random bytes
  3. Overwrite with fresh random bytes

After overwriting, the file is flushed to ensure the OS writes data
from kernel buffer cache to the physical disk, then deleted.
"""

import os


def secure_delete_file(filepath: str, passes: int = 3) -> bool:
    """
    Securely delete a file by overwriting its content multiple times.

    This prevents forensic recovery by ensuring the magnetic/flash storage
    sectors that held the file data are overwritten with pseudorandom bytes.

    Args:
        filepath: Path to the file to securely delete.
        passes: Number of overwrite passes (minimum 3 recommended).

    Returns:
        True if the file was securely deleted, False if it didn't exist.
    """
    if not os.path.exists(filepath):
        return False

    file_size = os.path.getsize(filepath)

    with open(filepath, "r+b") as f:
        for pass_num in range(passes):
            # Seek to beginning of file before each pass
            f.seek(0)

            if pass_num == 0:
                # Pass 1: Write random bytes
                # Overwrites original data with unpredictable content
                f.write(os.urandom(file_size))
            elif pass_num == 1:
                # Pass 2: Write complement pattern
                # Ensures all bit positions are flipped from pass 1
                random_data = os.urandom(file_size)
                complement = bytes(~b & 0xFF for b in random_data)
                f.write(complement)
            else:
                # Pass 3+: Write fresh random bytes
                # Final pass with new random data
                f.write(os.urandom(file_size))

            # Flush Python's internal buffer to the OS
            f.flush()

            # Force OS to flush its kernel buffer cache to physical disk.
            # This is critical: without fsync(), data might remain in
            # the OS page cache and never actually reach the disk sectors.
            os.fsync(f.fileno())

    # Finally, remove the file from the filesystem
    # Now the directory entry is removed, and the data on disk is
    # random bytes instead of the original file content.
    os.remove(filepath)
    return True
