import { Lexer } from './lexer';
import { SymbolTable } from './symbol-table';
import { TokenType, SymbolType, SymbolClass } from './types';
import type { Token } from './types';

export class Parser {
  private lexer: Lexer;
  private symbolTable: SymbolTable;
  private currentToken: Token;
  private ibp: number = 0; // 函数参数基址
  private currentType: SymbolType = SymbolType.INT;
  private source: string;

  constructor(source: string, debugMode: boolean = false) {
    this.source = source;
    this.lexer = new Lexer(source);
    this.symbolTable = new SymbolTable(debugMode);
    this.currentToken = this.lexer.nextToken();
  }

  // 初始化符号表 - 按照cpc.c的init_symbol_table逻辑
  private initSymbolTable(): void {
    // 添加系统调用
    this.symbolTable.addSymbol('printf', TokenType.Id, SymbolClass.Sys, SymbolType.INT, 0);
    
    // 添加关键字
    this.symbolTable.addSymbol('char', TokenType.Char, SymbolClass.Key, SymbolType.CHAR, 0);
    this.symbolTable.addSymbol('int', TokenType.Int, SymbolClass.Key, SymbolType.INT, 0);
    this.symbolTable.addSymbol('if', TokenType.If, SymbolClass.Key, SymbolType.INT, 0);
    this.symbolTable.addSymbol('else', TokenType.Else, SymbolClass.Key, SymbolType.INT, 0);
    this.symbolTable.addSymbol('while', TokenType.While, SymbolClass.Key, SymbolType.INT, 0);
    this.symbolTable.addSymbol('return', TokenType.Return, SymbolClass.Key, SymbolType.INT, 0);
    this.symbolTable.addSymbol('sizeof', TokenType.Sizeof, SymbolClass.Key, SymbolType.INT, 0);
    this.symbolTable.addSymbol('enum', TokenType.Enum, SymbolClass.Key, SymbolType.INT, 0);
  }

  // 获取下一个Token
  private nextToken(): void {
    this.currentToken = this.lexer.nextToken();
  }

  // 断言当前Token类型
  private assert(expectedType: TokenType): void {
    if (this.currentToken.type !== expectedType) {
      throw new Error(
        `Line ${this.currentToken.line}: Expected ${expectedType}, got ${this.currentToken.type}`
      );
    }
    this.nextToken();
  }

  // 解析基础类型
  private parseBaseType(): SymbolType {
    if (this.currentToken.type === TokenType.Char) {
      this.assert(TokenType.Char);
      return SymbolType.CHAR;
    } else {
      this.assert(TokenType.Int);
      return SymbolType.INT;
    }
  }

  // 解析枚举
  private parseEnum(): void {
    this.assert(TokenType.Enum);
    
    // 跳过枚举名称（如果有）
    if (this.currentToken.type !== TokenType.LeftBrace) {
      this.assert(TokenType.Id);
    }
    
    this.assert(TokenType.LeftBrace);
    
    let i = 0; // 枚举索引
    while (this.currentToken.type !== TokenType.RightBrace) {
      this.symbolTable.checkNewId(this.currentToken.value);
      const name = this.currentToken.value;
      this.assert(TokenType.Id);
      
      // 处理自定义枚举索引
      if (this.currentToken.type === TokenType.Assign) {
        this.assert(TokenType.Assign);
        this.assert(TokenType.Num);
        i = this.currentToken.value;
      }
      
      // 添加枚举符号
      this.symbolTable.addSymbol(name, TokenType.Id, SymbolClass.Num, SymbolType.INT, i++);
      
      if (this.currentToken.type === TokenType.Comma) {
        this.assert(TokenType.Comma);
      }
    }
    
    this.assert(TokenType.RightBrace);
  }

  // 解析函数参数
  private parseParam(): void {
    let i = 0;
    while (this.currentToken.type !== TokenType.RightParen) {
      const type = this.parseBaseType();
      
      // 解析指针的星号
      let pointerLevel = 0;
      while (this.currentToken.type === TokenType.Mul) {
        this.assert(TokenType.Mul);
        pointerLevel++;
      }
      
      const finalType = this.symbolTable.calculatePointerType(type, pointerLevel);
      
      this.symbolTable.checkLocalId(this.currentToken.value);
      const name = this.currentToken.value;
      this.assert(TokenType.Id);
      
      // 添加新的局部符号
      this.symbolTable.addSymbol(name, TokenType.Id, SymbolClass.Loc, finalType, i++);
      
      if (this.currentToken.type === TokenType.Comma) {
        this.assert(TokenType.Comma);
      }
    }
    this.ibp = i;
  }

  // 解析表达式
  public parseExpression(precedence: number = 0): void {
    // 简化版本：跳过表达式直到遇到分号或右大括号
    let parenCount = 0;
    
    while (this.currentToken && 
           !(this.currentToken.type === TokenType.Semicolon && parenCount === 0) &&
           !(this.currentToken.type === TokenType.RightBrace && parenCount === 0)) {
      
      if (this.currentToken.type === TokenType.LeftParen) {
        parenCount++;
      } else if (this.currentToken.type === TokenType.RightParen) {
        parenCount--;
      }
      
      this.nextToken();
    }
  }

  // 获取Token优先级
  private getTokenPrecedence(tokenType: TokenType): number {
    const precedences: { [key in TokenType]?: number } = {
      [TokenType.Assign]: 1,
      [TokenType.Cond]: 2,
      [TokenType.Lor]: 3,
      [TokenType.Land]: 4,
      [TokenType.Or]: 5,
      [TokenType.Xor]: 6,
      [TokenType.And]: 7,
      [TokenType.Eq]: 8,
      [TokenType.Ne]: 8,
      [TokenType.Lt]: 9,
      [TokenType.Gt]: 9,
      [TokenType.Le]: 9,
      [TokenType.Ge]: 9,
      [TokenType.Shl]: 10,
      [TokenType.Shr]: 10,
      [TokenType.Add]: 11,
      [TokenType.Sub]: 11,
      [TokenType.Mul]: 12,
      [TokenType.Div]: 12,
      [TokenType.Mod]: 12,
      [TokenType.Inc]: 13,
      [TokenType.Dec]: 13
    };
    return precedences[tokenType] || 0;
  }

  // 解析语句
  public parseStatement(): void {
    const tokenType = this.currentToken.type;
    
    if (tokenType === TokenType.If) {
      this.assert(TokenType.If);
      this.assert(TokenType.LeftParen);
      this.parseExpression(0); // Assign precedence
      this.assert(TokenType.RightParen);
      this.parseStatement(); // 解析true语句
      
      if (this.currentToken.type === TokenType.Else) {
        this.assert(TokenType.Else);
        this.parseStatement(); // 解析false语句
      }
    }
    else if (tokenType === TokenType.While) {
      this.assert(TokenType.While);
      this.assert(TokenType.LeftParen);
      this.parseExpression(0); // Assign precedence
      this.assert(TokenType.RightParen);
      this.parseStatement();
    }
    else if (tokenType === TokenType.Return) {
      this.assert(TokenType.Return);
      if (this.currentToken.type !== TokenType.Semicolon) {
        this.parseExpression(0); // Assign precedence
      }
      this.assert(TokenType.Semicolon);
    }
    else if (tokenType === TokenType.LeftBrace) {
      this.assert(TokenType.LeftBrace);
      while (this.currentToken.type !== TokenType.RightBrace) {
        this.parseStatement();
      }
      this.assert(TokenType.RightBrace);
    }
    else if (tokenType === TokenType.Semicolon) {
      this.assert(TokenType.Semicolon);
    }
    else if (tokenType === TokenType.Int || tokenType === TokenType.Char) {
      // 局部变量声明
      const type = this.parseBaseType();
      
      while (this.currentToken.type !== TokenType.Semicolon && 
             this.currentToken.type !== TokenType.EOF) {
        // 解析指针的星号
        let pointerLevel = 0;
        while (this.currentToken.type === TokenType.Mul) {
          this.assert(TokenType.Mul);
          pointerLevel++;
        }
        
        const finalType = this.symbolTable.calculatePointerType(type, pointerLevel);
        
        this.symbolTable.checkLocalId(this.currentToken.value);
        const name = this.currentToken.value;
        this.assert(TokenType.Id);
        
        // 检查是否是数组声明
        let arraySize = 0;
        let isArray = false;
        if (this.currentToken.type === TokenType.LeftBracket) {
          this.assert(TokenType.LeftBracket);
          // 检查下一个token是否为数字
          const nextToken = this.currentToken;
          if (nextToken.type === TokenType.Num) {
            arraySize = nextToken.value;
            this.assert(TokenType.Num);
          } else {
            throw new Error(`Line ${nextToken.line}: Array size must be a number`);
          }
          this.assert(TokenType.RightBracket);
          isArray = true;
        }
        
        // 添加新的局部符号
        this.symbolTable.addSymbol(name, TokenType.Id, SymbolClass.Loc, finalType, 0);
        const symbol = this.symbolTable.getCurrentSymbolOrThrow();
        
        // 设置数组信息
        if (isArray) {
          symbol.isArray = true;
          symbol.arraySize = arraySize;
        }
        
        if (this.currentToken.type === TokenType.Comma) {
          this.assert(TokenType.Comma);
        }
      }
      this.assert(TokenType.Semicolon);
    }
    else {
      this.parseExpression(0); // Assign precedence
      this.assert(TokenType.Semicolon);
    }
  }

  // 解析变量或函数定义
  private parseVarOrFuncDefinition(baseType: SymbolType): void {
    while (this.currentToken.type !== TokenType.Semicolon && 
           this.currentToken.type !== TokenType.RightBrace &&
           this.currentToken.type !== TokenType.EOF) {
      // 解析指针的星号
      let type = baseType;
      while (this.currentToken.type === TokenType.Mul) {
        this.assert(TokenType.Mul);
        type = SymbolType.PTR;
      }
      
      const name = this.currentToken.value;
      this.assert(TokenType.Id);
      
      // 检查是否是数组声明
      let arraySize = 0;
      let isArray = false;
      if (this.currentToken.type === TokenType.LeftBracket) {
        this.assert(TokenType.LeftBracket);
        // 检查下一个token是否为数字
        const nextToken = this.currentToken;
        if (nextToken.type === TokenType.Num) {
          arraySize = nextToken.value;
          this.assert(TokenType.Num);
        } else {
          throw new Error(`Line ${nextToken.line}: Array size must be a number`);
        }
        this.assert(TokenType.RightBracket);
        isArray = true;
      }
      
      this.symbolTable.addSymbol(name, TokenType.Id, SymbolClass.Glo, type, 0);
      const symbol = this.symbolTable.getCurrentSymbolOrThrow();
      
      // 设置数组信息
      if (isArray) {
        symbol.isArray = true;
        symbol.arraySize = arraySize;
      }
      
      if (this.currentToken.type === TokenType.LeftParen) {
        // 函数
        symbol.class = SymbolClass.Fun;
        symbol.value = 0; // 将在代码生成时设置
        
        this.assert(TokenType.LeftParen);
        this.parseParam();
        this.assert(TokenType.RightParen);
        this.assert(TokenType.LeftBrace);
        this.parseFunction();
        
        if (name === 'main') {
          this.symbolTable.setMainSymbol(symbol);
        }
        
        // 函数定义结束后，退出while循环
        break;
      } else {
        // 变量
        symbol.class = SymbolClass.Glo;
        symbol.value = 0; // 将在代码生成时设置
        
        // 处理赋值
        if (this.currentToken.type === TokenType.Assign) {
          this.assert(TokenType.Assign);
          this.assert(TokenType.Num);
          symbol.value = this.currentToken.value;
          this.nextToken();
        }
      }
      
      // 处理 int a,b,c;
      if (this.currentToken.type === TokenType.Comma) {
        this.assert(TokenType.Comma);
      }
    }
    
    // 跳过分号
    if (this.currentToken.type === TokenType.Semicolon) {
      this.assert(TokenType.Semicolon);
    }
  }

  // 解析函数
  public parseFunction(): void {
    // 简单跳过函数体
    // 当进入这个函数时，LeftBrace已经被assert了，当前token是函数体的第一个token
    let braceCount = 1;
    
    while (braceCount > 0 && this.currentToken.type !== TokenType.EOF) {
      if (this.currentToken.type === TokenType.LeftBrace) {
        braceCount++;
      } else if (this.currentToken.type === TokenType.RightBrace) {
        braceCount--;
      }
      
      if (braceCount > 0) {
        this.nextToken();
      }
    }
    
    if (this.currentToken.type === TokenType.RightBrace) {
      this.assert(TokenType.RightBrace);
    }
    
    // 恢复全局变量
    this.symbolTable.recoverAllLocals();
  }

  // 主解析函数
  public parse(): void {
    while (this.currentToken.type !== TokenType.EOF) {
      // 解析枚举
      if (this.currentToken.type === TokenType.Enum) {
        this.parseEnum();
      } 
      else if (this.currentToken.type === TokenType.Int || this.currentToken.type === TokenType.Char) {
        const baseType = this.parseBaseType();
        
        // 解析变量或函数定义
        this.parseVarOrFuncDefinition(baseType);
      } else {
        // 跳过不认识的token
        this.nextToken();
      }
    }
  }

  // 获取符号表
  public getSymbolTable(): SymbolTable {
    return this.symbolTable;
  }

  // 获取源代码
  public getSource(): string {
    return this.source;
  }
}
