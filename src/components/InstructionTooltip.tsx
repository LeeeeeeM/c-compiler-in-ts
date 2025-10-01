import React from 'react';
import type { InstructionData } from '../../lib/types';
import { Instruction } from '../../lib/types';

interface InstructionTooltipProps {
  instruction: InstructionData;
  visible: boolean;
  x: number;
  y: number;
}

export const InstructionTooltip: React.FC<InstructionTooltipProps> = ({ 
  instruction, 
  visible, 
  x, 
  y 
}) => {
  if (!visible) return null;

  const getInstructionDescription = (instruction: InstructionData) => {
    const { op, arg } = instruction;
    
    switch (op) {
      case Instruction.IMM:
        return {
          description: '立即数加载',
          changes: `AX = ${arg}`,
          registers: { ax: arg, sp: '不变', bp: '不变' }
        };
      
      case Instruction.LEA:
        return {
          description: '加载有效地址',
          changes: `AX = BP + ${arg}`,
          registers: { ax: `BP + ${arg}`, sp: '不变', bp: '不变' }
        };
      
      case Instruction.JMP:
        return {
          description: '无条件跳转',
          changes: `PC = ${arg}`,
          registers: { ax: '不变', sp: '不变', bp: '不变' }
        };
      
      case Instruction.JZ:
        return {
          description: '零跳转',
          changes: `if (AX == 0) PC = ${arg}`,
          registers: { ax: '不变', sp: '不变', bp: '不变' }
        };
      
      case Instruction.JNZ:
        return {
          description: '非零跳转',
          changes: `if (AX != 0) PC = ${arg}`,
          registers: { ax: '不变', sp: '不变', bp: '不变' }
        };
      
      case Instruction.CALL:
        return {
          description: '函数调用',
          changes: `PUSH(PC), PC = ${arg}`,
          registers: { ax: '不变', sp: 'SP - 1', bp: '不变' }
        };
      
      case Instruction.RET:
        return {
          description: '函数返回',
          changes: `PC = POP()`,
          registers: { ax: '不变', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.LI:
        return {
          description: '加载整数',
          changes: `AX = [AX]`,
          registers: { ax: '[AX]', sp: '不变', bp: '不变' }
        };
      
      case Instruction.LC:
        return {
          description: '加载字符',
          changes: `AX = [AX]`,
          registers: { ax: '[AX]', sp: '不变', bp: '不变' }
        };
      
      case Instruction.SI:
        return {
          description: '存储整数',
          changes: `[POP()] = AX`,
          registers: { ax: '不变', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.SC:
        return {
          description: '存储字符',
          changes: `[POP()] = AX`,
          registers: { ax: '不变', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.PUSH:
        return {
          description: '压栈',
          changes: `PUSH(AX)`,
          registers: { ax: '不变', sp: 'SP - 1', bp: '不变' }
        };
      
      case Instruction.OR:
        return {
          description: '按位或',
          changes: `AX = AX | POP()`,
          registers: { ax: 'AX | POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.XOR:
        return {
          description: '按位异或',
          changes: `AX = AX ^ POP()`,
          registers: { ax: 'AX ^ POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.AND:
        return {
          description: '按位与',
          changes: `AX = AX & POP()`,
          registers: { ax: 'AX & POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.EQ:
        return {
          description: '等于比较',
          changes: `AX = (AX == POP())`,
          registers: { ax: 'AX == POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.NE:
        return {
          description: '不等于比较',
          changes: `AX = (AX != POP())`,
          registers: { ax: 'AX != POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.LT:
        return {
          description: '小于比较',
          changes: `AX = (AX < POP())`,
          registers: { ax: 'AX < POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.GT:
        return {
          description: '大于比较',
          changes: `AX = (AX > POP())`,
          registers: { ax: 'AX > POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.LE:
        return {
          description: '小于等于比较',
          changes: `AX = (AX <= POP())`,
          registers: { ax: 'AX <= POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.GE:
        return {
          description: '大于等于比较',
          changes: `AX = (AX >= POP())`,
          registers: { ax: 'AX >= POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.ADD:
        return {
          description: '加法',
          changes: `AX = AX + POP()`,
          registers: { ax: 'AX + POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.SUB:
        return {
          description: '减法',
          changes: `AX = AX - POP()`,
          registers: { ax: 'AX - POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.MUL:
        return {
          description: '乘法',
          changes: `AX = AX * POP()`,
          registers: { ax: 'AX * POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.DIV:
        return {
          description: '除法',
          changes: `AX = AX / POP()`,
          registers: { ax: 'AX / POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.MOD:
        return {
          description: '取模',
          changes: `AX = AX % POP()`,
          registers: { ax: 'AX % POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.NVAR:
        return {
          description: '新建变量栈帧',
          changes: `SP = SP - ${arg}`,
          registers: { ax: '不变', sp: `SP - ${arg}`, bp: '不变' }
        };
      
      case Instruction.DARG:
        return {
          description: '删除参数栈帧',
          changes: `SP = SP + ${arg}`,
          registers: { ax: '不变', sp: `SP + ${arg}`, bp: '不变' }
        };
      
      case Instruction.SHL:
        return {
          description: '左移',
          changes: `AX = AX << POP()`,
          registers: { ax: 'AX << POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.SHR:
        return {
          description: '右移',
          changes: `AX = AX >> POP()`,
          registers: { ax: 'AX >> POP()', sp: 'SP + 1', bp: '不变' }
        };
      
      case Instruction.OPEN:
        return {
          description: '打开文件',
          changes: `AX = open(filename)`,
          registers: { ax: '文件句柄', sp: '不变', bp: '不变' }
        };
      
      case Instruction.READ:
        return {
          description: '读取文件',
          changes: `AX = read(fd, buffer, size)`,
          registers: { ax: '读取字节数', sp: '不变', bp: '不变' }
        };
      
      case Instruction.CLOS:
        return {
          description: '关闭文件',
          changes: `close(fd)`,
          registers: { ax: '不变', sp: '不变', bp: '不变' }
        };
      
      case Instruction.PRTF:
        return {
          description: '格式化输出',
          changes: `printf(format, ...args)`,
          registers: { ax: '输出字符数', sp: '不变', bp: '不变' }
        };
      
      case Instruction.MALC:
        return {
          description: '内存分配',
          changes: `AX = malloc(size)`,
          registers: { ax: '分配的内存地址', sp: '不变', bp: '不变' }
        };
      
      case Instruction.FREE:
        return {
          description: '内存释放',
          changes: `free(ptr)`,
          registers: { ax: '不变', sp: '不变', bp: '不变' }
        };
      
      case Instruction.MSET:
        return {
          description: '内存设置',
          changes: `memset(ptr, value, size)`,
          registers: { ax: '不变', sp: '不变', bp: '不变' }
        };
      
      case Instruction.MCMP:
        return {
          description: '内存比较',
          changes: `AX = memcmp(ptr1, ptr2, size)`,
          registers: { ax: '比较结果', sp: '不变', bp: '不变' }
        };
      
      case Instruction.EXIT:
        return {
          description: '程序退出',
          changes: '程序结束',
          registers: { ax: '不变', sp: '不变', bp: '不变' }
        };
      
      default:
        return {
          description: '未知指令',
          changes: '未知操作',
          registers: { ax: '未知', sp: '未知', bp: '未知' }
        };
    }
  };

  const info = getInstructionDescription(instruction);

  return (
    <div
      className="fixed z-50 bg-slate-800 text-white rounded-lg shadow-xl border border-slate-600 p-4 max-w-sm"
      style={{
        left: x + 10,
        top: y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-mono text-sm font-bold">
            {instruction.op}
          </span>
          <span className="text-slate-300 text-xs">
            {info.description}
          </span>
        </div>
        
        <div className="text-xs text-slate-400">
          {info.changes}
        </div>
        
        <div className="border-t border-slate-600 pt-2">
          <div className="text-xs font-semibold text-slate-300 mb-1">寄存器变化:</div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-red-400">AX:</span>
              <span className="text-slate-200">{info.registers.ax}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-400">SP:</span>
              <span className="text-slate-200">{info.registers.sp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-400">BP:</span>
              <span className="text-slate-200">{info.registers.bp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
