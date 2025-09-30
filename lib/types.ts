// 基础类型定义
export type int = number;
export type char = string;

// 指令集枚举 - 按照cpc.c的顺序
export enum Instruction {
  IMM = 0,   // 立即数加载
  LEA = 1,   // 加载局部地址
  JMP = 2,   // 无条件跳转
  JZ = 3,    // 零跳转
  JNZ = 4,   // 非零跳转
  CALL = 5,  // 函数调用
  NVAR = 6,  // 新建变量栈帧
  DARG = 7,  // 删除参数栈帧
  RET = 8,   // 返回
  LI = 9,    // 加载整数
  LC = 10,   // 加载字符
  SI = 11,   // 存储整数
  SC = 12,   // 存储字符
  PUSH = 13, // 压栈
  OR = 14,     // 或运算
  XOR = 15,    // 异或运算
  AND = 16,    // 与运算
  EQ = 17,     // 等于
  NE = 18,     // 不等于
  LT = 19,     // 小于
  GT = 20,     // 大于
  LE = 21,     // 小于等于
  GE = 22,     // 大于等于
  SHL = 23,    // 左移
  SHR = 24,    // 右移
  ADD = 25,    // 加法
  SUB = 26,    // 减法
  MUL = 27,    // 乘法
  DIV = 28,    // 除法
  MOD = 29,    // 取模
  OPEN = 30,   // 打开文件
  READ = 31,   // 读取文件
  CLOS = 32,   // 关闭文件
  PRTF = 33,   // 打印
  MALC = 34,   // 内存分配
  FREE = 35,   // 内存释放
  MSET = 36,   // 内存设置
  MCMP = 37,   // 内存比较
  EXIT = 38    // 退出
}

// Token类型枚举
export enum TokenType {
  // 基础类型
  Num = "Num",
  Fun = "Fun", 
  Sys = "Sys",
  Glo = "Glo",
  Loc = "Loc",
  Id = "Id",
  
  // 关键字
  Char = "Char",
  Int = "Int", 
  Enum = "Enum",
  If = "If",
  Else = "Else",
  Return = "Return",
  Sizeof = "Sizeof",
  While = "While",
  
  // 操作符
  Assign = "=",
  Cond = "?",
  Lor = "||",
  Land = "&&", 
  Or = "|",
  Xor = "^",
  And = "&",
  Eq = "==",
  Ne = "!=",
  Lt = "<",
  Gt = ">",
  Le = "<=",
  Ge = ">=",
  Shl = "<<",
  Shr = ">>",
  Add = "+",
  Sub = "-",
  Mul = "*",
  Div = "/",
  Mod = "%",
  Inc = "++",
  Dec = "--",
  Brak = "[",
  
  // 分隔符
  Semicolon = ";",
  Comma = ",",
  Colon = ":",
  LeftParen = "(",
  RightParen = ")",
  LeftBrace = "{",
  RightBrace = "}",
  LeftBracket = "[",
  RightBracket = "]",
  Not = "!",
  Tilde = "~",
  
  // 特殊
  String = "String",
  EOF = "EOF"
}

// 符号类型
export enum SymbolType {
  CHAR = "CHAR",
  INT = "INT", 
  PTR = "PTR"
}

// 符号类别
export enum SymbolClass {
  Num = "Num",
  Fun = "Fun",
  Sys = "Sys", 
  Glo = "Glo",
  Loc = "Loc",
  Key = "Key"
}

// Token接口
export interface Token {
  type: TokenType;
  value?: any;
  line: number;
  column: number;
}

// 符号接口
export interface Symbol {
  token: TokenType;
  hash: number;
  name: string;
  class: SymbolClass;
  type: SymbolType;
  value: any;
  gClass?: SymbolClass;  // 全局类别(用于遮蔽)
  gType?: SymbolType;    // 全局类型
  gValue?: any;          // 全局值
}

// 指令接口
export interface InstructionData {
  op: Instruction;
  arg?: number;
}

// 虚拟机状态
export interface VMState {
  code: InstructionData[];
  data: number[];
  stack: number[];
  pc: number;
  sp: number;
  bp: number;
  ax: number;
  cycle: number;
}

// 编译器配置接口
export interface CompilerConfig {
  maxSize?: number;
  debugMode?: boolean;
}

// 编译结果接口
export interface CompileResult {
  code: InstructionData[];
  data: number[];
  mainIndex: number;
}

// 错误信息
export interface CompilerError {
  message: string;
  line: number;
  column: number;
}
