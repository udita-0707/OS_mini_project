# Makefile for File Encryption & Decryption Tool
# OS Course Project - Phase 1

# Compiler settings
CC = gcc
CFLAGS = -Wall -Wextra -g -O2 -I./include -I/opt/homebrew/opt/ncurses/include
LDFLAGS = -L/opt/homebrew/opt/ncurses/lib -lncurses

# Target executable
TARGET = encrypt_tool

# Source files
SRCS = src/main.c src/encryption.c src/file_io.c src/ui.c

# Object files
OBJS = $(SRCS:.c=.o)

# Test directory
TEST_DIR = test/test_files

# Default target
all: $(TARGET)

# Link object files
$(TARGET): $(OBJS)
	$(CC) $(OBJS) $(LDFLAGS) -o $(TARGET)
	@echo "✓ Build complete: $(TARGET)"
	@echo ""
	@echo "Run './$(TARGET) --menu' for interactive mode"
	@echo "Run './$(TARGET) --help' for CLI options"

# Compile source files
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@

# Clean build artifacts
clean:
	rm -f $(OBJS) $(TARGET)
	rm -f *.enc *.bin *.dec
	@echo "Clean complete"

# Setup test directory
setup-test:
	@mkdir -p $(TEST_DIR)

# Run tests
test: $(TARGET) setup-test
	@echo "╔══════════════════════════════════════════════════════╗"
	@echo "║          Testing File Encryption Tool                ║"
	@echo "╚══════════════════════════════════════════════════════╝"
	@echo ""
	@echo "Creating test file..."
	@echo "Hello, World! This is a test message for encryption." > $(TEST_DIR)/test_input.txt
	@echo ""
	@echo "─── Caesar Cipher Test (key=5) ───"
	@./$(TARGET) -e -a caesar -k 5 -i $(TEST_DIR)/test_input.txt -o $(TEST_DIR)/test_caesar.enc
	@./$(TARGET) -d -a caesar -k 5 -i $(TEST_DIR)/test_caesar.enc -o $(TEST_DIR)/test_caesar.dec
	@diff $(TEST_DIR)/test_input.txt $(TEST_DIR)/test_caesar.dec && echo "Caesar Cipher: PASS ✓" || echo "Caesar Cipher: FAIL ✗"
	@echo ""
	@echo "─── XOR Cipher Test (key=mykey) ───"
	@./$(TARGET) -e -a xor -k mykey -i $(TEST_DIR)/test_input.txt -o $(TEST_DIR)/test_xor.enc
	@./$(TARGET) -d -a xor -k mykey -i $(TEST_DIR)/test_xor.enc -o $(TEST_DIR)/test_xor.dec
	@diff $(TEST_DIR)/test_input.txt $(TEST_DIR)/test_xor.dec && echo "XOR Cipher: PASS ✓" || echo "XOR Cipher: FAIL ✗"
	@echo ""
	@echo "─── Binary File Test ───"
	@cp /bin/ls $(TEST_DIR)/test_binary 2>/dev/null || cp /bin/echo $(TEST_DIR)/test_binary
	@./$(TARGET) -e -a xor -k secret123 -i $(TEST_DIR)/test_binary -o $(TEST_DIR)/test_binary.enc
	@./$(TARGET) -d -a xor -k secret123 -i $(TEST_DIR)/test_binary.enc -o $(TEST_DIR)/test_binary.dec
	@diff $(TEST_DIR)/test_binary $(TEST_DIR)/test_binary.dec && echo "Binary XOR: PASS ✓" || echo "Binary XOR: FAIL ✗"
	@echo ""
	@echo "╔══════════════════════════════════════════════════════╗"
	@echo "║              All Tests Complete                      ║"
	@echo "╚══════════════════════════════════════════════════════╝"

# Clean test files
clean-test:
	rm -rf $(TEST_DIR)/*
	@echo "Test files cleaned"

# Clean all (build + tests + old test files in root)
clean-all: clean clean-test
	rm -f test_input.txt test_*.enc test_*.dec test_binary test_binary.*
	@echo "All cleaned"

# Help
help:
	@echo "Available targets:"
	@echo "  all        - Build the encryption tool (default)"
	@echo "  clean      - Remove build artifacts"
	@echo "  test       - Run automated tests"
	@echo "  clean-test - Remove test files"
	@echo "  clean-all  - Remove everything (build + tests)"
	@echo "  help       - Show this message"

.PHONY: all clean test setup-test clean-test clean-all help
