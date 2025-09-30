// Token类型定义
export enum TokenType {
  // 关键字
  AUTO = 'auto',
  INT = 'int',
  CHAR = 'char',
  IF = 'if',
  ELSE = 'else',
  WHILE = 'while',
  FOR = 'for',
  RETURN = 'return',
  VOID = 'void',
  EXTERN = 'extern',
  STATIC = 'static',
  
  // 标识符
  IDENTIFIER = 'identifier',
  
  // 字面量
  NUMBER = 'number',
  STRING = 'string',
  CHARACTER = 'character',
  
  // 操作符
  PLUS = '+',
  MINUS = '-',
  MULTIPLY = '*',
  DIVIDE = '/',
  MODULO = '%',
  ASSIGN = '=',
  EQUAL = '==',
  NOT_EQUAL = '!=',
  LESS = '<',
  LESS_EQUAL = '<=',
  GREATER = '>',
  GREATER_EQUAL = '>=',
  AND = '&&',
  OR = '||',
  NOT = '!',
  
  // 位操作符
  BIT_AND = '&',
  BIT_OR = '|',
  BIT_XOR = '^',
  BIT_NOT = '~',
  SHIFT_LEFT = '<<',
  SHIFT_RIGHT = '>>',
  
  // 分隔符
  SEMICOLON = ';',
  COMMA = ',',
  DOT = '.',
  COLON = ':',
  
  // 括号
  LEFT_PAREN = '(',
  RIGHT_PAREN = ')',
  LEFT_BRACE = '{',
  RIGHT_BRACE = '}',
  LEFT_BRACKET = '[',
  RIGHT_BRACKET = ']',
  
  // 其他
  ARROW = '->',
  INCREMENT = '++',
  DECREMENT = '--',
  
  // 特殊
  EOF = 'eof',
  UNKNOWN = 'unknown'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

// 关键字映射
export const KEYWORDS: Record<string, TokenType> = {
  'auto': TokenType.AUTO,
  'int': TokenType.INT,
  'char': TokenType.CHAR,
  'if': TokenType.IF,
  'else': TokenType.ELSE,
  'while': TokenType.WHILE,
  'for': TokenType.FOR,
  'return': TokenType.RETURN,
  'void': TokenType.VOID,
  'extern': TokenType.EXTERN,
  'static': TokenType.STATIC
};