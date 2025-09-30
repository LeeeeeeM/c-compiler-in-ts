#include <fcntl.h>
#include <unistd.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <memory.h>
#include <string.h>

// classes/keywords, Do not support for.
enum {Num = 128, Fun, Sys, Glo, Loc, Id,
    Char, Int, Enum, If, Else, Return, Sizeof, While,
    // operators in precedence order.
    Assign, Cond, Lor, Land, Or, Xor, And, Eq, Ne, Lt, Gt, Le, Ge,
    Shl, Shr, Add, Sub, Mul, Div, Mod, Inc, Dec, Brak};

// fields of symbol_table: copy from c4, rename HXX to GXX
enum {Token, Hash, Name, Class, Type, Value, GClass, GType, GValue, SymSize};

// types of variables & functions in symbol_table
enum {CHAR, INT, PTR};

// src code & dump
char* src;

// symbol table & pointer
int * symbol_table,
    * symbol_ptr;

int token, token_val;
int line;
int token_count = 0;

void tokenize() {
    char* ch_ptr;
    while((token = *src++)) {
        if (token == '\n') line++;
        // skip marco
        else if (token == '#') while (*src != 0 && *src != '\n') src++;
        // handle symbol
        else if ((token >= 'a' && token <= 'z') || (token >= 'A' && token <= 'Z') || (token == '_')) {
            ch_ptr = src - 1;
            while ((*src >= 'a' && *src <= 'z') || (*src >= 'A' && *src <= 'Z')
                    || (*src >= '0' && *src <= '9') || (*src == '_'))
                // use token store hash value
                token = token * 147 + *src++;
            // keep hash
            token = (token << 6) + (src - ch_ptr);
            
            // Check if it's a keyword
            if (!memcmp(ch_ptr, "char", 4) && (src - ch_ptr) == 4) {
                printf("Token %d: %d - char (line %d)\n", token_count++, Char, line);
            } else if (!memcmp(ch_ptr, "int", 3) && (src - ch_ptr) == 3) {
                printf("Token %d: %d - int (line %d)\n", token_count++, Int, line);
            } else if (!memcmp(ch_ptr, "enum", 4) && (src - ch_ptr) == 4) {
                printf("Token %d: %d - enum (line %d)\n", token_count++, Enum, line);
            } else if (!memcmp(ch_ptr, "if", 2) && (src - ch_ptr) == 2) {
                printf("Token %d: %d - if (line %d)\n", token_count++, If, line);
            } else if (!memcmp(ch_ptr, "else", 4) && (src - ch_ptr) == 4) {
                printf("Token %d: %d - else (line %d)\n", token_count++, Else, line);
            } else if (!memcmp(ch_ptr, "return", 6) && (src - ch_ptr) == 6) {
                printf("Token %d: %d - return (line %d)\n", token_count++, Return, line);
            } else if (!memcmp(ch_ptr, "sizeof", 6) && (src - ch_ptr) == 6) {
                printf("Token %d: %d - sizeof (line %d)\n", token_count++, Sizeof, line);
            } else if (!memcmp(ch_ptr, "while", 5) && (src - ch_ptr) == 5) {
                printf("Token %d: %d - while (line %d)\n", token_count++, While, line);
            } else {
                printf("Token %d: %d - %.*s (line %d)\n", token_count++, Id, (int)(src - ch_ptr), ch_ptr, line);
            }
            return;
        }
        // handle number
        else if (token >= '0' && token <= '9') {
            // DEC, ch_ptr with 1 - 9
            if ((token_val = token - '0'))
                while (*src >= '0' && *src <= '9') token_val = token_val * 10 + *src++ - '0';
            //HEX, ch_ptr with 0x
            else if (*src == 'x' || *src == 'X')
                while ((token = *++src) && ((token >= '0' && token <= '9') || (token >= 'a' && token <= 'f')
                        || (token >= 'A' && token <= 'F')))
                    // COOL!
                    token_val = token_val * 16 + (token & 0xF) + (token >= 'A' ? 9 : 0);
            // OCT, start with 0
            else while (*src >= '0' && *src <= '7') token_val = token_val * 8 + *src++ - '0';
            token = Num;
            printf("Token %d: %d - %d (line %d)\n", token_count++, token, token_val, line);
            return;
        }
        // handle string & char
        else if (token == '"' || token == '\'') {
            ch_ptr = src;
            while (*src != 0 && *src != token) {
                if (*src == '\\') {
                    src++;
                    if (*src == 'n') *src = '\n';
                    else if (*src == 't') *src = '\t';
                    else if (*src == 'r') *src = '\r';
                    else if (*src == '\\') *src = '\\';
                    else if (*src == '"') *src = '"';
                    else if (*src == '\'') *src = '\'';
                }
                src++;
            }
            if (token == '"') {
                printf("Token %d: %d - %.*s (line %d)\n", token_count++, token, (int)(src - ch_ptr), ch_ptr, line);
            } else {
                printf("Token %d: %d - %d (line %d)\n", token_count++, token, *ch_ptr, line);
            }
            src++;
            return;
        }
        // handle comments
        else if (token == '/') {
            if (*src == '/') {
                while (*src != 0 && *src != '\n') src++;
            } else if (*src == '*') {
                src++;
                while (*src != 0 && !(*src == '*' && *(src + 1) == '/')) src++;
                if (*src == '*') src += 2;
            } else {
                printf("Token %d: %d - / (line %d)\n", token_count++, token, line);
                return;
            }
        }
        // handle operators
        else if (token == '=') {
            if (*src == '=') {
                src++;
                printf("Token %d: %d - == (line %d)\n", token_count++, Eq, line);
            } else {
                printf("Token %d: %d - = (line %d)\n", token_count++, Assign, line);
            }
            return;
        }
        else if (token == '+') {
            if (*src == '+') {
                src++;
                printf("Token %d: %d - ++ (line %d)\n", token_count++, Inc, line);
            } else {
                printf("Token %d: %d - + (line %d)\n", token_count++, Add, line);
            }
            return;
        }
        else if (token == '-') {
            if (*src == '-') {
                src++;
                printf("Token %d: %d - -- (line %d)\n", token_count++, Dec, line);
            } else {
                printf("Token %d: %d - - (line %d)\n", token_count++, Sub, line);
            }
            return;
        }
        else if (token == '!') {
            if (*src == '=') {
                src++;
                printf("Token %d: %d - != (line %d)\n", token_count++, Ne, line);
            } else {
                printf("Token %d: %d - ! (line %d)\n", token_count++, token, line);
            }
            return;
        }
        else if (token == '<') {
            if (*src == '=') {
                src++;
                printf("Token %d: %d - <= (line %d)\n", token_count++, Le, line);
            } else if (*src == '<') {
                src++;
                printf("Token %d: %d - << (line %d)\n", token_count++, Shl, line);
            } else {
                printf("Token %d: %d - < (line %d)\n", token_count++, Lt, line);
            }
            return;
        }
        else if (token == '>') {
            if (*src == '=') {
                src++;
                printf("Token %d: %d - >= (line %d)\n", token_count++, Ge, line);
            } else if (*src == '>') {
                src++;
                printf("Token %d: %d - >> (line %d)\n", token_count++, Shr, line);
            } else {
                printf("Token %d: %d - > (line %d)\n", token_count++, Gt, line);
            }
            return;
        }
        else if (token == '|') {
            if (*src == '|') {
                src++;
                printf("Token %d: %d - || (line %d)\n", token_count++, Lor, line);
            } else {
                printf("Token %d: %d - | (line %d)\n", token_count++, Or, line);
            }
            return;
        }
        else if (token == '&') {
            if (*src == '&') {
                src++;
                printf("Token %d: %d - && (line %d)\n", token_count++, Land, line);
            } else {
                printf("Token %d: %d - & (line %d)\n", token_count++, And, line);
            }
            return;
        }
        else if (token == '^') {
            printf("Token %d: %d - ^ (line %d)\n", token_count++, Xor, line);
            return;
        }
        else if (token == '%') {
            printf("Token %d: %d - %% (line %d)\n", token_count++, Mod, line);
            return;
        }
        else if (token == '*') {
            printf("Token %d: %d - * (line %d)\n", token_count++, Mul, line);
            return;
        }
        else if (token == '[') {
            printf("Token %d: %d - [ (line %d)\n", token_count++, Brak, line);
            return;
        }
        else if (token == '?') {
            printf("Token %d: %d - ? (line %d)\n", token_count++, Cond, line);
            return;
        }
        else if (token == ';') {
            printf("Token %d: %d - ; (line %d)\n", token_count++, token, line);
            return;
        }
        else if (token == ',') {
            printf("Token %d: %d - , (line %d)\n", token_count++, token, line);
            return;
        }
        else if (token == ':') {
            printf("Token %d: %d - : (line %d)\n", token_count++, token, line);
            return;
        }
        else if (token == '(') {
            printf("Token %d: %d - ( (line %d)\n", token_count++, token, line);
            return;
        }
        else if (token == ')') {
            printf("Token %d: %d - ) (line %d)\n", token_count++, token, line);
            return;
        }
        else if (token == '{') {
            printf("Token %d: %d - { (line %d)\n", token_count++, token, line);
            return;
        }
        else if (token == '}') {
            printf("Token %d: %d - } (line %d)\n", token_count++, token, line);
            return;
        }
        else if (token == ']') {
            printf("Token %d: %d - ] (line %d)\n", token_count++, token, line);
            return;
        }
        else if (token == '~') {
            printf("Token %d: %d - ~ (line %d)\n", token_count++, token, line);
            return;
        }
    }
    printf("Token %d: %d - EOF (line %d)\n", token_count++, 0, line);
}

int main(int argc, char **argv) {
    int fd;
    int size;
    
    if (argc < 2) {
        printf("usage: %s <file>\n", argv[0]);
        return -1;
    }
    
    if ((fd = open(argv[1], 0)) < 0) {
        printf("could not open(%s)\n", argv[1]);
        return -1;
    }
    
    size = lseek(fd, 0, SEEK_END);
    lseek(fd, 0, SEEK_SET);
    
    src = malloc(size);
    read(fd, src, size);
    close(fd);
    
    symbol_table = malloc(1024 * SymSize * sizeof(int));
    symbol_ptr = symbol_table;
    
    line = 1;
    
    printf("=== Token Stream ===\n");
    while (*src) {
        tokenize();
    }
    printf("=== End Token Stream ===\n");
    
    return 0;
}
