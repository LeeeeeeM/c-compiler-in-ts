import { Instruction, InstructionData, Symbol, SymbolType, SymbolClass, TokenType, Precedence } from './types';
import { SymbolTable } from './symbol-table';
import { Parser } from './parser';
import { Lexer } from './lexer';
import * as fs from 'fs';

export class CodeGenerator {
  private code: InstructionData[] = [];
  private data: any[] = [];
  private symbolTable: SymbolTable;
  private parser: Parser;
  private ibp: number = 0;
  private currentType: SymbolType = SymbolType.INT;
  private dataPtr: number = 0;
  private lexer: any = null;
  private currentToken: any = null;

  constructor(parser: Parser) {
    this.parser = parser;
    this.symbolTable = parser.getSymbolTable();
  }

  // 发射指令
  private emit(op: Instruction, arg?: any): void {
    this.code.push({ op, arg });
  }

  // 获取当前代码位置
  private getCurrentCodeIndex(): number {
    return this.code.length;
  }

  // 设置代码位置的值
  private setCodeAt(index: number, value: any): void {
    if (index < this.code.length) {
      this.code[index].arg = value;
    }
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

  // 解析表达式 - 按照cpc.c的parse_expr逻辑
  public parseExpression(precedence: number = 0): void {
    let tmpType: SymbolType;
    let i: number;
    let tmpPtr: Symbol | null;

    // 常量数字
    if (this.currentToken.type === TokenType.Num) {
      this.emit(Instruction.IMM, this.currentToken.value);
      this.nextToken();
      this.currentType = SymbolType.INT;
    }
    // 常量字符串
    else if (this.currentToken.type === TokenType.String) {
      const strAddr = this.generateStringData(this.currentToken.value);
      this.emit(Instruction.IMM, strAddr);
      this.nextToken();
      this.currentType = SymbolType.PTR;
    }
    // sizeof
    else if (this.currentToken.type === TokenType.Sizeof) {
      this.assert(TokenType.Sizeof);
      this.assert(TokenType.LeftParen);
      this.currentType = this.parseBaseType();
      
      while (this.currentToken.type === TokenType.Mul) {
        this.assert(TokenType.Mul);
        this.currentType = SymbolType.PTR;
      }
      
      this.assert(TokenType.RightParen);
      this.emit(Instruction.IMM, this.currentType === SymbolType.CHAR ? 1 : 8);
      this.currentType = SymbolType.INT;
    }
    // 处理标识符：变量或函数
    else if (this.currentToken.type === TokenType.Id) {
      const name = this.currentToken.value;
      this.nextToken();
      
      tmpPtr = this.symbolTable.lookupSymbol(name);
      
      // 函数调用
      if (this.currentToken.type === TokenType.LeftParen) {
        this.assert(TokenType.LeftParen);
        i = 0; // 参数个数
        
        while (this.currentToken.type !== TokenType.RightParen) {
          this.parseExpression(Precedence.Assign); // Assign precedence
          this.emit(Instruction.PUSH);
          i++;
          if (this.currentToken.type === TokenType.Comma) {
            this.assert(TokenType.Comma);
          }
        }
        this.assert(TokenType.RightParen);
        
        if (tmpPtr!.class === SymbolClass.Sys) {
          // 系统调用 - 直接发射指令码
          this.emit(tmpPtr!.value as Instruction);
        } else if (tmpPtr!.class === SymbolClass.Fun) {
          // 函数调用
          this.emit(Instruction.CALL, tmpPtr!.value);
        } else {
          throw new Error(`Line ${this.currentToken.line}: Invalid function call`);
        }
        
        // 删除参数栈帧
        if (i > 0) {
          this.emit(Instruction.DARG, i);
        }
        
        this.currentType = tmpPtr!.type;
      }
      // 处理枚举值
      else if (tmpPtr!.class === SymbolClass.Num) {
        this.emit(Instruction.IMM, tmpPtr!.value);
        this.currentType = SymbolType.INT;
      }
      // 处理变量
      else {
        if (tmpPtr!.class === SymbolClass.Loc) {
          // 局部变量
          this.emit(Instruction.LEA, this.ibp - tmpPtr!.value);
        } else if (tmpPtr!.class === SymbolClass.Glo) {
          // 全局变量
          this.emit(Instruction.IMM, tmpPtr!.value);
        } else {
          throw new Error(`Line ${this.currentToken.line}: Invalid variable`);
        }
        this.currentType = tmpPtr!.type;
        this.emit(this.currentType === SymbolType.CHAR ? Instruction.LC : Instruction.LI);
      }
    }
    // 类型转换或括号
    else if (this.currentToken.type === TokenType.LeftParen) {
      this.assert(TokenType.LeftParen);
      
      if (this.currentToken.type === TokenType.Char || this.currentToken.type === TokenType.Int) {
        this.nextToken();
        tmpType = this.currentToken.type === TokenType.Char ? SymbolType.CHAR : SymbolType.INT;
        
        while (this.currentToken.type === TokenType.Mul) {
          this.assert(TokenType.Mul);
          tmpType = SymbolType.PTR;
        }
        
        this.assert(TokenType.RightParen);
        this.parseExpression(Precedence.Inc); // Inc precedence
        this.currentType = tmpType;
      } else {
        this.parseExpression(Precedence.Assign); // Assign precedence
        this.assert(TokenType.RightParen);
      }
    }
    // 解引用
    else if (this.currentToken.type === TokenType.Mul) {
      this.assert(TokenType.Mul);
      this.parseExpression(Precedence.Inc); // Inc precedence (与C版本保持一致)
      
      if (this.currentType === SymbolType.PTR) {
        this.currentType = SymbolType.INT; // 解引用后变成INT类型
        this.emit(Instruction.LI);
      } else if (this.currentType === SymbolType.INT) {
        // 允许对INT类型进行解引用（可能是二级指针）
        this.currentType = SymbolType.INT;
        this.emit(Instruction.LI);
      } else {
        throw new Error(`Line ${this.currentToken.line}: Invalid dereference`);
      }
    }
    // 取地址
    else if (this.currentToken.type === TokenType.And) {
      this.assert(TokenType.And);
      this.parseExpression(Precedence.Inc); // Inc precedence
      
      // 取地址操作：回滚加载指令（与C版本逻辑一致）
      if (this.code.length > 0) {
        const lastInstruction = this.code[this.code.length - 1];
        if (lastInstruction.op === Instruction.LI || lastInstruction.op === Instruction.LC) {
          // 回滚加载指令，LEA或IMM指令已经在前面生成了
          this.code.pop();
        } else {
          throw new Error(`Line ${this.currentToken.line}: Invalid reference`);
        }
      }
      
      this.currentType = SymbolType.PTR;
    }
    // 逻辑非
    else if (this.currentToken.type === TokenType.Not) {
      this.assert(TokenType.Not);
      this.parseExpression(Precedence.Inc); // Inc precedence
      this.emit(Instruction.PUSH);
      this.emit(Instruction.IMM, 0);
      this.emit(Instruction.EQ);
      this.currentType = SymbolType.INT;
    }
    // 按位取反
    else if (this.currentToken.type === TokenType.Tilde) {
      this.assert(TokenType.Tilde);
      this.parseExpression(Precedence.Inc); // Inc precedence
      this.emit(Instruction.PUSH);
      this.emit(Instruction.IMM, -1);
      this.emit(Instruction.XOR);
      this.currentType = SymbolType.INT;
    }
    // 正号
    else if (this.currentToken.type === TokenType.Add) {
      this.assert(TokenType.Add);
      this.parseExpression(Precedence.Inc); // Inc precedence
      this.currentType = SymbolType.INT;
    }
    // 负号
    else if (this.currentToken.type === TokenType.Sub) {
      this.assert(TokenType.Sub);
      this.parseExpression(Precedence.Inc); // Inc precedence
      this.emit(Instruction.PUSH);
      this.emit(Instruction.IMM, -1);
      this.emit(Instruction.MUL);
      this.currentType = SymbolType.INT;
    }
    // ++var --var
    else if (this.currentToken.type === TokenType.Inc || this.currentToken.type === TokenType.Dec) {
      i = this.currentToken.type === TokenType.Inc ? 1 : -1;
      this.nextToken();
      this.parseExpression(Precedence.Inc); // Inc precedence
      
      // 保存变量地址，然后加载变量值（与C版本逻辑一致）
      if (this.code[this.code.length - 1]?.op === Instruction.LC) {
        this.code[this.code.length - 1].op = Instruction.PUSH;
        this.emit(Instruction.LC);
      } else if (this.code[this.code.length - 1]?.op === Instruction.LI) {
        this.code[this.code.length - 1].op = Instruction.PUSH;
        this.emit(Instruction.LI);
      } else {
        throw new Error(`Line ${this.currentToken.line}: Invalid Inc or Dec`);
      }
      this.emit(Instruction.PUSH); // 保存变量值
      this.emit(Instruction.IMM, this.currentType === SymbolType.PTR ? 8 : 1);
      this.emit(i === 1 ? Instruction.ADD : Instruction.SUB); // 计算
      this.emit(this.currentType === SymbolType.CHAR ? Instruction.SC : Instruction.SI); // 写回变量地址
    }
    else {
      throw new Error(`Line ${this.currentToken.line}: Invalid expression`);
    }

    // 使用优先级爬升方法处理二元操作符
    while (this.getTokenPrecedence(this.currentToken.type) >= precedence) {
      tmpType = this.currentType;
      
      // 赋值
      if (this.currentToken.type === TokenType.Assign) {
        this.assert(TokenType.Assign);
        if (this.code[this.code.length - 1]?.op === Instruction.LC || 
            this.code[this.code.length - 1]?.op === Instruction.LI) {
          // 将 LC/LI 指令的操作码替换为 PUSH，保留参数（与 C 版本保持一致）
          this.code[this.code.length - 1].op = Instruction.PUSH;
        } else {
          throw new Error(`Line ${this.currentToken.line}: Invalid assignment`);
        }
        this.parseExpression(Precedence.Assign); // Assign precedence
        this.currentType = tmpType;
        this.emit(this.currentType === SymbolType.CHAR ? Instruction.SC : Instruction.SI);
      }
      // ? : 三元操作符
      else if (this.currentToken.type === TokenType.Cond) {
        this.assert(TokenType.Cond);
        this.emit(Instruction.JZ, 0);
        const jzIndex = this.code.length - 1;
        this.parseExpression(Precedence.Assign); // Assign precedence
        this.assert(TokenType.Colon);
        this.emit(Instruction.JMP, 0);
        const jmpIndex = this.code.length - 1;
        this.setCodeAt(jzIndex, this.code.length);
        this.parseExpression(Precedence.Cond); // Cond precedence
        this.setCodeAt(jmpIndex, this.code.length);
      }
      // 逻辑操作符
      else if (this.currentToken.type === TokenType.Lor) {
        this.assert(TokenType.Lor);
        this.emit(Instruction.JNZ, 0);
        const jnzIndex = this.code.length - 1;
        this.parseExpression(this.getTokenPrecedence(TokenType.Land));
        this.setCodeAt(jnzIndex, this.code.length);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Land) {
        this.assert(TokenType.Land);
        this.emit(Instruction.JZ, 0);
        const jzIndex = this.code.length - 1;
        this.parseExpression(this.getTokenPrecedence(TokenType.Or));
        this.setCodeAt(jzIndex, this.code.length);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Or) {
        this.assert(TokenType.Or);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Xor));
        this.emit(Instruction.OR);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Xor) {
        this.assert(TokenType.Xor);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.And));
        this.emit(Instruction.XOR);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.And) {
        this.assert(TokenType.And);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Eq));
        this.emit(Instruction.AND);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Eq) {
        this.assert(TokenType.Eq);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Lt));
        this.emit(Instruction.EQ);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Ne) {
        this.assert(TokenType.Ne);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Lt));
        this.emit(Instruction.NE);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Lt) {
        this.assert(TokenType.Lt);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Shl));
        this.emit(Instruction.LT);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Gt) {
        this.assert(TokenType.Gt);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Shl));
        this.emit(Instruction.GT);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Le) {
        this.assert(TokenType.Le);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Shl));
        this.emit(Instruction.LE);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Ge) {
        this.assert(TokenType.Ge);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Shl));
        this.emit(Instruction.GE);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Shl) {
        this.assert(TokenType.Shl);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Add));
        this.emit(Instruction.SHL);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Shr) {
        this.assert(TokenType.Shr);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Add));
        this.emit(Instruction.SHR);
        this.currentType = SymbolType.INT;
      }
      // 算术操作符
      else if (this.currentToken.type === TokenType.Add) {
        this.assert(TokenType.Add);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Mul));
        
        // int pointer * 8
        if (tmpType === SymbolType.PTR) {
          this.emit(Instruction.PUSH);
          this.emit(Instruction.IMM, 8);
          this.emit(Instruction.MUL);
        }
        this.emit(Instruction.ADD);
        this.currentType = tmpType;
      }
      else if (this.currentToken.type === TokenType.Sub) {
        this.assert(TokenType.Sub);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Mul));
        
        if (tmpType === SymbolType.PTR && tmpType === this.currentType) {
          // pointer - pointer, ret / 8
          this.emit(Instruction.SUB);
          this.emit(Instruction.PUSH);
          this.emit(Instruction.IMM, 8);
          this.emit(Instruction.DIV);
          this.currentType = SymbolType.INT;
        } else if (tmpType === SymbolType.PTR) {
          this.emit(Instruction.PUSH);
          this.emit(Instruction.IMM, 8);
          this.emit(Instruction.MUL);
          this.emit(Instruction.SUB);
          this.currentType = tmpType;
        } else {
          this.emit(Instruction.SUB);
        }
      }
      else if (this.currentToken.type === TokenType.Mul) {
        this.assert(TokenType.Mul);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Inc));
        this.emit(Instruction.MUL);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Div) {
        this.assert(TokenType.Div);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Inc));
        this.emit(Instruction.DIV);
        this.currentType = SymbolType.INT;
      }
      else if (this.currentToken.type === TokenType.Mod) {
        this.assert(TokenType.Mod);
        this.emit(Instruction.PUSH);
        this.parseExpression(this.getTokenPrecedence(TokenType.Inc));
        this.emit(Instruction.MOD);
        this.currentType = SymbolType.INT;
      }
      // var++, var--
      else if (this.currentToken.type === TokenType.Inc || this.currentToken.type === TokenType.Dec) {
        if (this.code[this.code.length - 1]?.op === Instruction.LC) {
          this.code[this.code.length - 1].op = Instruction.PUSH;
          this.emit(Instruction.LC);
        } else if (this.code[this.code.length - 1]?.op === Instruction.LI) {
          this.code[this.code.length - 1].op = Instruction.PUSH;
          this.emit(Instruction.LI);
        } else {
          throw new Error(`Line ${this.currentToken.line}: Invalid Inc or Dec`);
        }
        this.emit(Instruction.PUSH);
        this.emit(Instruction.IMM, this.currentType === SymbolType.PTR ? 8 : 1);
        this.emit(this.currentToken.type === TokenType.Inc ? Instruction.ADD : Instruction.SUB);
        this.emit(this.currentType === SymbolType.CHAR ? Instruction.SC : Instruction.SI);
        this.emit(Instruction.PUSH);
        this.emit(Instruction.IMM, this.currentType === SymbolType.PTR ? 8 : 1);
        this.emit(this.currentToken.type === TokenType.Inc ? Instruction.SUB : Instruction.ADD);
        this.nextToken();
      }
      // a[x] = *(a + x)
      else if (this.currentToken.type === TokenType.Brak) {
        this.assert(TokenType.Brak);
        this.emit(Instruction.PUSH);
        this.parseExpression(Precedence.Assign); // Assign precedence
        this.assert(TokenType.RightBracket);
        
        // 检查类型是否支持索引操作（与C版本逻辑一致）
        if (tmpType === SymbolType.PTR) {
          this.emit(Instruction.PUSH);
          this.emit(Instruction.IMM, 8);
          this.emit(Instruction.MUL);
        } else if (tmpType === SymbolType.INT || tmpType === SymbolType.CHAR) {
          throw new Error(`Line ${this.currentToken.line}: Invalid index operation`);
        }
        this.emit(Instruction.ADD);
        this.currentType = SymbolType.INT;
        this.emit(Instruction.LI);
      }
      else {
        // 遇到分号、右括号、右大括号等时停止解析
        if (this.currentToken.type === TokenType.Semicolon || 
            this.currentToken.type === TokenType.RightParen || 
            this.currentToken.type === TokenType.RightBrace ||
            this.currentToken.type === TokenType.Comma) {
          break;
        }
        throw new Error(`Line ${this.currentToken.line}: Invalid token ${this.currentToken.type}`);
      }
    }
  }

  // 获取Token优先级
  private getTokenPrecedence(tokenType: TokenType): number {
    const precedences: { [key in TokenType]?: number } = {
      [TokenType.Assign]: Precedence.Assign,
      [TokenType.Cond]: Precedence.Cond,
      [TokenType.Lor]: Precedence.Lor,
      [TokenType.Land]: Precedence.Land,
      [TokenType.Or]: Precedence.Or,
      [TokenType.Xor]: Precedence.Xor,
      [TokenType.And]: Precedence.And,
      [TokenType.Eq]: Precedence.Eq,
      [TokenType.Ne]: Precedence.Ne,
      [TokenType.Lt]: Precedence.Lt,
      [TokenType.Gt]: Precedence.Gt,
      [TokenType.Le]: Precedence.Le,
      [TokenType.Ge]: Precedence.Ge,
      [TokenType.Shl]: Precedence.Shl,
      [TokenType.Shr]: Precedence.Shr,
      [TokenType.Add]: Precedence.Add,
      [TokenType.Sub]: Precedence.Sub,
      [TokenType.Mul]: Precedence.Mul,
      [TokenType.Div]: Precedence.Div,
      [TokenType.Mod]: Precedence.Mod,
      [TokenType.Inc]: Precedence.Inc,
      [TokenType.Dec]: Precedence.Dec,
      [TokenType.Brak]: Precedence.Inc  // 数组访问优先级与Inc相同
    };
    return precedences[tokenType] || 0;
  }

  // 解析语句 - 按照cpc.c的parse_stmt逻辑
  public parseStatement(): void {
    if (this.currentToken.type === TokenType.If) {
      this.assert(TokenType.If);
      this.assert(TokenType.LeftParen);
      this.parseExpression(Precedence.Assign); // Assign precedence
      this.assert(TokenType.RightParen);
      this.emit(Instruction.JZ, 0);
      const jzIndex = this.code.length - 1;
      this.parseStatement(); // 解析true语句
      
      if (this.currentToken.type === TokenType.Else) {
        this.assert(TokenType.Else);
        this.setCodeAt(jzIndex, this.code.length + 1);
        this.emit(Instruction.JMP, 0);
        const jmpIndex = this.code.length - 1;
        this.parseStatement(); // 解析false语句
        this.setCodeAt(jmpIndex, this.code.length);
      } else {
        this.setCodeAt(jzIndex, this.code.length);
      }
    }
    else if (this.currentToken.type === TokenType.While) {
      this.assert(TokenType.While);
      const loopStart = this.code.length;
      this.assert(TokenType.LeftParen);
      this.parseExpression(Precedence.Assign); // Assign precedence
      this.assert(TokenType.RightParen);
      this.emit(Instruction.JZ, 0);
      const jzIndex = this.code.length - 1;
      this.parseStatement();
      this.emit(Instruction.JMP, loopStart);
      this.setCodeAt(jzIndex, this.code.length);
    }
    else if (this.currentToken.type === TokenType.Return) {
      this.assert(TokenType.Return);
      if (this.currentToken.type !== TokenType.Semicolon) {
        this.parseExpression(Precedence.Assign); // Assign precedence
      }
      this.assert(TokenType.Semicolon);
      this.emit(Instruction.RET);
    }
    else if (this.currentToken.type === TokenType.LeftBrace) {
      this.assert(TokenType.LeftBrace);
      while (this.currentToken.type !== TokenType.RightBrace) {
        this.parseStatement();
      }
      this.assert(TokenType.RightBrace);
    }
    else if (this.currentToken.type === TokenType.Semicolon) {
      this.assert(TokenType.Semicolon);
    }
    else if (this.currentToken.type === TokenType.Int || this.currentToken.type === TokenType.Char) {
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
        
        const name = this.currentToken.value;
        this.assert(TokenType.Id);
        
        // 检查是否是新的局部变量
        let symbol = this.symbolTable.lookupSymbol(name);
        if (!symbol) {
          // 添加新的局部符号
          this.symbolTable.addSymbol(name, TokenType.Id, SymbolClass.Loc, finalType, 0);
          symbol = this.symbolTable.getCurrentSymbolOrThrow();
        } else {
          // 符号已存在，隐藏全局符号并设置为局部符号
          this.symbolTable.hideGlobal();
          symbol.class = SymbolClass.Loc;
          symbol.type = finalType;
          symbol.value = 0;
        }
        
        if (this.currentToken.type === TokenType.Comma) {
          this.assert(TokenType.Comma);
        }
      }
      this.assert(TokenType.Semicolon);
    }
    else {
      this.parseExpression(Precedence.Assign); // Assign precedence
      this.assert(TokenType.Semicolon);
    }
  }

  // 解析枚举
  private parseEnum(): void {
    let i = 0; // 枚举索引
    while (this.currentToken.type !== TokenType.RightBrace) {
      const name = this.currentToken.value;
      this.assert(TokenType.Id);
      
      const symbol = this.symbolTable.lookupSymbol(name);
      if (!symbol) {
        throw new Error(`Symbol ${name} not found in symbol table`);
      }
      
      // 处理自定义枚举索引
      if (this.currentToken.type === TokenType.Assign) {
        this.assert(TokenType.Assign);
        this.assert(TokenType.Num);
        i = this.currentToken.value;
      }
      
      symbol.class = SymbolClass.Num;
      symbol.type = SymbolType.INT;
      symbol.value = i++;
      
      if (this.currentToken.type === TokenType.Comma) {
        this.assert(TokenType.Comma);
      }
    }
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
      
      const name = this.currentToken.value;
      this.assert(TokenType.Id);
      
      const symbol = this.symbolTable.lookupSymbol(name);
      if (!symbol) {
        throw new Error(`Symbol ${name} not found in symbol table`);
      }
      
      this.symbolTable.hideGlobal();
      symbol.class = SymbolClass.Loc;
      symbol.type = finalType;
      symbol.value = i++;
      
      if (this.currentToken.type === TokenType.Comma) {
        this.assert(TokenType.Comma);
      }
    }
    this.ibp = ++i;
  }

  // 解析函数 - 按照cpc.c的parse_fun逻辑
  public parseFunction(): void {
    let i = this.ibp; // bp由NVAR自己处理
    
    // 局部变量必须在前面声明
    while (this.currentToken.type === TokenType.Char || this.currentToken.type === TokenType.Int) {
      const type = this.parseBaseType();
      
      while (this.currentToken.type !== TokenType.Semicolon) {
        // 解析指针的星号
        let pointerLevel = 0;
        while (this.currentToken.type === TokenType.Mul) {
          this.assert(TokenType.Mul);
          pointerLevel++;
        }
        
        const finalType = this.symbolTable.calculatePointerType(type, pointerLevel);
        
        const name = this.currentToken.value;
        this.assert(TokenType.Id);
        
        // 检查是否是新的局部变量
        let symbol = this.symbolTable.lookupSymbol(name);
        if (!symbol) {
          // 添加新的局部符号
          this.symbolTable.addSymbol(name, TokenType.Id, SymbolClass.Loc, finalType, ++i);
          symbol = this.symbolTable.getCurrentSymbolOrThrow();
        } else {
          // 符号已存在，隐藏全局符号并设置为局部符号
          this.symbolTable.hideGlobal();
          symbol.class = SymbolClass.Loc;
          symbol.type = finalType;
          symbol.value = ++i;
        }
        
        if (this.currentToken.type === TokenType.Comma) {
          this.assert(TokenType.Comma);
        }
      }
      this.assert(TokenType.Semicolon);
    }
    
    // 新建栈帧
    this.emit(Instruction.NVAR, i - this.ibp);
    
    while (this.currentToken.type !== TokenType.RightBrace) {
      this.parseStatement();
    }
    
    if (this.code[this.code.length - 1]?.op !== Instruction.RET) {
      this.emit(Instruction.RET);
    }
    
    // 恢复全局变量
    this.symbolTable.recoverAllLocals();
  }

  // 生成函数代码
  public generateFunction(symbol: Symbol): void {
    symbol.value = this.getCurrentCodeIndex();
    
    // 生成函数入口指令
    this.emit(Instruction.NVAR, 0); // 局部变量数量将在解析时确定
    
    // 生成函数体 - 暂时生成简单的返回
    this.emit(Instruction.IMM, 0);
    this.emit(Instruction.RET);
    
    if (symbol.name === 'main') {
      this.symbolTable.setMainSymbol(symbol);
    }
  }

  // 生成全局变量代码
  public generateGlobalVariable(symbol: Symbol): void {
    symbol.value = this.dataPtr;
    // 为全局变量分配空间
    for (let i = 0; i < 8; i++) { // 64位对齐
      this.data.push(0);
    }
    this.dataPtr += 8;
  }

  // 生成字符串数据
  public generateStringData(str: string): number {
    const startIndex = this.dataPtr;
    for (let i = 0; i < str.length; i++) {
      this.data.push(str.charCodeAt(i));
    }
    this.data.push(0); // null terminator
    
    // 8字节对齐
    while (this.data.length % 8 !== 0) {
      this.data.push(0);
    }
    
    this.dataPtr = this.data.length;
    return startIndex;
  }

  // 生成代码 - 按照cpc.c的parse逻辑
  public generate(): { code: InstructionData[], data: any[], mainIndex: number } {
    // 初始化词法分析器
    this.lexer = new Lexer(this.parser.getSource());
    this.currentToken = this.lexer.nextToken();
    
    // 使用词法分析器的数据段
    this.data = this.lexer.getData();
    this.dataPtr = this.data.length;
    
    let mainIndex = -1;

    // 按照cpc.c的parse()逻辑解析源代码
    while (this.currentToken.type !== TokenType.EOF) {
      // 解析枚举
      if (this.currentToken.type === TokenType.Enum) {
        this.assert(TokenType.Enum);
        if (this.currentToken.type !== TokenType.LeftBrace) {
          this.assert(TokenType.Id); // 跳过枚举名称
        }
        this.assert(TokenType.LeftBrace);
        this.parseEnum();
        this.assert(TokenType.RightBrace);
      } 
      // 解析类型声明
      else if (this.currentToken.type === TokenType.Int || this.currentToken.type === TokenType.Char) {
        const baseType = this.parseBaseType();
        
        // 觨析变量或函数定义
        while (this.currentToken.type !== TokenType.Semicolon && this.currentToken.type !== TokenType.RightBrace) {
          // 解析指针的星号
          let type = baseType;
          while (this.currentToken.type === TokenType.Mul) {
            this.assert(TokenType.Mul);
            type = SymbolType.PTR;
          }
          
          const name = this.currentToken.value;
          this.assert(TokenType.Id);
          
          const symbol = this.symbolTable.lookupSymbol(name);
          if (!symbol) {
            throw new Error(`Symbol ${name} not found in symbol table`);
          }
          symbol.type = type;
          
          if (this.currentToken.type === TokenType.LeftParen) {
            // 函数
            symbol.class = SymbolClass.Fun;
            symbol.value = this.getCurrentCodeIndex();
            this.assert(TokenType.LeftParen);
            this.parseParam();
            this.assert(TokenType.RightParen);
            this.assert(TokenType.LeftBrace);
            this.parseFunction();
            
            if (symbol.name === 'main') {
              mainIndex = symbol.value as number;
            }
          } else {
            // 变量
            symbol.class = SymbolClass.Glo;
            this.generateGlobalVariable(symbol);
          }
          
          // 处理 int a,b,c;
          if (this.currentToken.type === TokenType.Comma) {
            this.assert(TokenType.Comma);
          }
        }
      } else {
        // 跳过不认识的token
        this.nextToken();
      }
    }

    // 如果没有找到main函数，生成一个简单的main
    if (mainIndex === -1) {
      this.emit(Instruction.IMM, 0);
      this.emit(Instruction.EXIT, 0);
      mainIndex = this.code.length - 2;
    }

    return {
      code: this.code,
      data: this.data,
      mainIndex
    };
  }

  // 写入汇编文件
  public writeAssembly(filename: string): void {
    // 指令码到名称的映射
    const instructionNames = [
      'IMM', 'LEA', 'JMP', 'JZ', 'JNZ', 'CALL', 'NVAR', 'DARG', 'RET', 'LI', 'LC', 'SI', 'SC', 'PUSH',
      'OR', 'XOR', 'AND', 'EQ', 'NE', 'LT', 'GT', 'LE', 'GE', 'SHL', 'SHR', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD',
      'OPEN', 'READ', 'CLOS', 'PRTF', 'MALC', 'FREE', 'MSET', 'MCMP', 'EXIT'
    ];
    
    let content = '';
    
    for (let i = 0; i < this.code.length; i++) {
      const instruction = this.code[i];
      const opName = typeof instruction.op === 'number' 
        ? instructionNames[instruction.op] || `UNK${instruction.op}`
        : instruction.op;
      
      content += `(${i}) ${opName.padEnd(8)}`;
      
      if (instruction.arg !== undefined) {
        content += ` ${instruction.arg}`;
      }
      
      content += '\n';
    }
    
    fs.writeFileSync(filename, content);
  }
}
