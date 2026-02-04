/*
 * main.c - Command-line and Interactive UI for encryption tool
 * 
 * File Encryption & Decryption Tool
 * OS Course Project - Phase 2
 * 
 * Usage:
 *   CLI Mode:  ./encrypt_tool -e -a caesar -k 5 -i input.txt -o output.enc
 *   Menu Mode: ./encrypt_tool --menu
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <getopt.h>

#include "../include/encryption.h"
#include "../include/file_io.h"
#include "../include/ui.h"

/* Operation modes */
#define MODE_NONE    0
#define MODE_ENCRYPT 1
#define MODE_DECRYPT 2
#define MODE_MENU    3

/* Menu choices */
#define MENU_ENCRYPT 1
#define MENU_DECRYPT 2
#define MENU_EXIT    3

#define MENU_CAESAR  1
#define MENU_XOR     2

/* Print usage information */
void print_usage(const char *program_name) {
    printf("File Encryption & Decryption Tool\n");
    printf("OS Course Project - Phase 2\n\n");
    printf("Usage: %s [OPTIONS]\n\n", program_name);
    printf("Options:\n");
    printf("  -e, --encrypt       Encrypt the input file\n");
    printf("  -d, --decrypt       Decrypt the input file\n");
    printf("  -a, --algorithm ALG Algorithm to use: 'caesar' or 'xor'\n");
    printf("  -k, --key KEY       Encryption key\n");
    printf("  -i, --input FILE    Input file path\n");
    printf("  -o, --output FILE   Output file path\n");
    printf("  -m, --menu          Launch interactive menu mode\n");
    printf("  -h, --help          Show this help message\n");
    printf("\nExamples:\n");
    printf("  # Interactive mode\n");
    printf("  %s --menu\n\n", program_name);
    printf("  # CLI mode - Encrypt with Caesar cipher\n");
    printf("  %s -e -a caesar -k 5 -i secret.txt -o secret.enc\n", program_name);
}

/* Perform the encryption/decryption operation */
int perform_operation(int mode, algorithm_t algorithm, const char *key,
                      const char *input_file, const char *output_file,
                      int use_ui) {
    unsigned char *buffer = NULL;
    size_t size = 0;
    int result;
    
    const char *operation = (mode == MODE_ENCRYPT) ? "Encrypt" : "Decrypt";
    const char *alg_name = (algorithm == ALG_CAESAR) ? "Caesar" : "XOR";
    
    /* Read input file */
    if (use_ui) {
        ui_clear_content();
        ui_message("Reading input file...", COLOR_ACCENT);
    } else {
        printf("Reading input file: %s\n", input_file);
    }
    
    result = read_file(input_file, &buffer, &size);
    if (result != FIO_SUCCESS) {
        if (use_ui) {
            ui_error(fio_strerror(result));
            ui_wait_key("Press any key to continue...");
        } else {
            fprintf(stderr, "Error: %s: %s\n", fio_strerror(result), input_file);
        }
        return EXIT_FAILURE;
    }
    
    /* Show progress */
    if (use_ui) {
        ui_progress_bar("Processing...", 0.3f);
    } else {
        printf("Read %zu bytes\n", size);
    }
    
    /* Perform cipher operation */
    switch (algorithm) {
        case ALG_CAESAR: {
            int caesar_key = atoi(key);
            if (mode == MODE_ENCRYPT) {
                caesar_encrypt(buffer, size, caesar_key);
            } else {
                caesar_decrypt(buffer, size, caesar_key);
            }
            break;
        }
        case ALG_XOR: {
            xor_cipher(buffer, size, key, strlen(key));
            break;
        }
    }
    
    if (use_ui) {
        ui_progress_bar("Processing...", 0.7f);
    }
    
    /* Write output file */
    result = write_file(output_file, buffer, size);
    if (result != FIO_SUCCESS) {
        if (use_ui) {
            ui_error(fio_strerror(result));
            ui_wait_key("Press any key to continue...");
        } else {
            fprintf(stderr, "Error: %s: %s\n", fio_strerror(result), output_file);
        }
        free(buffer);
        return EXIT_FAILURE;
    }
    
    if (use_ui) {
        ui_progress_bar("Processing...", 1.0f);
        ui_clear_content();
        ui_show_summary(operation, alg_name, input_file, output_file, size);
        ui_wait_key("Press any key to continue...");
    } else {
        printf("Successfully wrote %zu bytes to %s\n", size, output_file);
        printf("Done!\n");
    }
    
    free(buffer);
    return EXIT_SUCCESS;
}

/* Run interactive menu mode */
void run_menu_mode(void) {
    ui_init();
    
    while (1) {
        ui_clear_content();
        
        /* Main menu */
        menu_item_t main_menu[] = {
            {"[1] Encrypt a File", MENU_ENCRYPT},
            {"[2] Decrypt a File", MENU_DECRYPT},
            {"[3] Exit", MENU_EXIT}
        };
        
        int choice = ui_show_menu("Main Menu", main_menu, 3);
        
        if (choice == -1 || choice == MENU_EXIT) {
            break;
        }
        
        int mode = (choice == MENU_ENCRYPT) ? MODE_ENCRYPT : MODE_DECRYPT;
        
        /* Algorithm selection */
        ui_clear_content();
        menu_item_t alg_menu[] = {
            {"Caesar Cipher (shift)", MENU_CAESAR},
            {"XOR Cipher (password)", MENU_XOR}
        };
        
        int alg_choice = ui_show_menu("Select Algorithm", alg_menu, 2);
        if (alg_choice == -1) continue;
        
        algorithm_t algorithm = (alg_choice == MENU_CAESAR) ? ALG_CAESAR : ALG_XOR;
        
        /* Get file paths and key */
        ui_clear_content();
        
        char input_file[256];
        char output_file[256];
        char key[128];
        
        ui_get_string("Input file path (e.g., test/file.txt):", input_file, sizeof(input_file));
        
        ui_clear_content();
        ui_get_string("Output file path (e.g., test/file.enc):", output_file, sizeof(output_file));
        
        ui_clear_content();
        if (algorithm == ALG_CAESAR) {
            ui_get_string("Enter shift key (number):", key, sizeof(key));
        } else {
            ui_get_string("Enter password key:", key, sizeof(key));
        }
        
        /* Perform operation */
        perform_operation(mode, algorithm, key, input_file, output_file, 1);
    }
    
    ui_cleanup();
}

int main(int argc, char *argv[]) {
    int mode = MODE_NONE;
    algorithm_t algorithm = ALG_CAESAR;
    const char *key = NULL;
    const char *input_file = NULL;
    const char *output_file = NULL;
    int algorithm_set = 0;
    
    /* Long options for getopt */
    static struct option long_options[] = {
        {"encrypt",   no_argument,       0, 'e'},
        {"decrypt",   no_argument,       0, 'd'},
        {"algorithm", required_argument, 0, 'a'},
        {"key",       required_argument, 0, 'k'},
        {"input",     required_argument, 0, 'i'},
        {"output",    required_argument, 0, 'o'},
        {"menu",      no_argument,       0, 'm'},
        {"help",      no_argument,       0, 'h'},
        {0, 0, 0, 0}
    };
    
    int opt;
    int option_index = 0;
    
    /* Parse command-line arguments */
    while ((opt = getopt_long(argc, argv, "eda:k:i:o:mh", long_options, &option_index)) != -1) {
        switch (opt) {
            case 'e':
                mode = MODE_ENCRYPT;
                break;
            case 'd':
                mode = MODE_DECRYPT;
                break;
            case 'a':
                algorithm_set = 1;
                if (strcmp(optarg, "caesar") == 0) {
                    algorithm = ALG_CAESAR;
                } else if (strcmp(optarg, "xor") == 0) {
                    algorithm = ALG_XOR;
                } else {
                    fprintf(stderr, "Error: Unknown algorithm '%s'\n", optarg);
                    return EXIT_FAILURE;
                }
                break;
            case 'k':
                key = optarg;
                break;
            case 'i':
                input_file = optarg;
                break;
            case 'o':
                output_file = optarg;
                break;
            case 'm':
                mode = MODE_MENU;
                break;
            case 'h':
                print_usage(argv[0]);
                return EXIT_SUCCESS;
            default:
                print_usage(argv[0]);
                return EXIT_FAILURE;
        }
    }
    
    /* Interactive menu mode */
    if (mode == MODE_MENU) {
        run_menu_mode();
        return EXIT_SUCCESS;
    }
    
    /* CLI mode validation */
    if (mode == MODE_NONE) {
        fprintf(stderr, "Error: Must specify -e, -d, or --menu\n");
        print_usage(argv[0]);
        return EXIT_FAILURE;
    }
    
    if (!algorithm_set) {
        fprintf(stderr, "Error: Must specify algorithm with -a\n");
        return EXIT_FAILURE;
    }
    
    if (key == NULL || input_file == NULL || output_file == NULL) {
        fprintf(stderr, "Error: Must specify -k, -i, and -o\n");
        return EXIT_FAILURE;
    }
    
    return perform_operation(mode, algorithm, key, input_file, output_file, 0);
}
