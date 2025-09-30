import * as fs from 'fs';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { CodeGenerator } from './code-generator';
import { VirtualMachine } from './vm';
import { TokenType, CompilerConfig, CompileResult } from './types';

// 编译器核心类
export class Compiler {
  private maxSize: number = 128 * 1024 * 8; // 1MB
  private debugMode: boolean = false;

  constructor(config?: CompilerConfig) {
    if (config?.maxSize !== undefined) this.maxSize = config.maxSize;
    if (config?.debugMode !== undefined) this.debugMode = config.debugMode;
  }

  // 加载源文件
  public loadSource(filename: string): string {
    try {
      return fs.readFileSync(filename, 'utf-8');
    } catch (error) {
      console.error(`Could not open source code(${filename})`);
      process.exit(-1);
    }
  }

  // 编译源文件
  public compile(filename: string): number {
    try {
      if (this.debugMode) {
        console.log(`Compiling ${filename}...`);
      }
      
      // 加载源文件
      const source = this.loadSource(filename);
      
      // 词法分析
      const lexer = new Lexer(source);
      
      // 语法分析
      const parser = new Parser(source, this.debugMode);
      parser.parse();
      
      // 代码生成
      const codeGenerator = new CodeGenerator(parser);
      const { code, data, mainIndex } = codeGenerator.generate();
      
      // 写入汇编文件
      codeGenerator.writeAssembly('assemble.txt');
      
      // 调试模式输出
      if (this.debugMode) {
        this.printDebugInfo(parser, code, data, mainIndex);
      }
      
      // 初始化虚拟机
      const vm = new VirtualMachine(this.maxSize);
      vm.initialize(code, data, mainIndex);
      
      // 执行虚拟机
      const exitCode = vm.execute();
      
      return exitCode;
    } catch (error) {
      console.error(`Compilation error: ${error}`);
      return -1;
    }
  }

  // 调试信息输出
  private printDebugInfo(parser: Parser, code: any[], data: any[], mainIndex: number): void {
    console.log('\n=== Debug Information ===');
    console.log(`Code length: ${code.length}`);
    console.log(`Data length: ${data.length}`);
    console.log(`Main function index: ${mainIndex}`);
    
    // 符号表
    const symbols = parser.getSymbolTable().getAllSymbols();
    console.log(`Total symbols: ${symbols.length}`);
    symbols.forEach((symbol, index) => {
      if (symbol.name === 'x') {
        console.log(`Symbol ${index}: ${symbol.name} (class=${symbol.class}, type=${symbol.type}, value=${symbol.value})`);
      }
    });
    
    // 数据段内容
    console.log('Data segment:', data);
    console.log('=== End Debug Information ===\n');
  }
}
