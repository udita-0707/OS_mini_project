/*
 * ui.c - Terminal UI implementation using ncurses
 * 
 * File Encryption & Decryption Tool
 * OS Course Project - Phase 2
 * 
 * Uses ASCII-only characters for maximum compatibility
 */

#include "../include/ui.h"
#include <string.h>
#include <stdlib.h>

/* ASCII art banner - compatible with all terminals */
static const char *BANNER[] = {
    "+==================================================================+",
    "|  _____ _   _  ____ ______   _______ _____ ___  _   _            |",
    "| | ____| \\ | |/ ___|  _ \\ \\ / /_   _/ ____/ _ \\| \\ | |           |",
    "| |  _| |  \\| | |   | |_) \\ V /  | || |   | | | |  \\| |           |",
    "| | |___| |\\  | |___|  _ < | |   | || |___| |_| | |\\  |           |",
    "| |_____|_| \\_|\\____|_| \\_\\|_|   |_| \\_____\\___/|_| \\_|           |",
    "|                                                                  |",
    "|            [*] File Encryption & Decryption Tool [*]            |",
    "|                      OS Course Project                          |",
    "+==================================================================+"
};
#define BANNER_HEIGHT 10

/* Initialize ncurses and color pairs */
void ui_init(void) {
    initscr();              /* Start ncurses mode */
    cbreak();               /* Disable line buffering */
    noecho();               /* Don't echo input */
    keypad(stdscr, TRUE);   /* Enable arrow keys */
    curs_set(0);            /* Hide cursor */
    
    /* Initialize colors if supported */
    if (has_colors()) {
        start_color();
        use_default_colors();
        
        /* Define color pairs */
        init_pair(COLOR_HEADER,   COLOR_CYAN,    -1);
        init_pair(COLOR_MENU,     COLOR_WHITE,   -1);
        init_pair(COLOR_SELECTED, COLOR_BLACK,   COLOR_CYAN);
        init_pair(COLOR_SUCCESS,  COLOR_GREEN,   -1);
        init_pair(COLOR_ERROR,    COLOR_RED,     -1);
        init_pair(COLOR_WARNING,  COLOR_YELLOW,  -1);
        init_pair(COLOR_ACCENT,   COLOR_MAGENTA, -1);
        init_pair(COLOR_INPUT,    COLOR_WHITE,   COLOR_BLUE);
    }
}

/* Cleanup ncurses */
void ui_cleanup(void) {
    curs_set(1);    /* Restore cursor */
    endwin();       /* End ncurses mode */
}

/* Draw the application header/banner */
void ui_draw_header(void) {
    int max_y, max_x;
    getmaxyx(stdscr, max_y, max_x);
    (void)max_y;  /* Unused */
    
    attron(COLOR_PAIR(COLOR_HEADER) | A_BOLD);
    
    for (int i = 0; i < BANNER_HEIGHT; i++) {
        int x = (max_x - 68) / 2;  /* Center the banner */
        if (x < 0) x = 0;
        mvprintw(i + 1, x, "%s", BANNER[i]);
    }
    
    attroff(COLOR_PAIR(COLOR_HEADER) | A_BOLD);
    refresh();
}

/* Display a menu and get user selection */
int ui_show_menu(const char *title, menu_item_t *items, int item_count) {
    int selected = 0;
    int ch;
    int max_y, max_x;
    getmaxyx(stdscr, max_y, max_x);
    
    int menu_y = BANNER_HEIGHT + 3;
    int menu_x = (max_x - 44) / 2;
    if (menu_x < 2) menu_x = 2;
    
    while (1) {
        /* Draw title */
        attron(COLOR_PAIR(COLOR_ACCENT) | A_BOLD);
        mvprintw(menu_y, menu_x,     "+------------------------------------------+");
        mvprintw(menu_y + 1, menu_x, "|  %-38s  |", title);
        mvprintw(menu_y + 2, menu_x, "+------------------------------------------+");
        attroff(COLOR_PAIR(COLOR_ACCENT) | A_BOLD);
        
        /* Draw menu items */
        for (int i = 0; i < item_count; i++) {
            if (i == selected) {
                attron(COLOR_PAIR(COLOR_SELECTED) | A_BOLD);
            } else {
                attron(COLOR_PAIR(COLOR_MENU));
            }
            
            mvprintw(menu_y + 3 + i, menu_x, "|  %s %-36s  |", 
                    (i == selected) ? ">" : " ", items[i].label);
            
            if (i == selected) {
                attroff(COLOR_PAIR(COLOR_SELECTED) | A_BOLD);
            } else {
                attroff(COLOR_PAIR(COLOR_MENU));
            }
        }
        
        /* Draw bottom border */
        attron(COLOR_PAIR(COLOR_ACCENT));
        mvprintw(menu_y + 3 + item_count, menu_x, "+------------------------------------------+");
        attroff(COLOR_PAIR(COLOR_ACCENT));
        
        /* Instructions */
        attron(COLOR_PAIR(COLOR_WARNING));
        mvprintw(menu_y + 5 + item_count, menu_x, "   UP/DOWN: Navigate  ENTER: Select  q: Quit");
        attroff(COLOR_PAIR(COLOR_WARNING));
        
        (void)max_y; /* Suppress unused warning */
        refresh();
        
        /* Handle input */
        ch = getch();
        switch (ch) {
            case KEY_UP:
                selected = (selected - 1 + item_count) % item_count;
                break;
            case KEY_DOWN:
                selected = (selected + 1) % item_count;
                break;
            case '\n':
            case KEY_ENTER:
                return items[selected].value;
            case 'q':
            case 'Q':
                return -1;  /* Quit */
            default:
                /* Check for number keys */
                if (ch >= '1' && ch <= '9') {
                    int idx = ch - '1';
                    if (idx < item_count) {
                        return items[idx].value;
                    }
                }
                break;
        }
    }
}

/* Get string input from user with prompt */
void ui_get_string(const char *prompt, char *buffer, int max_len) {
    int max_y, max_x;
    getmaxyx(stdscr, max_y, max_x);
    (void)max_y;
    
    int y = BANNER_HEIGHT + 4;
    int x = (max_x - 50) / 2;
    if (x < 2) x = 2;
    
    /* Draw prompt */
    attron(COLOR_PAIR(COLOR_ACCENT) | A_BOLD);
    mvprintw(y, x, "%s", prompt);
    attroff(COLOR_PAIR(COLOR_ACCENT) | A_BOLD);
    
    /* Draw input field */
    attron(COLOR_PAIR(COLOR_INPUT));
    mvprintw(y + 1, x, "%-48s", " ");
    attroff(COLOR_PAIR(COLOR_INPUT));
    
    /* Enable echo for input */
    echo();
    curs_set(1);
    
    /* Get input */
    move(y + 1, x);
    attron(COLOR_PAIR(COLOR_INPUT));
    getnstr(buffer, max_len - 1);
    attroff(COLOR_PAIR(COLOR_INPUT));
    
    /* Disable echo again */
    noecho();
    curs_set(0);
}

/* Get integer input from user with prompt */
int ui_get_int(const char *prompt) {
    char buffer[32];
    ui_get_string(prompt, buffer, sizeof(buffer));
    return atoi(buffer);
}

/* Display a progress bar */
void ui_progress_bar(const char *label, float progress) {
    int max_y, max_x;
    getmaxyx(stdscr, max_y, max_x);
    (void)max_y;
    
    int y = BANNER_HEIGHT + 8;
    int x = (max_x - 50) / 2;
    if (x < 2) x = 2;
    
    int bar_width = 40;
    int filled = (int)(progress * bar_width);
    
    /* Draw label */
    attron(COLOR_PAIR(COLOR_ACCENT));
    mvprintw(y, x, "%-20s", label);
    attroff(COLOR_PAIR(COLOR_ACCENT));
    
    /* Draw progress bar */
    mvprintw(y, x + 20, "[");
    
    attron(COLOR_PAIR(COLOR_SUCCESS) | A_BOLD);
    for (int i = 0; i < filled; i++) {
        printw("#");
    }
    attroff(COLOR_PAIR(COLOR_SUCCESS) | A_BOLD);
    
    attron(COLOR_PAIR(COLOR_MENU));
    for (int i = filled; i < bar_width; i++) {
        printw("-");
    }
    attroff(COLOR_PAIR(COLOR_MENU));
    
    printw("] %3d%%", (int)(progress * 100));
    refresh();
}

/* Display a message with color */
void ui_message(const char *msg, int color_pair) {
    int max_y, max_x;
    getmaxyx(stdscr, max_y, max_x);
    (void)max_y;
    
    int y = BANNER_HEIGHT + 10;
    int x = (max_x - 50) / 2;
    if (x < 2) x = 2;
    
    attron(COLOR_PAIR(color_pair) | A_BOLD);
    mvprintw(y, x, "%s", msg);
    attroff(COLOR_PAIR(color_pair) | A_BOLD);
    refresh();
}

/* Display success message */
void ui_success(const char *msg) {
    ui_message(msg, COLOR_SUCCESS);
}

/* Display error message */
void ui_error(const char *msg) {
    ui_message(msg, COLOR_ERROR);
}

/* Wait for key press */
void ui_wait_key(const char *prompt) {
    int max_y, max_x;
    getmaxyx(stdscr, max_y, max_x);
    (void)max_y;
    
    int y = BANNER_HEIGHT + 12;
    int x = (max_x - 50) / 2;
    if (x < 2) x = 2;
    
    attron(COLOR_PAIR(COLOR_WARNING));
    mvprintw(y, x, "%s", prompt);
    attroff(COLOR_PAIR(COLOR_WARNING));
    refresh();
    getch();
}

/* Clear screen and redraw header */
void ui_clear_content(void) {
    clear();
    ui_draw_header();
    refresh();
}

/* Display file operation summary */
void ui_show_summary(const char *operation, const char *algorithm, 
                     const char *input, const char *output, size_t size) {
    int max_y, max_x;
    getmaxyx(stdscr, max_y, max_x);
    (void)max_y;
    
    int y = BANNER_HEIGHT + 4;
    int x = (max_x - 50) / 2;
    if (x < 2) x = 2;
    
    attron(COLOR_PAIR(COLOR_SUCCESS) | A_BOLD);
    mvprintw(y, x,     "+------------------------------------------------+");
    mvprintw(y + 1, x, "|           [OK] Operation Complete              |");
    mvprintw(y + 2, x, "+------------------------------------------------+");
    attroff(COLOR_PAIR(COLOR_SUCCESS) | A_BOLD);
    
    attron(COLOR_PAIR(COLOR_MENU));
    mvprintw(y + 3, x, "|  Operation:  %-33s |", operation);
    mvprintw(y + 4, x, "|  Algorithm:  %-33s |", algorithm);
    mvprintw(y + 5, x, "|  Input:      %-33s |", input);
    mvprintw(y + 6, x, "|  Output:     %-33s |", output);
    mvprintw(y + 7, x, "|  Size:       %-33zu |", size);
    attroff(COLOR_PAIR(COLOR_MENU));
    
    attron(COLOR_PAIR(COLOR_SUCCESS) | A_BOLD);
    mvprintw(y + 8, x, "+------------------------------------------------+");
    attroff(COLOR_PAIR(COLOR_SUCCESS) | A_BOLD);
    
    refresh();
}
