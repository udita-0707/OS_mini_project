/*
 * main.c - AES-256-GCM file encryption/decryption CLI + ncurses UI
 */

#include <getopt.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "../include/encryption.h"
#include "../include/file_io.h"
#include "../include/ui.h"

#define MODE_NONE 0
#define MODE_ENCRYPT 1
#define MODE_DECRYPT 2
#define MODE_MENU 3

#define MENU_ENCRYPT 1
#define MENU_DECRYPT 2
#define MENU_EXIT 3

static void print_usage(const char *program_name) {
    printf("File Encryption & Decryption Tool (AES-256-GCM)\n");
    printf("Usage: %s [OPTIONS]\n\n", program_name);
    printf("Options:\n");
    printf("  -e, --encrypt       Encrypt the input file\n");
    printf("  -d, --decrypt       Decrypt the input file\n");
    printf("  -k, --key KEY       Passphrase\n");
    printf("  -i, --input FILE    Input file path\n");
    printf("  -o, --output FILE   Output file path\n");
    printf("  -m, --menu          Launch interactive menu mode\n");
    printf("  -h, --help          Show this help message\n\n");
    printf("Examples:\n");
    printf("  %s --menu\n", program_name);
    printf("  %s -e -k \"passphrase\" -i report.pdf -o report.enc\n", program_name);
    printf("  %s -d -k \"passphrase\" -i report.enc -o report.pdf\n", program_name);
}

static int perform_operation(
    int mode,
    const char *passphrase,
    const char *input_file,
    const char *output_file,
    int use_ui
) {
    unsigned char *input_buffer = NULL;
    unsigned char *output_buffer = NULL;
    size_t input_size = 0;
    size_t output_size = 0;
    int result = EXIT_FAILURE;
    int io_result = FIO_SUCCESS;
    int enc_result = ENC_SUCCESS;

    const char *operation = (mode == MODE_ENCRYPT) ? "Encrypt" : "Decrypt";

    if (use_ui) {
        ui_clear_content();
        ui_message("Reading input file...", COLOR_ACCENT);
    } else {
        printf("Reading input file: %s\n", input_file);
    }

    io_result = read_file(input_file, &input_buffer, &input_size);
    if (io_result != FIO_SUCCESS) {
        if (use_ui) {
            ui_error(fio_strerror(io_result));
            ui_wait_key("Press any key to continue...");
        } else {
            fprintf(stderr, "Error: %s: %s\n", fio_strerror(io_result), input_file);
        }
        return EXIT_FAILURE;
    }

    if (use_ui) {
        ui_progress_bar("Processing...", 0.3f);
    } else {
        printf("Read %zu bytes\n", input_size);
    }

    if (mode == MODE_ENCRYPT) {
        enc_result = aes_encrypt_payload(
            input_buffer,
            input_size,
            passphrase,
            &output_buffer,
            &output_size
        );
    } else {
        enc_result = aes_decrypt_payload(
            input_buffer,
            input_size,
            passphrase,
            &output_buffer,
            &output_size
        );
    }

    if (enc_result != ENC_SUCCESS) {
        if (use_ui) {
            ui_error(enc_strerror(enc_result));
            ui_wait_key("Press any key to continue...");
        } else {
            fprintf(stderr, "Error: %s\n", enc_strerror(enc_result));
        }
        goto cleanup;
    }

    if (use_ui) {
        ui_progress_bar("Processing...", 0.7f);
    }

    io_result = write_file(output_file, output_buffer, output_size);
    if (io_result != FIO_SUCCESS) {
        if (use_ui) {
            ui_error(fio_strerror(io_result));
            ui_wait_key("Press any key to continue...");
        } else {
            fprintf(stderr, "Error: %s: %s\n", fio_strerror(io_result), output_file);
        }
        goto cleanup;
    }

    if (use_ui) {
        ui_progress_bar("Processing...", 1.0f);
        ui_clear_content();
        ui_show_summary(operation, "AES-256-GCM", input_file, output_file, output_size);
        ui_wait_key("Press any key to continue...");
    } else {
        printf("Successfully wrote %zu bytes to %s\n", output_size, output_file);
        printf("Done!\n");
    }

    result = EXIT_SUCCESS;

cleanup:
    if (input_buffer) free(input_buffer);
    if (output_buffer) free(output_buffer);
    return result;
}

static void run_menu_mode(void) {
    ui_init();

    while (1) {
        ui_clear_content();

        menu_item_t main_menu[] = {
            {"[1] Encrypt a File (AES-256-GCM)", MENU_ENCRYPT},
            {"[2] Decrypt a File (AES-256-GCM)", MENU_DECRYPT},
            {"[3] Exit", MENU_EXIT}
        };

        int choice = ui_show_menu("Main Menu", main_menu, 3);
        if (choice == -1 || choice == MENU_EXIT) {
            break;
        }

        const int mode = (choice == MENU_ENCRYPT) ? MODE_ENCRYPT : MODE_DECRYPT;

        char input_file[256];
        char output_file[256];
        char key[128];

        ui_clear_content();
        ui_get_string("Input file path:", input_file, sizeof(input_file));

        ui_clear_content();
        ui_get_string("Output file path:", output_file, sizeof(output_file));

        ui_clear_content();
        ui_get_string("Enter passphrase:", key, sizeof(key));

        perform_operation(mode, key, input_file, output_file, 1);
    }

    ui_cleanup();
}

int main(int argc, char *argv[]) {
    int mode = MODE_NONE;
    const char *passphrase = NULL;
    const char *input_file = NULL;
    const char *output_file = NULL;

    static struct option long_options[] = {
        {"encrypt", no_argument, 0, 'e'},
        {"decrypt", no_argument, 0, 'd'},
        {"key", required_argument, 0, 'k'},
        {"input", required_argument, 0, 'i'},
        {"output", required_argument, 0, 'o'},
        {"menu", no_argument, 0, 'm'},
        {"help", no_argument, 0, 'h'},
        {0, 0, 0, 0}
    };

    int opt;
    int option_index = 0;

    while ((opt = getopt_long(argc, argv, "edk:i:o:mh", long_options, &option_index)) != -1) {
        switch (opt) {
            case 'e':
                mode = MODE_ENCRYPT;
                break;
            case 'd':
                mode = MODE_DECRYPT;
                break;
            case 'k':
                passphrase = optarg;
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

    if (mode == MODE_MENU) {
        run_menu_mode();
        return EXIT_SUCCESS;
    }

    if (mode == MODE_NONE) {
        fprintf(stderr, "Error: Must specify -e, -d, or --menu\n");
        print_usage(argv[0]);
        return EXIT_FAILURE;
    }

    if (!passphrase || !input_file || !output_file) {
        fprintf(stderr, "Error: Must specify -k, -i, and -o\n");
        return EXIT_FAILURE;
    }

    return perform_operation(mode, passphrase, input_file, output_file, 0);
}
