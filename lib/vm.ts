import { Instruction } from './types';
import type { InstructionData, VMState } from './types';

export class VirtualMachine {
  private state: VMState;
  private maxSize: number;
  private outputCallback?: (message: string) => void;

  constructor(maxSize: number = 1024 * 1024, outputCallback?: (message: string) => void) {
    this.maxSize = maxSize;
    this.outputCallback = outputCallback;
    this.state = {
      code: [],
      data: [],
      stack: [],
      pc: 0,
      sp: 0,
      bp: 0,
      ax: 0,
      cycle: 0
    };
  }

  // 初始化虚拟机
  public initialize(code: InstructionData[], data: any[], mainIndex: number): void {
    this.state.code = code;
    this.state.data = data;
    this.state.stack = new Array(this.maxSize).fill(0);
    this.state.pc = mainIndex;
    this.state.sp = this.maxSize - 1;
    this.state.bp = this.maxSize - 1;
    this.state.ax = 0;
    this.state.cycle = 0;

    // 设置初始栈帧
    this.push(0); // EXIT
    this.push(0); // PUSH
    this.push(0); // argc
    this.push(0); // argv
    this.push(this.state.sp); // 保存sp
  }

  // 压栈
  private push(value: any): void {
    this.state.stack[--this.state.sp] = value;
  }

  // 出栈
  private pop(): any {
    return this.state.stack[this.state.sp++];
  }

  // 获取栈顶值
  private peek(): any {
    return this.state.stack[this.state.sp];
  }

  // 执行指令
  public execute(): number {
    try {
      while (this.state.pc < this.state.code.length) {
        this.state.cycle++;
        
        if (this.state.cycle > 1000000) { // 防止无限循环
          throw new Error('VM execution timeout - possible infinite loop');
        }
        
        const instruction = this.state.code[this.state.pc++];
        
        if (!instruction) {
          throw new Error(`Invalid instruction at PC: ${this.state.pc - 1}`);
        }

        const result = this.executeInstruction(instruction);
        if (result !== undefined) {
          return result;
        }
      }

      console.log('exit(0)');
      return 0;
    } catch (error) {
      console.error(`VM execution error: ${error}`);
      return -1;
    }
  }

  // 执行单个指令
  private executeInstruction(instruction: InstructionData): number | undefined {
    const { op, arg } = instruction;

    switch (op) {
      // 加载和存储
      case Instruction.IMM:
        this.state.ax = arg || 0;
        break;

      case Instruction.LEA:
        this.state.ax = this.state.bp + (arg || 0);
        break;

      case Instruction.LC:
        // 从栈读取
        this.state.ax = this.state.stack[this.state.ax] || 0;
        break;

      case Instruction.LI:
          // 从栈读取
        this.state.ax = this.state.stack[this.state.ax] || 0;
        break;

      case Instruction.SC:
        // 存储到栈
        this.state.stack[this.pop()] = this.state.ax;
        break;

      case Instruction.SI:
        // 检查最高位标识，如果设置了说明是数据段地址
        this.state.stack[this.pop()] = this.state.ax;
        break;

      case Instruction.PUSH:
        this.push(this.state.ax);
        break;

      // 跳转
      case Instruction.JMP:
        this.state.pc = arg || 0;
        break;

      case Instruction.JZ:
        this.state.pc = this.state.ax ? this.state.pc : (arg || 0);
        break;

      case Instruction.JNZ:
        this.state.pc = this.state.ax ? (arg || 0) : this.state.pc;
        break;

      // 算术运算
      case Instruction.ADD:
        this.state.ax = this.pop() + this.state.ax;
        break;

      case Instruction.SUB:
        this.state.ax = this.pop() - this.state.ax;
        break;

      case Instruction.MUL:
        this.state.ax = this.pop() * this.state.ax;
        break;

      case Instruction.DIV:
        this.state.ax = this.pop() / this.state.ax;
        break;

      case Instruction.MOD:
        this.state.ax = this.pop() % this.state.ax;
        break;

      // 位运算
      case Instruction.OR:
        this.state.ax = this.pop() | this.state.ax;
        break;

      case Instruction.XOR:
        this.state.ax = this.pop() ^ this.state.ax;
        break;

      case Instruction.AND:
        this.state.ax = this.pop() & this.state.ax;
        break;

      case Instruction.SHL:
        this.state.ax = this.pop() << this.state.ax;
        break;

      case Instruction.SHR:
        this.state.ax = this.pop() >> this.state.ax;
        break;

      // 比较运算
      case Instruction.EQ:
        this.state.ax = this.pop() === this.state.ax ? 1 : 0;
        break;

      case Instruction.NE:
        this.state.ax = this.pop() !== this.state.ax ? 1 : 0;
        break;

      case Instruction.LT:
        this.state.ax = this.pop() < this.state.ax ? 1 : 0;
        break;

      case Instruction.LE:
        this.state.ax = this.pop() <= this.state.ax ? 1 : 0;
        break;

      case Instruction.GT:
        this.state.ax = this.pop() > this.state.ax ? 1 : 0;
        break;

      case Instruction.GE:
        this.state.ax = this.pop() >= this.state.ax ? 1 : 0;
        break;

      // 函数调用
      case Instruction.CALL:
        this.push(this.state.pc);
        this.state.pc = arg || 0;
        break;

      case Instruction.NVAR:
        this.push(this.state.bp);
        this.state.bp = this.state.sp;
        this.state.sp -= (arg || 0);
        break;

      case Instruction.DARG:
        this.state.sp += (arg || 0);
        break;

      case Instruction.RET:
        this.state.sp = this.state.bp;
        this.state.bp = this.pop();
        this.state.pc = this.pop();
        break;

      // 系统调用
      case Instruction.PRTF:
        // PRTF指令的参数个数在下一条指令中（DARG指令的参数）
        // 注意：此时pc已经指向下一条指令了，所以读取当前pc指向的指令的参数
        const nextInstruction = this.state.code[this.state.pc];
        const argCount = nextInstruction?.arg || 0;
        // 使用正确的参数个数（DARG的参数）
        this.handlePrintf(Math.abs(argCount));
        break;

      case Instruction.EXIT:
        console.log(`exit(${arg})`);
        return arg;

      default:
        console.error(`Unknown instruction: ${op}, cycle: ${this.state.cycle}`);
        return -1;
    }

    return undefined;
  }

  // 处理printf系统调用
  private handlePrintf(argCount: number): void {
    try {
      // 按照C版本的逻辑：tmp = sp + argCount - 1
      const tmp = this.state.sp + argCount - 1;
      
      if (tmp < 0 || tmp >= this.state.stack.length) {
        throw new Error(`Invalid stack access: tmp=${tmp}, stack length=${this.state.stack.length}`);
      }
      
      // 格式字符串地址在tmp[0]（栈顶）
      const formatStrAddr = this.state.stack[tmp];
      const formatStr = this.getStringFromData(formatStrAddr);
      
      // 处理格式字符串和参数
      const result = this.formatString(formatStr, tmp, argCount);
      if (this.outputCallback) {
        this.outputCallback(result);
      } else {
        console.log(result);
      }
    } catch (error) {
      console.error(`printf error: ${error}`);
    }
  }
  
  // 处理格式字符串，支持%d和%c格式符
  private formatString(formatStr: string, tmp: number, argCount: number): string {
    let result = '';
    let argIndex = 1; // 第一个参数是格式字符串，从第二个开始
    
    for (let i = 0; i < formatStr.length; i++) {
      if (formatStr[i] === '%' && i + 1 < formatStr.length) {
        if (formatStr[i + 1] === 'd') {
          // 处理%d格式符
          if (argIndex < argCount) {
            // 按照C版本的逻辑：tmp[-1], tmp[-2], tmp[-3]...
            const argValue = this.state.stack[tmp - argIndex];
            result += argValue.toString();
            argIndex++;
            i++; // 跳过'd'
          } else {
            result += '%d'; // 没有足够的参数
          }
        } else if (formatStr[i + 1] === 'c') {
          // 处理%c格式符
          if (argIndex < argCount) {
            const argValue = this.state.stack[tmp - argIndex];
            result += String.fromCharCode(argValue);
            argIndex++;
            i++; // 跳过'c'
          } else {
            result += '%c'; // 没有足够的参数
          }
        } else {
          result += formatStr[i]; // 保留%字符
        }
      } else {
        result += formatStr[i];
      }
    }
    
    return result;
  }
  
  // 从数据段获取字符串
  private getStringFromData(addr: number): string {
    if (addr < 0 || addr >= this.state.data.length) {
      throw new Error(`Invalid data address: ${addr}, data length: ${this.state.data.length}`);
    }
    
    let str = '';
    let i = addr;
    while (i < this.state.data.length && this.state.data[i] !== 0) {
      str += String.fromCharCode(this.state.data[i]);
      i++;
    }
    return str;
  }

  // 获取虚拟机状态
  public getState(): VMState {
    // 返回栈的有效部分（从SP到栈顶）
    const stackSlice = this.state.stack.slice(this.state.sp, this.maxSize);
    return { 
      ...this.state, 
      stack: stackSlice 
    };
  }

  // 设置虚拟机状态
  public setState(state: VMState): void {
    this.state = { ...state };
  }

  // 获取指令计数
  public getCycleCount(): number {
    return this.state.cycle;
  }

  // 获取程序计数器
  public getPC(): number {
    return this.state.pc;
  }

  // 获取栈指针
  public getSP(): number {
    return this.state.sp;
  }

  // 获取基址指针
  public getBP(): number {
    return this.state.bp;
  }

  // 获取累加器值
  public getAX(): any {
    return this.state.ax;
  }

  // 设置累加器值
  public setAX(value: any): void {
    this.state.ax = value;
  }

  // 获取栈内容
  public getStack(): any[] {
    return this.state.stack.slice(this.state.sp, this.maxSize);
  }

  // 获取数据段内容
  public getData(): any[] {
    return [...this.state.data];
  }

  // 获取代码段内容
  public getCode(): InstructionData[] {
    return [...this.state.code];
  }

  // 单步执行
  public step(): number | undefined {
    if (this.state.pc >= this.state.code.length) {
      return 0;
    }

    this.state.cycle++;
    const instruction = this.state.code[this.state.pc++];
    
    if (!instruction) {
      console.error(`Unknown instruction at PC: ${this.state.pc - 1}`);
      return -1;
    }

    return this.executeInstruction(instruction);
  }

  // 重置虚拟机
  public reset(): void {
    this.state.pc = 0;
    this.state.sp = this.maxSize - 1;
    this.state.bp = this.maxSize - 1;
    this.state.ax = 0;
    this.state.cycle = 0;
  }

  // 设置断点
  public setBreakpoint(pc: number): void {
    // 简化实现，实际应该维护断点列表
    console.log(`Breakpoint set at PC: ${pc}`);
  }

  // 清除断点
  public clearBreakpoint(pc: number): void {
    console.log(`Breakpoint cleared at PC: ${pc}`);
  }

  // 获取当前指令
  public getCurrentInstruction(): InstructionData | null {
    if (this.state.pc < this.state.code.length) {
      return this.state.code[this.state.pc];
    }
    return null;
  }

  // 反汇编指令
  public disassembleInstruction(instruction: InstructionData, pc: number): string {
    const instructionNames = [
      'IMM', 'LEA', 'JMP', 'JZ', 'JNZ', 'CALL', 'NVAR', 'DARG', 'RET', 'LI', 'LC', 'SI', 'SC', 'PUSH',
      'OR', 'XOR', 'AND', 'EQ', 'NE', 'LT', 'GT', 'LE', 'GE', 'SHL', 'SHR', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD',
      'OPEN', 'READ', 'CLOS', 'PRTF', 'MALC', 'FREE', 'MSET', 'MCMP', 'EXIT'
    ];
    
    const opName = typeof instruction.op === 'number' 
      ? instructionNames[instruction.op] || `UNK${instruction.op}`
      : instruction.op;
    
    let result = `(${pc}) ${opName.padEnd(8)}`;
    if (instruction.arg !== undefined) {
      result += ` ${instruction.arg}`;
    }
    return result;
  }

  // 反汇编代码段
  public disassemble(): string[] {
    const result: string[] = [];
    for (let i = 0; i < this.state.code.length; i++) {
      result.push(this.disassembleInstruction(this.state.code[i], i));
    }
    return result;
  }
}
