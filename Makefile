# Makefile for File Encryption & Decryption Tool
# OS Course Project - Phase 1

# Compiler settings
CC = gcc
CFLAGS = -Wall -Wextra -g -O2 -I./include -I/opt/homebrew/opt/ncurses/include -I/opt/homebrew/opt/openssl@3/include
LDFLAGS = -L/opt/homebrew/opt/ncurses/lib -L/opt/homebrew/opt/openssl@3/lib -lncurses -lcrypto

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
	@echo "─── AES-256-GCM Text Roundtrip Test ───"
	@./$(TARGET) -e -k mykey -i $(TEST_DIR)/test_input.txt -o $(TEST_DIR)/test_text.enc
	@./$(TARGET) -d -k mykey -i $(TEST_DIR)/test_text.enc -o $(TEST_DIR)/test_text.dec
	@diff $(TEST_DIR)/test_input.txt $(TEST_DIR)/test_text.dec && echo "AES Text: PASS ✓" || echo "AES Text: FAIL ✗"
	@echo ""
	@echo "─── AES-256-GCM Binary File Test ───"
	@cp /bin/ls $(TEST_DIR)/test_binary 2>/dev/null || cp /bin/echo $(TEST_DIR)/test_binary
	@./$(TARGET) -e -k secret123 -i $(TEST_DIR)/test_binary -o $(TEST_DIR)/test_binary.enc
	@./$(TARGET) -d -k secret123 -i $(TEST_DIR)/test_binary.enc -o $(TEST_DIR)/test_binary.dec
	@diff $(TEST_DIR)/test_binary $(TEST_DIR)/test_binary.dec && echo "AES Binary: PASS ✓" || echo "AES Binary: FAIL ✗"
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
