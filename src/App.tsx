import { useState, useEffect, useRef } from 'react';
import { Square, FileText, RotateCcw, ChevronRight, ChevronDown, Terminal, Play, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { Compiler } from '../lib/compiler';
import { VirtualMachine } from '../lib/vm';
import type { InstructionData, VMState } from '../lib/types';
import { Console } from './components/Console';
import { InstructionTooltip } from './components/InstructionTooltip';

// 编译结果接口
interface CompileResult {
  success: boolean;
  code: InstructionData[];
  data: any[];
  mainIndex: number;
  assembly: string;
  error?: string;
}

// 测试用例接口
interface TestCase {
  id: string;
  name: string;
  description: string;
  code: string;
}

// 测试用例数据
const testCases: TestCase[] = [
  {
    id: 'test_basic',
    name: '基本变量测试',
    description: '简单的变量赋值和打印',
    code: `// 简单测试，不包含 if 语句
int main() {
    int x;
    x = 10;
    
    printf("x = %d\\n", x);
    
    return 0;
}`
  },
  {
    id: 'test_simple_while',
    name: '简单循环测试',
    description: '基本的while循环',
    code: `// 简单的while循环测试
int main() {
    int i;
    i = 1;
    while (i <= 3) {
        printf("i = %d\\n", i);
        i = i + 1;
    }
    printf("Done\\n");
    return 0;
}`
  },
  {
    id: 'test_simple_param',
    name: '函数参数测试',
    description: '函数参数传递',
    code: `int test(int x) {
   return x;
}

int main() {
   printf("result %d", test(42));
   return 0;
}`
  },
  {
    id: 'test_simple_if',
    name: '条件语句测试',
    description: '基本的if语句',
    code: `int main() {
    int x;
    x = 10;
    
    if (x > 5) {
        printf("x > 5 is true\\n");
    } else {
        printf("x > 5 is false\\n");
    }
    
    return 0;
}`
  },
  {
    id: 'test_simple_pointer',
    name: '指针测试',
    description: '基本的指针操作',
    code: `int main() {
    int x;
    int *p;
    
    x = 42;
    p = &x;
    
    printf("x = %d\\n", x);
    printf("&x = %d\\n", (int)&x);
    printf("p = %d\\n", (int)p);
    printf("*p = %d\\n", *p);
    
    *p = 100;
    printf("After *p = 100:\\n");
    printf("x = %d\\n", x);
    printf("*p = %d\\n", *p);
    
    return 0;
}`
  },
  {
    id: 'test_simple_array',
    name: '数组测试',
    description: '基本的数组操作',
    code: `int main() {
    int arr[3];
    
    // 初始化数组
    arr[0] = 10;
    arr[1] = 20;
    arr[2] = 30;
    
    // 打印数组元素
    printf("arr[0] = %d\\n", arr[0]);
    printf("arr[1] = %d\\n", arr[1]);
    printf("arr[2] = %d\\n", arr[2]);
    
    // 修改数组元素
    arr[1] = 99;
    printf("After modification: arr[1] = %d\\n", arr[1]);
    
    return 0;
}`
  },
  {
    id: 'test_multiplication_table',
    name: '九九乘法表',
    description: '嵌套循环生成九九乘法表',
    code: `int main() {
    int i, j;
    
    printf("九九乘法表:\\n");
    printf("===========\\n");
    
    i = 1;
    while (i <= 9) {
        j = 1;
        while (j <= i) {
            printf("%d*%d=%d  ", i, j, i * j);
            j = j + 1;
        }
        printf("\\n");
        i = i + 1;
    }
    
    printf("===========\\n");
    printf("九九乘法表完成!\\n");
    
    return 0;
}`
  },
  {
    id: 'test_global_hide',
    name: '变量遮蔽测试',
    description: '全局变量和局部变量的遮蔽关系',
    code: `int a1;
int a3;

int test_func(int a1) {  // 参数遮蔽全局变量
    int a2;
    int a3;
    
    a3 = 40;
    a2 = a1 + 1;
    
    {
        a1 = 20;
        a2 = a1 + 1;
        printf("inner: a1=%d, a2=%d, a3=%d\\n", a1, a2, a3);
        {
            a1 = 30;
            a2 = a1 + 1;
            printf("inner: a1=%d, a2=%d, a3=%d\\n", a1, a2, a3);
        }
    }
    printf("outer: a1=%d, a2=%d, a3=%d\\n", a1, a2, a3);
    
    return a2;
}

int main() {
    int a1;  // 局部变量遮蔽全局变量
    int result1;
    
    a1 = 10;
    
    printf("main: a1=%d\\n", a1);
    
    result1 = test_func(5);
    
    printf("Results: result1=%d\\n", result1);
    printf("a1=%d\\n", a1);
    
    return 0;
}`
  },
  {
    id: 'test_nested_functions',
    name: '嵌套函数调用测试',
    description: '多函数调用、函数嵌套、函数内if-else分支',
    code: `// 多函数调用、函数嵌套、函数内if-else分支测试
int add(int a, int b) {
    return a + b;
}

int multiply(int x, int y) {
    return x * y;
}

int calculate(int num) {
    int result;
    
    if (num > 10) {
        result = multiply(num, 2);
        printf("num > 10, multiply by 2: %d\\n", result);
    } else {
        if (num > 5) {
            result = add(num, 5);
            printf("num > 5, add 5: %d\\n", result);
        } else {
            result = num;
            printf("num <= 5, keep as is: %d\\n", result);
        }
    }
    
    return result;
}

int process(int p1, int p2) {
    int sum;
    int product;
    int final;
    
    sum = add(p1, p2);
    product = multiply(p1, p2);
    final = calculate(sum);
    
    printf("p1=%d, p2=%d, sum=%d, product=%d, final=%d\\n", p1, p2, sum, product, final);
    
    return final;
}

int main() {
    int x;
    int y;
    int z;
    int result1;
    int result2;
    int result3;
    
    x = 8;
    y = 3;
    z = 15;
    
    printf("Testing nested function calls:\\n");
    
    result1 = process(x, y);
    printf("process(%d, %d) = %d\\n", x, y, result1);
    
    result2 = process(y, z);
    printf("process(%d, %d) = %d\\n", y, z, result2);
    
    result3 = process(x, z);
    printf("process(%d, %d) = %d\\n", x, z, result3);
    
    printf("All tests completed!\\n");
    return 0;
}`
  }
];

export default function App() {
  // 状态管理
  const [sourceCode, setSourceCode] = useState(testCases[0].code);
  const [selectedTestCase, setSelectedTestCase] = useState<string>(testCases[0].id);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [compileResult, setCompileResult] = useState<CompileResult | null>(null);
  const [vmState, setVmState] = useState<VMState | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [vm, setVm] = useState<VirtualMachine | null>(null);
  const [programFinished, setProgramFinished] = useState(false);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const instructionsRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const [isConsoleVisible, setIsConsoleVisible] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 指令工具提示状态
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipInstruction, setTooltipInstruction] = useState<InstructionData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

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
          
          // 直接滚动（最快）
          container.scrollTop = targetScrollTop;
        }
      }
    }
  };

  // 自动滚动栈状态到底部
  const scrollStackToBottom = () => {
    if (stackRef.current) {
      const container = stackRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  };

  // 处理指令悬浮事件
  const handleInstructionHover = (instruction: InstructionData, event: React.MouseEvent) => {
    setTooltipInstruction(instruction);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
    setTooltipVisible(true);
  };

  const handleInstructionLeave = () => {
    setTooltipVisible(false);
  };

  // 编译器实例
  const compiler = new Compiler({ debugMode: true });

  // 监听VM状态变化，自动滚动到当前指令和栈底部
  useEffect(() => {
    if (vmState) {
      // 延迟一点时间确保DOM更新完成
      setTimeout(() => {
        scrollToCurrentInstruction();
        scrollStackToBottom();
      }, 100);
    }
  }, [vmState?.pc, vmState?.stack]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // 添加控制台日志
  const addConsoleLog = (message: string) => {
    if (typeof (window as any).consoleAddLog === 'function') {
      (window as any).consoleAddLog(message);
    }
  };

  // 选择测试用例
  const selectTestCase = (testCaseId: string) => {
    const testCase = testCases.find(tc => tc.id === testCaseId);
    if (testCase) {
      setSelectedTestCase(testCaseId);
      setSourceCode(testCase.code);
      setIsDropdownOpen(false);
      setFocusedIndex(-1);
      addConsoleLog(`已选择测试用例: ${testCase.name}`);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isDropdownOpen) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsDropdownOpen(true);
        setFocusedIndex(testCases.findIndex(tc => tc.id === selectedTestCase));
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => (prev + 1) % testCases.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => prev <= 0 ? testCases.length - 1 : prev - 1);
        break;
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0) {
          selectTestCase(testCases[focusedIndex].id);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsDropdownOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // 编译代码
  const compileCode = () => {
    try {
      addConsoleLog('开始编译源代码...');
      
      // 重置程序状态
      setProgramFinished(false);
      setExitCode(null);
      
      const result = compiler.compileOnly(sourceCode);
      const assembly = compiler.getAssemblyContent();
      
      if (result) {
        addConsoleLog(`编译成功！生成 ${result.code.length} 条指令`);
        addConsoleLog(`数据段大小: ${result.data.length} 字节`);
        addConsoleLog(`主函数入口: ${result.mainIndex}`);
        
        setCompileResult({
          success: true,
          code: result.code,
          data: result.data,
          mainIndex: result.mainIndex,
          assembly
        });
        
        // 初始化VM（使用更小的栈大小）
        const newVm = new VirtualMachine(1024 * 8, (message: string) => {
          addConsoleLog(`[输出] ${message}`);
        }); // 8KB栈空间
        newVm.initialize(result.code, result.data, result.mainIndex);
        setVm(newVm);
        
        // 获取初始状态（简化版）
        setVmState({
          code: result.code,
          data: result.data,
          stack: [],
          pc: -1,
          sp: 0,
          bp: 0,
          ax: 0,
          cycle: 0
        });
        
        addConsoleLog('虚拟机初始化完成，准备执行');
      } else {
        addConsoleLog('编译失败！');
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
      addConsoleLog(`编译错误: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      // 如果PC为-1，说明程序还没有开始执行，先跳转到main函数
      if (vmState?.pc === -1) {
        addConsoleLog('程序开始执行，跳转到main函数');
        vm.initialize(compileResult.code, compileResult.data, compileResult.mainIndex);
        const initialState = vm.getState();
        setVmState(initialState);
        addConsoleLog(`PC: ${initialState.pc}, SP: ${initialState.sp}, BP: ${initialState.bp}`);
        return;
      }
      
      const currentInstruction = compileResult.code[vmState?.pc || 0];
      const instructionName = getInstructionName(currentInstruction.op);
      addConsoleLog(`执行指令: ${instructionName} ${currentInstruction.arg !== undefined ? currentInstruction.arg : ''}`);
      
      vm.step();
      const state = vm.getState();
      setVmState(state);
      
      addConsoleLog(`PC: ${state.pc}, SP: ${state.sp}, BP: ${state.bp}, AX: ${state.ax}`);
      
      // 检查程序是否结束（与VM.execute()逻辑保持一致）
      if (state.pc >= compileResult.code.length) {
        // PC超出代码范围，程序正常结束
        addConsoleLog('程序正常结束（PC超出代码范围）');
        console.log('Program finished: PC out of bounds', state.pc, 'code length:', compileResult.code.length);
        setProgramFinished(true);
        setExitCode(0); // 正常结束返回0
        // 程序结束后重置PC为-1
        setVmState(prev => prev ? { ...prev, pc: -1 } : null);
      } else {
        // 检查当前指令是否是EXIT
        const currentInstruction = compileResult.code[state.pc];
        if (currentInstruction && currentInstruction.op === 38) { // EXIT指令
          addConsoleLog(`程序结束（EXIT指令），退出码: ${state.ax}`);
          console.log('Program finished: EXIT instruction at PC', state.pc);
          setProgramFinished(true);
          setExitCode(state.ax);
          // 保存EXIT指令执行时的栈状态，然后重置PC为-1
          setVmState(prev => prev ? { ...state, pc: -1 } : null);
        }
      }
    } catch (error) {
      console.error('Step execution error:', error);
      setProgramFinished(true);
      // 出错时也重置PC为-1
      setVmState(prev => prev ? { ...prev, pc: -1 } : null);
    }
  };

  // 执行到最后
  const runToEnd = async () => {
    if (!vm || !compileResult?.success || programFinished) return;
    
    setIsRunning(true);
    try {
      // 如果PC为-1，说明程序还没有开始执行，先跳转到main函数
      if (vmState?.pc === -1) {
        vm.initialize(compileResult.code, compileResult.data, compileResult.mainIndex);
      }
      
      const exitCode = vm.execute();
      const state = vm.getState();
      setProgramFinished(true);
      setExitCode(exitCode);
      // 保存程序结束时的栈状态，然后重置PC为-1
      setVmState({ ...state, pc: -1 });
      console.log('Program finished with exit code:', exitCode);
    } catch (error) {
      console.error('Execution error:', error);
      setProgramFinished(true);
      // 出错时也重置PC为-1
      setVmState(prev => prev ? { ...prev, pc: -1 } : null);
    } finally {
      setIsRunning(false);
    }
  };

  // 重置
  const reset = () => {
    if (!compileResult?.success) return;
    
    const newVm = new VirtualMachine(1024 * 8, (message: string) => {
      addConsoleLog(`[输出] ${message}`);
    }); // 8KB栈空间
    // 不调用initialize，保持PC为-1
    setVm(newVm);
    // 重置VM状态，PC设置为-1
    setVmState({
      code: compileResult.code,
      data: compileResult.data,
      stack: [],
      pc: -1,
      sp: 0,
      bp: 0,
      ax: 0,
      cycle: 0
    });
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
            
            {/* 测试用例选择器 */}
            <div className="flex items-center gap-2 ml-6">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  onKeyDown={handleKeyDown}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-w-[200px] justify-between shadow-sm hover:shadow-md"
                >
                  <span className="text-slate-700">
                    {testCases.find(tc => tc.id === selectedTestCase)?.name}
                  </span>
                  <ChevronDownIcon 
                    className={`h-4 w-4 text-slate-500 transition-transform ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-300 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
                    {testCases.map((testCase, index) => (
                      <button
                        key={testCase.id}
                        onClick={() => selectTestCase(testCase.id)}
                        className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 transition-colors first:rounded-t-lg last:rounded-b-lg border-b border-slate-100 last:border-b-0 ${
                          selectedTestCase === testCase.id 
                            ? 'bg-blue-50 text-blue-700 font-medium border-blue-200' 
                            : focusedIndex === index
                            ? 'bg-slate-100 text-slate-800'
                            : 'text-slate-700'
                        }`}
                      >
                        <div className="font-medium">{testCase.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{testCase.description}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            </div>
            
            {/* 程序状态显示 */}
            <div className="flex items-center gap-2">
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
              <div className="flex items-center justify-between">
                <div className="flex items-center" style={{ gap: '8px' }}>
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <h2 className="text-sm font-semibold text-slate-700 ml-3">C 源代码</h2>
                </div>
                <div className="text-xs text-slate-600 bg-slate-200 px-2 py-1 rounded-full">
                  {testCases.find(tc => tc.id === selectedTestCase)?.description}
                </div>
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
                    const hasFunctionName = instruction.functionName;
                    return (
                      <div key={index}>
                        {/* 函数入口标注 */}
                        {hasFunctionName && (
                          <div className="mb-2 px-3 py-2 bg-gradient-to-r from-purple-100 to-pink-100 border-l-4 border-purple-500 rounded-lg">
                            <div className="flex items-center gap-2">
                              <span className="text-purple-600 font-bold text-sm">🏷️</span>
                              <span className="text-purple-700 font-semibold text-sm">
                                函数入口: {instruction.functionName}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {/* 指令内容 */}
                        <div
                          className={`p-3 rounded-xl text-sm font-mono transition-all duration-200 ${
                            isCurrent 
                              ? 'bg-gradient-to-r from-yellow-100 to-orange-100 border-l-4 border-yellow-500 shadow-lg transform scale-105' 
                              : 'hover:bg-slate-50 hover:shadow-md'
                          }`}
                          onMouseEnter={(e) => handleInstructionHover(instruction, e)}
                          onMouseLeave={handleInstructionLeave}
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
                    {vmState.data.length > 0 ? (
                      vmState.data.map((value: number, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                          <span className="text-slate-500 text-xs font-mono">[{index}]:</span>
                          <span className="text-slate-800 font-mono font-medium">
                            {typeof value === 'number' ? value : JSON.stringify(value)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-slate-500 text-xs">数据段为空</p>
                      </div>
                    )}
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
                  <div ref={stackRef} className="space-y-2">
                    {vmState.stack.length > 0 ? (
                      vmState.stack.map((value: number, index: number) => {
                        // stack[0] 对应地址 sp，stack[n] 对应地址 sp + n
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
      
      {/* 指令工具提示 */}
      <InstructionTooltip 
        instruction={tooltipInstruction!}
        visible={tooltipVisible}
        x={tooltipPosition.x}
        y={tooltipPosition.y}
      />
      
      {/* 控制台组件 */}
      <Console 
        isVisible={isConsoleVisible} 
        onClose={() => setIsConsoleVisible(false)} 
      />
    </div>
  );
}