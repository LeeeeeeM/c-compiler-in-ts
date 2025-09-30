import { Token, TokenType } from './types';

export class Lexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  private currentToken: Token | null = null;
  private data: number[] = [];
  private dataPtr: number = 0;

  constructor(source: string) {
    this.source = source;
  }

  // 获取数据段
  public getData(): number[] {
    return this.data;
  }

  // 获取下一个字符
  private peek(): string {
    if (this.position >= this.source.length) return '\0';
    return this.source[this.position];
  }

  // 消费当前字符
  private consume(): string {
    if (this.position >= this.source.length) return '\0';
    const char = this.source[this.position++];
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  // 跳过空白字符
  private skipWhitespace(): void {
    while (this.position < this.source.length) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.consume();
      } else if (char === '\n') {
        this.consume();
      } else {
        break;
      }
    }
  }

  // 跳过注释
  private skipComment(): void {
    if (this.peek() === '/') {
      this.consume(); // 消费第一个 '/'
      if (this.peek() === '/') {
        // 单行注释
        this.consume(); // 消费第二个 '/'
        while (this.position < this.source.length && this.peek() !== '\n') {
          this.consume();
        }
      } else if (this.peek() === '*') {
        // 多行注释
        this.consume(); // 消费 '*'
        while (this.position < this.source.length) {
          if (this.peek() === '*' && this.position + 1 < this.source.length && this.source[this.position + 1] === '/') {
            this.consume(); // 消费 '*'
            this.consume(); // 消费 '/'
            break;
          }
          this.consume();
        }
      }
    }
  }

  // 解析标识符或关键字
  private parseIdentifier(): Token {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;

    while (this.position < this.source.length) {
      const char = this.peek();
      if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || 
          (char >= '0' && char <= '9') || char === '_') {
        this.consume();
      } else {
        break;
      }
    }

    const identifier = this.source.slice(start, this.position);
    
    // 检查是否是关键字
    const keywordMap: { [key: string]: TokenType } = {
      'char': TokenType.Char,
      'int': TokenType.Int,
      'enum': TokenType.Enum,
      'if': TokenType.If,
      'else': TokenType.Else,
      'return': TokenType.Return,
      'sizeof': TokenType.Sizeof,
      'while': TokenType.While,
      'void': TokenType.Char, // void 作为特殊类型
      'main': TokenType.Id
    };

    const tokenType = keywordMap[identifier] || TokenType.Id;

    return {
      type: tokenType,
      value: identifier,
      line: startLine,
      column: startColumn
    };
  }

  // 解析数字
  private parseNumber(): Token {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    let value = 0;

    if (this.peek() === '0' && (this.position + 1 < this.source.length)) {
      const nextChar = this.source[this.position + 1];
      if (nextChar === 'x' || nextChar === 'X') {
        // 十六进制
        this.consume(); // 消费 '0'
        this.consume(); // 消费 'x' 或 'X'
        while (this.position < this.source.length) {
          const char = this.peek();
          if ((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F')) {
            const digit = this.consume();
            value = value * 16 + parseInt(digit, 16);
          } else {
            break;
          }
        }
      } else if (nextChar >= '0' && nextChar <= '7') {
        // 八进制
        this.consume(); // 消费 '0'
        while (this.position < this.source.length) {
          const char = this.peek();
          if (char >= '0' && char <= '7') {
            const digit = this.consume();
            value = value * 8 + parseInt(digit);
          } else {
            break;
          }
        }
      } else {
        // 十进制 0
        this.consume();
        value = 0;
      }
    } else {
      // 十进制
      while (this.position < this.source.length) {
        const char = this.peek();
        if (char >= '0' && char <= '9') {
          const digit = this.consume();
          value = value * 10 + parseInt(digit);
        } else {
          break;
        }
      }
    }

    return {
      type: TokenType.Num,
      value: value,
      line: startLine,
      column: startColumn
    };
  }

  // 解析字符串
  private parseString(): Token {
    const startLine = this.line;
    const startColumn = this.column - 1;
    const quote = this.consume(); // 消费引号
    let value = '';

    while (this.position < this.source.length && this.peek() !== quote) {
      let char = this.consume();
      if (char === '\\') {
        // 转义字符
        if (this.position < this.source.length) {
          const nextChar = this.consume();
          switch (nextChar) {
            case 'n': value += '\n'; break;
            case 't': value += '\t'; break;
            case 'r': value += '\r'; break;
            case '\\': value += '\\'; break;
            case '"': value += '"'; break;
            case '\'': value += '\''; break;
            default: value += nextChar; break;
          }
        }
      } else {
        value += char;
      }
    }

    if (this.position < this.source.length) {
      this.consume(); // 消费结束引号
    }

    // 对于字符串，直接写入数据段并返回地址（与C版本保持一致）
    if (quote === '"') {
      const startIndex = this.dataPtr;
      for (let i = 0; i < value.length; i++) {
        this.data.push(value.charCodeAt(i));
      }
      this.data.push(0); // null terminator
      
      // 8字节对齐
      while (this.data.length % 8 !== 0) {
        this.data.push(0);
      }
      
      this.dataPtr = this.data.length;
      
      return {
        type: TokenType.String,
        value: startIndex, // 返回字符串在数据段中的地址
        line: startLine,
        column: startColumn
      };
    } else {
      return {
        type: TokenType.Num,
        value: value.charCodeAt(0),
        line: startLine,
        column: startColumn
      };
    }
  }

  // 获取下一个Token
  public nextToken(): Token {
    this.skipWhitespace();

    if (this.position >= this.source.length) {
      return {
        type: TokenType.EOF,
        line: this.line,
        column: this.column
      };
    }

    const char = this.peek();
    const startLine = this.line;
    const startColumn = this.column;

    // 标识符或关键字
    if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_') {
      return this.parseIdentifier();
    }

    // 数字
    if (char >= '0' && char <= '9') {
      return this.parseNumber();
    }

    // 字符串或字符
    if (char === '"' || char === '\'') {
      return this.parseString();
    }

    // 注释
    if (char === '/') {
      if (this.peek() === '/' || this.peek() === '*') {
        this.skipComment();
        return this.nextToken(); // 递归获取下一个token
      } else {
        this.consume();
        return {
          type: TokenType.Div,
          line: startLine,
          column: startColumn
        };
      }
    }

    // 宏定义
    if (char === '#') {
      this.consume();
      while (this.position < this.source.length && this.peek() !== '\n') {
        this.consume();
      }
      return this.nextToken(); // 递归获取下一个token
    }

    // 操作符
    this.consume(); // 消费当前字符
    switch (char) {
      case '=':
        if (this.peek() === '=') {
          this.consume();
          return { type: TokenType.Eq, line: startLine, column: startColumn };
        }
        return { type: TokenType.Assign, line: startLine, column: startColumn };

      case '+':
        if (this.peek() === '+') {
          this.consume();
          return { type: TokenType.Inc, line: startLine, column: startColumn };
        }
        return { type: TokenType.Add, line: startLine, column: startColumn };

      case '-':
        if (this.peek() === '-') {
          this.consume();
          return { type: TokenType.Dec, line: startLine, column: startColumn };
        }
        return { type: TokenType.Sub, line: startLine, column: startColumn };

      case '!':
        if (this.peek() === '=') {
          this.consume();
          return { type: TokenType.Ne, line: startLine, column: startColumn };
        }
        return { type: TokenType.Not, line: startLine, column: startColumn };

      case '<':
        if (this.peek() === '=') {
          this.consume();
          return { type: TokenType.Le, line: startLine, column: startColumn };
        } else if (this.peek() === '<') {
          this.consume();
          return { type: TokenType.Shl, line: startLine, column: startColumn };
        }
        return { type: TokenType.Lt, line: startLine, column: startColumn };

      case '>':
        if (this.peek() === '=') {
          this.consume();
          return { type: TokenType.Ge, line: startLine, column: startColumn };
        } else if (this.peek() === '>') {
          this.consume();
          return { type: TokenType.Shr, line: startLine, column: startColumn };
        }
        return { type: TokenType.Gt, line: startLine, column: startColumn };

      case '|':
        if (this.peek() === '|') {
          this.consume();
          return { type: TokenType.Lor, line: startLine, column: startColumn };
        }
        return { type: TokenType.Or, line: startLine, column: startColumn };

      case '&':
        if (this.peek() === '&') {
          this.consume();
          return { type: TokenType.Land, line: startLine, column: startColumn };
        }
        return { type: TokenType.And, line: startLine, column: startColumn };

      case '^':
        return { type: TokenType.Xor, line: startLine, column: startColumn };

      case '%':
        return { type: TokenType.Mod, line: startLine, column: startColumn };

      case '*':
        return { type: TokenType.Mul, line: startLine, column: startColumn };

      case '[':
        return { type: TokenType.Brak, line: startLine, column: startColumn };

      case '?':
        return { type: TokenType.Cond, line: startLine, column: startColumn };

      case ';':
        return { type: TokenType.Semicolon, line: startLine, column: startColumn };

      case ',':
        return { type: TokenType.Comma, line: startLine, column: startColumn };

      case ':':
        return { type: TokenType.Colon, line: startLine, column: startColumn };

      case '(':
        return { type: TokenType.LeftParen, line: startLine, column: startColumn };

      case ')':
        return { type: TokenType.RightParen, line: startLine, column: startColumn };

      case '{':
        return { type: TokenType.LeftBrace, line: startLine, column: startColumn };

      case '}':
        return { type: TokenType.RightBrace, line: startLine, column: startColumn };

      case ']':
        return { type: TokenType.RightBracket, line: startLine, column: startColumn };

      case '~':
        return { type: TokenType.Tilde, line: startLine, column: startColumn };

      default:
        return {
          type: TokenType.EOF,
          line: startLine,
          column: startColumn
        };
    }
  }

  // 预览下一个Token
  public peekToken(): Token {
    const savedPosition = this.position;
    const savedLine = this.line;
    const savedColumn = this.column;
    
    const token = this.nextToken();
    
    this.position = savedPosition;
    this.line = savedLine;
    this.column = savedColumn;
    
    return token;
  }

  // 预览下一个Token（别名）
  public peekNextToken(): Token {
    return this.peekToken();
  }

  // 预览指定位置后的Token
  public peekTokenAfter(offset: number): Token {
    const savedPosition = this.position;
    const savedLine = this.line;
    const savedColumn = this.column;
    
    // 跳过指定数量的Token
    for (let i = 0; i < offset; i++) {
      this.nextToken();
    }
    
    const token = this.nextToken();
    
    this.position = savedPosition;
    this.line = savedLine;
    this.column = savedColumn;
    
    return token;
  }
}
