// AST节点类型定义
import { TokenType } from './tokens';

// AST节点基类
export abstract class ASTNode {
  abstract type: string;
  line: number;
  column: number;
  
  constructor(line: number, column: number) {
    this.line = line;
    this.column = column;
  }
}

// 表达式节点
export abstract class Expression extends ASTNode {
  type = 'expression';
}

// 语句节点
export abstract class Statement extends ASTNode {
  type = 'statement';
}

// 字面量表达式
export class NumberLiteral extends Expression {
  type = 'number_literal';
  value: number;
  
  constructor(value: number, line: number, column: number) {
    super(line, column);
    this.value = value;
  }
}

export class StringLiteral extends Expression {
  type = 'string_literal';
  value: string;
  
  constructor(value: string, line: number, column: number) {
    super(line, column);
    this.value = value;
  }
}

export class CharacterLiteral extends Expression {
  type = 'character_literal';
  value: string;
  
  constructor(value: string, line: number, column: number) {
    super(line, column);
    this.value = value;
  }
}

// 标识符表达式
export class Identifier extends Expression {
  type = 'identifier';
  name: string;
  
  constructor(name: string, line: number, column: number) {
    super(line, column);
    this.name = name;
  }
}

// 二元运算表达式
export class BinaryExpression extends Expression {
  type = 'binary_expression';
  operator: TokenType;
  left: Expression;
  right: Expression;
  
  constructor(operator: TokenType, left: Expression, right: Expression, line: number, column: number) {
    super(line, column);
    this.operator = operator;
    this.left = left;
    this.right = right;
  }
}

// 一元运算表达式
export class UnaryExpression extends Expression {
  type = 'unary_expression';
  operator: TokenType;
  argument: Expression;
  
  constructor(operator: TokenType, argument: Expression, line: number, column: number) {
    super(line, column);
    this.operator = operator;
    this.argument = argument;
  }
}

// 函数调用表达式
export class CallExpression extends Expression {
  type = 'call_expression';
  callee: Identifier;
  args: Expression[];
  
  constructor(callee: Identifier, args: Expression[], line: number, column: number) {
    super(line, column);
    this.callee = callee;
    this.args = args;
  }
}

// 变量声明语句
export class VariableDeclaration extends Statement {
  type = 'variable_declaration';
  varType: TokenType;
  name: Identifier;
  initializer?: Expression;
  
  constructor(varType: TokenType, name: Identifier, initializer?: Expression, line?: number, column?: number) {
    super(line || 0, column || 0);
    this.varType = varType;
    this.name = name;
    this.initializer = initializer;
  }
}

// 赋值语句
export class AssignmentStatement extends Statement {
  type = 'assignment_statement';
  target: Identifier;
  value: Expression;
  
  constructor(target: Identifier, value: Expression, line: number, column: number) {
    super(line, column);
    this.target = target;
    this.value = value;
  }
}

// 表达式语句
export class ExpressionStatement extends Statement {
  type = 'expression_statement';
  expression: Expression;
  
  constructor(expression: Expression, line: number, column: number) {
    super(line, column);
    this.expression = expression;
  }
}

// 返回语句
export class ReturnStatement extends Statement {
  type = 'return_statement';
  argument?: Expression;
  
  constructor(argument?: Expression, line?: number, column?: number) {
    super(line || 0, column || 0);
    this.argument = argument;
  }
}

// 代码块语句
export class BlockStatement extends Statement {
  type = 'block_statement';
  body: Statement[];
  
  constructor(body: Statement[], line: number, column: number) {
    super(line, column);
    this.body = body;
  }
}

// 函数声明
export class FunctionDeclaration extends Statement {
  type = 'function_declaration';
  returnType: TokenType;
  name: Identifier;
  params: VariableDeclaration[];
  body: BlockStatement;
  
  constructor(returnType: TokenType, name: Identifier, params: VariableDeclaration[], body: BlockStatement, line: number, column: number) {
    super(line, column);
    this.returnType = returnType;
    this.name = name;
    this.params = params;
    this.body = body;
  }
}

// 程序根节点
export class Program extends ASTNode {
  type = 'program';
  body: Statement[];
  
  constructor(body: Statement[], line: number, column: number) {
    super(line, column);
    this.body = body;
  }
}

// 类型定义
export type Node = 
  | Program
  | FunctionDeclaration
  | VariableDeclaration
  | AssignmentStatement
  | ExpressionStatement
  | ReturnStatement
  | BlockStatement
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | Identifier
  | NumberLiteral
  | StringLiteral
  | CharacterLiteral;