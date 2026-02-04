/*
 * ui.h - Terminal UI declarations using ncurses
 * 
 * File Encryption & Decryption Tool
 * OS Course Project - Phase 2
 */

#ifndef UI_H
#define UI_H

#include <ncurses.h>

/* Color pairs */
#define COLOR_HEADER    1   /* Cyan on black */
#define COLOR_MENU      2   /* White on black */
#define COLOR_SELECTED  3   /* Black on cyan */
#define COLOR_SUCCESS   4   /* Green on black */
#define COLOR_ERROR     5   /* Red on black */
#define COLOR_WARNING   6   /* Yellow on black */
#define COLOR_ACCENT    7   /* Magenta on black */
#define COLOR_INPUT     8   /* White on blue */

/* Menu item structure */
typedef struct {
    const char *label;
    int value;
} menu_item_t;

/* Initialize ncurses and colors */
void ui_init(void);

/* Cleanup ncurses */
void ui_cleanup(void);

/* Draw the application header/banner */
void ui_draw_header(void);

/* Display a menu and get user selection
 * Returns the value of the selected item */
int ui_show_menu(const char *title, menu_item_t *items, int item_count);

/* Get string input from user with prompt */
void ui_get_string(const char *prompt, char *buffer, int max_len);

/* Get integer input from user with prompt */
int ui_get_int(const char *prompt);

/* Display a progress bar
 * progress: 0.0 to 1.0 */
void ui_progress_bar(const char *label, float progress);

/* Display a message with color */
void ui_message(const char *msg, int color_pair);

/* Display success message */
void ui_success(const char *msg);

/* Display error message */
void ui_error(const char *msg);

/* Wait for key press */
void ui_wait_key(const char *prompt);

/* Clear screen and redraw header */
void ui_clear_content(void);

/* Display file operation summary */
void ui_show_summary(const char *operation, const char *algorithm, 
                     const char *input, const char *output, size_t size);

#endif /* UI_H */
