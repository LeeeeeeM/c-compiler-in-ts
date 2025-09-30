// 虚拟机指令集定义
export enum Instruction {
  // 数据操作指令
  IMM = 'IMM',     // 立即数加载
  LEA = 'LEA',     // 加载有效地址
  LC = 'LC',       // 加载字符
  LI = 'LI',       // 加载整数
  SC = 'SC',       // 存储字符
  SI = 'SI',       // 存储整数
  PUSH = 'PUSH',   // 压栈
  
  // 算术运算指令
  ADD = 'ADD',     // 加法
  SUB = 'SUB',     // 减法
  MUL = 'MUL',     // 乘法
  DIV = 'DIV',     // 除法
  MOD = 'MOD',     // 取模
  
  // 逻辑运算指令
  OR = 'OR',       // 或
  XOR = 'XOR',     // 异或
  AND = 'AND',     // 与
  EQ = 'EQ',       // 等于
  NE = 'NE',       // 不等于
  LT = 'LT',       // 小于
  GT = 'GT',       // 大于
  LE = 'LE',       // 小于等于
  GE = 'GE',       // 大于等于
  
  // 控制流指令
  JMP = 'JMP',     // 无条件跳转
  JZ = 'JZ',       // 为零跳转
  JNZ = 'JNZ',     // 非零跳转
  CALL = 'CALL',   // 函数调用
  NVAR = 'NVAR',   // 新建变量
  DARG = 'DARG',   // 删除参数
  RET = 'RET',     // 函数返回
  
  // 系统调用指令
  PRTF = 'PRTF',   // 格式化输出
  MALC = 'MALC',   // 内存分配
  FREE = 'FREE',   // 内存释放
  EXIT = 'EXIT'    // 程序退出
}

export interface VMInstruction {
  opcode: Instruction;
  operand?: number | string;
  line?: number;
}

// 指令描述接口
export interface InstructionInfo {
  mnemonic: Instruction;
  description: string;
  operands: number; // 操作数数量
}

export const INSTRUCTION_INFO: Record<Instruction, InstructionInfo> = {
  [Instruction.IMM]: { mnemonic: Instruction.IMM, description: '加载立即数', operands: 1 },
  [Instruction.LEA]: { mnemonic: Instruction.LEA, description: '加载有效地址', operands: 1 },
  [Instruction.LC]: { mnemonic: Instruction.LC, description: '加载字符', operands: 0 },
  [Instruction.LI]: { mnemonic: Instruction.LI, description: '加载整数', operands: 0 },
  [Instruction.SC]: { mnemonic: Instruction.SC, description: '存储字符', operands: 0 },
  [Instruction.SI]: { mnemonic: Instruction.SI, description: '存储整数', operands: 0 },
  [Instruction.PUSH]: { mnemonic: Instruction.PUSH, description: '压栈', operands: 0 },
  [Instruction.ADD]: { mnemonic: Instruction.ADD, description: '加法', operands: 0 },
  [Instruction.SUB]: { mnemonic: Instruction.SUB, description: '减法', operands: 0 },
  [Instruction.MUL]: { mnemonic: Instruction.MUL, description: '乘法', operands: 0 },
  [Instruction.DIV]: { mnemonic: Instruction.DIV, description: '除法', operands: 0 },
  [Instruction.MOD]: { mnemonic: Instruction.MOD, description: '取模', operands: 0 },
  [Instruction.OR]: { mnemonic: Instruction.OR, description: '或运算', operands: 0 },
  [Instruction.XOR]: { mnemonic: Instruction.XOR, description: '异或运算', operands: 0 },
  [Instruction.AND]: { mnemonic: Instruction.AND, description: '与运算', operands: 0 },
  [Instruction.EQ]: { mnemonic: Instruction.EQ, description: '等于比较', operands: 0 },
  [Instruction.NE]: { mnemonic: Instruction.NE, description: '不等于比较', operands: 0 },
  [Instruction.LT]: { mnemonic: Instruction.LT, description: '小于比较', operands: 0 },
  [Instruction.GT]: { mnemonic: Instruction.GT, description: '大于比较', operands: 0 },
  [Instruction.LE]: { mnemonic: Instruction.LE, description: '小于等于比较', operands: 0 },
  [Instruction.GE]: { mnemonic: Instruction.GE, description: '大于等于比较', operands: 0 },
  [Instruction.JMP]: { mnemonic: Instruction.JMP, description: '无条件跳转', operands: 1 },
  [Instruction.JZ]: { mnemonic: Instruction.JZ, description: '为零跳转', operands: 1 },
  [Instruction.JNZ]: { mnemonic: Instruction.JNZ, description: '非零跳转', operands: 1 },
  [Instruction.CALL]: { mnemonic: Instruction.CALL, description: '函数调用', operands: 1 },
  [Instruction.NVAR]: { mnemonic: Instruction.NVAR, description: '新建变量', operands: 0 },
  [Instruction.DARG]: { mnemonic: Instruction.DARG, description: '删除参数', operands: 0 },
  [Instruction.RET]: { mnemonic: Instruction.RET, description: '函数返回', operands: 0 },
  [Instruction.PRTF]: { mnemonic: Instruction.PRTF, description: '格式化输出', operands: 0 },
  [Instruction.MALC]: { mnemonic: Instruction.MALC, description: '内存分配', operands: 0 },
  [Instruction.FREE]: { mnemonic: Instruction.FREE, description: '内存释放', operands: 0 },
  [Instruction.EXIT]: { mnemonic: Instruction.EXIT, description: '程序退出', operands: 0 }
};