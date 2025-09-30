import { Parser } from './parser';
import { CodeGenerator } from './code-generator';
import { VirtualMachine } from './vm';
import { CompilerConfig } from './types';

// 编译器核心类
export class Compiler {
  private maxSize: number = 128 * 1024 * 8; // 1MB
  private debugMode: boolean = false;
  private assemblyContent: string = '';

  constructor(config?: CompilerConfig) {
    if (config?.maxSize !== undefined) this.maxSize = config.maxSize;
    if (config?.debugMode !== undefined) this.debugMode = config.debugMode;
  }

  // 编译源代码
  public compile(source: string, filename?: string): number {
    try {
      if (this.debugMode && filename) {
        console.log(`Compiling ${filename}...`);
      }
      
      // 语法分析（Parser内部会创建Lexer）
      const parser = new Parser(source, this.debugMode);
      parser.parse();
      
      // 代码生成
      const codeGenerator = new CodeGenerator(parser);
      const { code, data, mainIndex } = codeGenerator.generate();
      
      // 生成汇编内容
      this.assemblyContent = codeGenerator.generateAssembly();
      
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
    
    // 数据段内容
    console.log('Data segment:', data);
    console.log('=== End Debug Information ===\n');
  }

  // 获取汇编内容
  public getAssemblyContent(): string {
    return this.assemblyContent;
  }
}