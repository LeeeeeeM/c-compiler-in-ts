#!/usr/bin/env node

import * as fs from 'fs';
import { Compiler } from './lib/compiler';

// 主编译器类
class CPCCompiler {
  private compiler: Compiler;

  constructor(debugMode: boolean = false) {
    this.compiler = new Compiler({ debugMode });
  }

  // 编译源文件
  public compile(filename: string): number {
    try {
      // 读取源文件
      const source = fs.readFileSync(filename, 'utf-8');
      
      // 编译源代码
      const exitCode = this.compiler.compile(source, filename);
      
      // 生成汇编文件
      const assemblyContent = this.compiler.getAssemblyContent();
      if (assemblyContent) {
        fs.writeFileSync('assemble.txt', assemblyContent);
      }
      
      return exitCode;
    } catch (error) {
      console.error(`Could not open source code(${filename})`);
      return -1;
    }
  }

  // 主函数
  public static main(): void {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.error('Usage: npx tsx cpc.ts <source_file> [--debug]');
      process.exit(-1);
    }
    
    const filename = args[0];
    const debugMode = args.includes('--debug');
    const compiler = new CPCCompiler(debugMode);
    const exitCode = compiler.compile(filename);
    process.exit(exitCode);
  }
}

// 如果直接运行此文件，则执行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  CPCCompiler.main();
}

export { CPCCompiler };
