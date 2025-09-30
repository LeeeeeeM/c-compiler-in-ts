import { Symbol, SymbolClass, SymbolType, TokenType } from './types';

export class SymbolTable {
  private symbols: Symbol[] = [];
  private currentSymbol: Symbol | null = null;
  private mainSymbol: Symbol | null = null;
  private debugMode: boolean = false;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
    this.initializeKeywords();
  }

  // 初始化关键字和系统函数
  private initializeKeywords(): void {
    const keywords = [
      'char', 'int', 'enum', 'if', 'else', 'return', 'sizeof', 'while',
      'open', 'read', 'close', 'printf', 'malloc', 'free', 'memset', 'memcmp', 'exit', 'void', 'main'
    ];

    keywords.forEach((keyword, index) => {
      const symbol: Symbol = {
        token: this.getKeywordTokenType(keyword),
        hash: this.hashString(keyword),
        name: keyword,
        class: this.getKeywordClass(keyword),
        type: this.getKeywordType(keyword),
        value: this.getKeywordValue(keyword, index)
      };

      if (keyword === 'main') {
        this.mainSymbol = symbol;
      }

      this.symbols.push(symbol);
    });
  }

  private getKeywordTokenType(keyword: string): TokenType {
    const tokenMap: { [key: string]: TokenType } = {
      'char': TokenType.Char,
      'int': TokenType.Int,
      'enum': TokenType.Enum,
      'if': TokenType.If,
      'else': TokenType.Else,
      'return': TokenType.Return,
      'sizeof': TokenType.Sizeof,
      'while': TokenType.While,
      'void': TokenType.Char,
      'main': TokenType.Id
    };
    return tokenMap[keyword] || TokenType.Id;
  }

  private getKeywordClass(keyword: string): SymbolClass {
    const systemFunctions = ['open', 'read', 'close', 'printf', 'malloc', 'free', 'memset', 'memcmp', 'exit'];
    if (systemFunctions.includes(keyword)) {
      return SymbolClass.Sys;
    }
    return SymbolClass.Num; // 关键字作为Num类处理
  }

  private getKeywordType(keyword: string): SymbolType {
    if (keyword === 'char') return SymbolType.CHAR;
    if (keyword === 'int') return SymbolType.INT;
    return SymbolType.INT; // 默认INT类型
  }

  private getKeywordValue(keyword: string, index: number): number {
    // 系统函数的指令码映射
    const systemFunctionCodes: { [key: string]: number } = {
      'open': 30,
      'read': 31,
      'close': 32,
      'printf': 33,
      'malloc': 34,
      'free': 35,
      'memset': 36,
      'memcmp': 37,
      'exit': 38
    };
    
    if (systemFunctionCodes[keyword] !== undefined) {
      return systemFunctionCodes[keyword];
    }
    
    return index; // 非系统函数使用索引
  }

  // 计算字符串哈希值
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = hash * 147 + str.charCodeAt(i);
    }
    return (hash << 6) + str.length;
  }

  // 查找符号
  public lookupSymbol(name: string): Symbol | null {
    const hash = this.hashString(name);
    for (const symbol of this.symbols) {
      if (symbol.hash === hash && symbol.name === name) {
        this.currentSymbol = symbol;
        return symbol;
      }
    }
    return null;
  }

  // 添加新符号
  public addSymbol(name: string, tokenType: TokenType, symbolClass: SymbolClass, symbolType: SymbolType, value: any = 0): Symbol {
    const hash = this.hashString(name);
    
    // 检查是否已存在
    const existing = this.lookupSymbol(name);
    if (existing) {
      // 如果是局部变量遮蔽全局变量，允许遮蔽
      if (symbolClass === SymbolClass.Loc && existing.class === SymbolClass.Glo) {
        if (this.debugMode) {
          console.log(`Allowing local variable ${name} to shadow global variable`);
        }
        // 保存全局变量的信息
        existing.gClass = existing.class;
        existing.gType = existing.type;
        existing.gValue = existing.value;
        
        // 更新为局部变量
        existing.class = symbolClass;
        existing.type = symbolType;
        existing.value = value;
        
        this.currentSymbol = existing;
        return existing;
      } else if (existing.class === symbolClass) {
        // 相同类型的重复声明
        if (this.debugMode) {
          console.log(`Duplicate declaration: ${name} (class: ${existing.class}, new class: ${symbolClass})`);
        }
        throw new Error(`Duplicate declaration: ${name}`);
      } else {
        // 其他情况，返回已存在的符号
        this.currentSymbol = existing;
        return existing;
      }
    }

    const symbol: Symbol = {
      token: tokenType,
      hash: hash,
      name: name,
      class: symbolClass,
      type: symbolType,
      value: value
    };

    this.symbols.push(symbol);
    this.currentSymbol = symbol;
    return symbol;
  }

  // 获取当前符号
  public getCurrentSymbol(): Symbol | null {
    return this.currentSymbol;
  }

  // 获取当前符号，如果为null则抛出错误
  public getCurrentSymbolOrThrow(): Symbol {
    if (!this.currentSymbol) {
      throw new Error('No current symbol available');
    }
    return this.currentSymbol;
  }

  // 设置当前符号
  public setCurrentSymbol(symbol: Symbol): void {
    this.currentSymbol = symbol;
  }

  // 隐藏全局符号（用于局部变量遮蔽）
  public hideGlobal(): void {
    if (this.currentSymbol) {
      this.currentSymbol.gClass = this.currentSymbol.class;
      this.currentSymbol.gType = this.currentSymbol.type;
      this.currentSymbol.gValue = this.currentSymbol.value;
    }
  }

  // 恢复全局符号
  public recoverGlobal(): void {
    if (this.currentSymbol && this.currentSymbol.gClass !== undefined) {
      this.currentSymbol.class = this.currentSymbol.gClass;
      this.currentSymbol.type = this.currentSymbol.gType!;
      this.currentSymbol.value = this.currentSymbol.gValue;
    }
  }

  // 获取主函数符号
  public getMainSymbol(): Symbol | null {
    return this.mainSymbol;
  }

  // 设置主函数符号
  public setMainSymbol(symbol: Symbol): void {
    this.mainSymbol = symbol;
  }

  // 获取所有符号
  public getAllSymbols(): Symbol[] {
    return [...this.symbols];
  }

  // 恢复所有局部变量为全局状态
  public recoverAllLocals(): void {
    for (const symbol of this.symbols) {
      if (symbol.class === SymbolClass.Loc && symbol.gClass !== undefined) {
        symbol.class = symbol.gClass;
        symbol.type = symbol.gType!;
        symbol.value = symbol.gValue;
      }
    }
  }

  // 检查局部标识符
  public checkLocalId(name: string): boolean {
    const symbol = this.lookupSymbol(name);
    if (symbol && symbol.class === SymbolClass.Loc) {
      throw new Error(`Duplicate declaration: ${name}`);
    }
    // 允许局部变量遮蔽全局变量
    return true;
  }

  // 检查新标识符
  public checkNewId(name: string): boolean {
    const symbol = this.lookupSymbol(name);
    if (symbol && symbol.class !== SymbolClass.Num) { // 已存在的非关键字符号
      throw new Error(`Duplicate declaration: ${name}`);
    }
    return true;
  }

  // 计算指针类型
  public calculatePointerType(baseType: SymbolType, pointerLevel: number): SymbolType {
    if (pointerLevel === 0) return baseType;
    return SymbolType.PTR; // 简化处理，所有指针都是PTR类型
  }

  // 获取类型大小
  public getTypeSize(symbolType: SymbolType): number {
    switch (symbolType) {
      case SymbolType.CHAR: return 1;
      case SymbolType.INT: return 8;
      case SymbolType.PTR: return 8;
      default: return 8;
    }
  }
}
