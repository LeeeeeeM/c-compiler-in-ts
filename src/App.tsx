import { useState, useEffect, useRef } from 'react';
import { Square, FileText, RotateCcw, ChevronRight, ChevronDown } from 'lucide-react';
import { Compiler } from '../lib/compiler';
import { VirtualMachine } from '../lib/vm';
import type { InstructionData, VMState } from '../lib/types';

// 编译结果接口
interface CompileResult {
  success: boolean;
  code: InstructionData[];
  data: any[];
  mainIndex: number;
  assembly: string;
  error?: string;
}

export default function App() {
  // 状态管理
  const [sourceCode, setSourceCode] = useState(`int main() {
    int x;
    x = 43;
    printf("x = %d\\n", x);
    return 0;
}`);
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [vmState, setVmState] = useState<VMState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [vm, setVm] = useState<VirtualMachine | null>(null);
  const [programFinished, setProgramFinished] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);

  // 将指令数字转换为指令名称
  const getInstructionName = (op: number): string => {
    const instructionNames = [
      'IMM', 'LEA', 'JMP', 'JZ', 'JNZ', 'CALL', 'NVAR', 'DARG', 'RET', 'LI', 'LC', 'SI', 'SC', 'PUSH',
      'OR', 'XOR', 'AND', 'EQ', 'NE', 'LT', 'GT', 'LE', 'GE', 'SHL', 'SHR', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD',
      'OPEN', 'READ', 'CLOS', 'PRTF', 'MALC', 'FREE', 'MSET', 'MCMP', 'EXIT'
    ];
    return instructionNames[op] || `UNK${op}`;
  };

  // 自动滚动到当前指令
  const scrollToCurrentInstruction = () => {
    if (instructionsRef.current && vmState) {
      const currentIndex = vmState.pc;
      const instructionElement = instructionsRef.current.children[currentIndex] as HTMLElement;
      if (instructionElement) {
        // 获取容器和元素的位置信息
        const container = instructionsRef.current.parentElement;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          const elementRect = instructionElement.getBoundingClientRect();
          
          // 计算元素相对于容器的位置
          const elementTop = elementRect.top - containerRect.top + container.scrollTop;
          const elementHeight = elementRect.height;
          const containerHeight = containerRect.height;
          
          // 计算目标滚动位置（元素居中）
          const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
          
          // 平滑滚动
          container.scrollTo({
            top: targetScrollTop,
            behavior: 'smooth'
          });
        }
      }
    }
  };

  // 编译器实例
  const compiler = new Compiler({ debugMode: true });

  // 监听VM状态变化，自动滚动到当前指令
  useEffect(() => {
    if (vmState) {
      // 延迟一点时间确保DOM更新完成
      setTimeout(scrollToCurrentInstruction, 100);
    }
  }, [vmState?.pc]);

  // 编译代码
  const compileCode = () => {
    try {
      // 重置程序状态
      setProgramFinished(false);
      setExitCode(null);
      
      const result = compiler.compileOnly(sourceCode);
      const assembly = compiler.getAssemblyContent();
      
      if (result) {
        setCompileResult({
          success: true,
          code: result.code,
          data: result.data,
          mainIndex: result.mainIndex,
          assembly
        });
        
        // 初始化VM（使用更小的栈大小）
        const newVm = new VirtualMachine(1024 * 8); // 8KB栈空间
        newVm.initialize(result.code, result.data, result.mainIndex);
        setVm(newVm);
        
        // 获取初始状态（简化版）
        setVmState({
          code: result.code,
          data: result.data,
          stack: [],
          pc: result.mainIndex,
          sp: 0,
          bp: 0,
          ax: 0,
          cycle: 0
        });
      } else {
        setCompileResult({
          success: false,
          code: [],
          data: [],
          mainIndex: 0,
          assembly: '',
          error: 'Compilation failed'
        });
      }
      
    } catch (error) {
      console.error('Compilation error:', error);
      setCompileResult({
        success: false,
        code: [],
        data: [],
        mainIndex: 0,
        assembly: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  // 执行下一步
  const stepNext = () => {
    if (!vm || !compileResult?.success || programFinished) return;
    
    try {
      vm.step();
      const state = vm.getState();
      setVmState(state);
      
      // 检查程序是否结束（与VM.execute()逻辑保持一致）
      if (state.pc >= compileResult.code.length) {
        // PC超出代码范围，程序正常结束
        console.log('Program finished: PC out of bounds', state.pc, 'code length:', compileResult.code.length);
        setProgramFinished(true);
        setExitCode(0); // 正常结束返回0
      } else {
        // 检查当前指令是否是EXIT
        const currentInstruction = compileResult.code[state.pc];
        if (currentInstruction && currentInstruction.op === 38) { // EXIT指令
          console.log('Program finished: EXIT instruction at PC', state.pc);
          setProgramFinished(true);
          setExitCode(state.ax);
        }
      }
    } catch (error) {
      console.error('Step execution error:', error);
      setProgramFinished(true);
    }
  };

  // 执行到最后
  const runToEnd = async () => {
    if (!vm || !compileResult?.success || programFinished) return;
    
    setIsRunning(true);
    try {
      const exitCode = vm.execute();
      const state = vm.getState();
      setVmState(state);
      setProgramFinished(true);
      setExitCode(exitCode);
      console.log('Program finished with exit code:', exitCode);
    } catch (error) {
      console.error('Execution error:', error);
      setProgramFinished(true);
    } finally {
      setIsRunning(false);
    }
  };

  // 重置
  const reset = () => {
    if (!compileResult?.success) return;
    
    const newVm = new VirtualMachine(1024 * 8); // 8KB栈空间
    newVm.initialize(compileResult.code, compileResult.data, compileResult.mainIndex);
    setVm(newVm);
    const state = newVm.getState();
    setVmState(state);
    setProgramFinished(false);
    setExitCode(null);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* 工具栏 */}
      <div className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-slate-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Interactive C Compiler & Debugger</p>
              </div>
            </div>
            </div>
            
            {/* 程序状态显示 */}
            <div className="flex items-center gap-2">
              {programFinished && (
                <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                  ✅ 程序执行完成 (退出码: {exitCode})
                </div>
              )}
              {isRunning && (
                <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                  🔄 程序执行中...
                </div>
              )}
            </div>
            
          <div className="flex items-center gap-2">
              <button
              onClick={compileCode}
              className="px-4 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center gap-1.5 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="font-medium">编译</span>
              </button>
              
                  <button
              onClick={stepNext}
              disabled={!vm || !compileResult?.success || programFinished}
              className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 flex items-center gap-1.5 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium">下一步</span>
                  </button>
              
              <button
              onClick={runToEnd}
              disabled={!vm || !compileResult?.success || isRunning || programFinished}
              className="px-4 py-1.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 flex items-center gap-1.5 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
              >
                {isRunning ? (
                  <>
                  <Square className="h-3.5 w-3.5" />
                  <span className="font-medium">执行中...</span>
                  </>
                ) : (
                  <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span className="font-medium">执行到最后</span>
                  </>
                )}
              </button>
            
            <button
              onClick={reset}
              disabled={!vm}
              className="px-4 py-1.5 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-lg hover:from-slate-600 hover:to-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all duration-200 flex items-center gap-1.5 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="font-medium">重置</span>
            </button>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* 左侧：代码编辑器 */}
        <div className="w-1/3 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <div className="flex items-center" style={{ gap: '8px' }}>
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <h2 className="text-sm font-semibold text-slate-700 ml-3">C 源代码</h2>
              </div>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                className="w-full h-full resize-none bg-slate-900 text-emerald-400 font-mono text-sm p-6 border-0 outline-none rounded-xl shadow-inner"
                placeholder="输入C代码..."
                spellCheck={false}
                style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: '#10b981'
                }}
              />
            </div>
          </div>
        </div>

        {/* 中间：指令展示 */}
        <div className="w-1/3 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="px-4 py-2 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <h2 className="text-sm font-semibold text-slate-700 ml-3">编译后的指令</h2>
                </div>
                {programFinished && (
                  <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    ✅ 执行完成
                  </div>
                )}
                {isRunning && (
                  <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    🔄 执行中
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              {compileResult ? (
                <div ref={instructionsRef} className="space-y-2">
                  {compileResult.code.map((instruction, index) => {
                    const isCurrent = vmState && index === vmState.pc;
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-xl text-sm font-mono transition-all duration-200 ${
                          isCurrent 
                            ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-l-4 border-yellow-500 shadow-lg transform scale-105' 
                            : 'hover:bg-slate-50 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            isCurrent ? 'bg-yellow-200 text-yellow-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {index.toString().padStart(3, ' ')}
                          </span>
                          <span className="text-blue-600 font-bold text-base">
                            {getInstructionName(instruction.op)}
                          </span>
                          {instruction.arg !== undefined && (
                            <span className="text-slate-700 font-medium">
                              {instruction.arg}
                            </span>
                          )}
                          {isCurrent && (
                            <span className="ml-auto text-yellow-600 font-bold text-xs bg-yellow-100 px-2 py-1 rounded-full">
                              ← 当前
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm">点击"编译"按钮生成指令</p>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>

        {/* 右侧：状态面板 */}
        <div className="w-1/3 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="h-full flex flex-col">
            {/* VM状态 */}
            <div className="border-b border-slate-200">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <h2 className="text-sm font-semibold text-slate-700 ml-3">VM 状态</h2>
                </div>
              </div>
              <div className="p-4">
                {vmState ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm font-medium">PC</span>
                          <span className="font-mono font-bold text-blue-600 text-lg">{vmState.pc}</span>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-3 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm font-medium">SP</span>
                          <span className="font-mono font-bold text-emerald-600 text-lg">{vmState.sp}</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-3 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm font-medium">BP</span>
                          <span className="font-mono font-bold text-purple-600 text-lg">{vmState.bp}</span>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-3 rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600 text-sm font-medium">AX</span>
                          <span className="font-mono font-bold text-orange-600 text-lg">{vmState.ax}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <div className="w-6 h-6 bg-slate-300 rounded-full"></div>
                    </div>
                    <p className="text-slate-500 text-sm">VM未初始化</p>
                  </div>
                )}
              </div>
            </div>

            {/* 数据段 */}
            <div className="border-b border-slate-200 flex-1">
              <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <div className="w-2 h-2 bg-rose-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-fuchsia-400 rounded-full"></div>
                  <h2 className="text-sm font-semibold text-slate-700 ml-3">数据段</h2>
                </div>
              </div>
              <div className="p-6 overflow-auto max-h-48">
                {vmState ? (
                  <div className="space-y-2">
                    {vmState.data.map((value: number, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <span className="text-slate-500 text-xs font-mono">[{index}]:</span>
                        <span className="text-slate-800 font-mono font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <div className="w-4 h-4 bg-slate-300 rounded"></div>
                    </div>
                    <p className="text-slate-500 text-xs">数据段未初始化</p>
                  </div>
                )}
              </div>
            </div>

            {/* 栈状态 */}
            <div className="flex-1">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <div className="w-2 h-2 bg-violet-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <h2 className="text-sm font-semibold text-slate-700 ml-3">栈状态</h2>
                </div>
                {vmState && (
                  <div className="text-xs text-slate-500 font-mono">
                    SP: {vmState.sp}, 栈大小: {vmState.stack.length}
                  </div>
                )}
              </div>
                      </div>
              <div className="p-6 overflow-auto max-h-48">
                {vmState ? (
                  <div className="space-y-2">
                    {vmState.stack.length > 0 ? (
                      vmState.stack.map((value: number, index: number) => {
                        const address = vmState.sp + index;
                        return (
                          <div key={index} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <span className="text-slate-500 text-xs font-mono">[{address}]:</span>
                            <span className="text-slate-800 font-mono font-medium">{value}</span>
                          </div>
                        );
                      }).reverse() // 反转数组，高地址在上方
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-slate-500 text-xs">栈为空</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <div className="w-4 h-4 bg-slate-300 rounded"></div>
                    </div>
                    <p className="text-slate-500 text-xs">栈未初始化</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}