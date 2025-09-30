import React, { useState, useCallback } from 'react';
import { CPCCompiler } from '../lib';
import type { CompilerResult, ExecutionResult } from '../lib/types';
import { Play, Square, Bug, FileText } from 'lucide-react';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const Editor: React.FC<EditorProps> = ({ value, onChange, placeholder }) => {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-full resize-none bg-gray-900 text-green-400 font-mono text-sm p-4 border-0 outline-none"
      spellCheck={false}
    />
  );
};

const ExamplePrograms = {
  'Hello World': `int main() {
    printf("Hello, World!");
    return 0;
}`,
  'Simple Math': `int main() {
    int a = 10;
    int b = 20;
    int sum = a + b;
    printf("Sum: %d", sum);
    return 0;
}`,
  'Factorial': `int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    int result = factorial(5);
    printf("Factorial of 5 is %d", result);
    return 0;
}`,
  'Fibonacci': `int fibonacci(int n) {
    if (n <= 1) {
        return n;
    }
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    int i = 0;
    while (i < 10) {
        printf("fibonacci(%d) = %d", i, fibonacci(i));
        i = i + 1;
    }
    return 0;
}`,
  'Conditional': `int main() {
    int x = 15;
    if (x > 10) {
        printf("x is greater than 10");
    } else {
        printf("x is not greater than 10");
    }
    return 0;
}`,
  'Loop': `int main() {
    int i = 0;
    while (i < 5) {
        printf("Count: %d", i);
        i = i + 1;
    }
    return 0;
}`
};

export default function App() {
  const [sourceCode, setSourceCode] = useState(ExamplePrograms['Hello World']);
  const [compilerResult, setCompilerResult] = useState<CompilerResult | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showDebugger, setShowDebugger] = useState(false);
  const [vmState, setVmState] = useState<any>(null);
  const [selectedExample, setSelectedExample] = useState('Hello World');
  const [debugMode, setDebugMode] = useState(false);

  const compiler = new CPCCompiler();

  const compileAndRun = useCallback(async () => {
    try {
      setIsRunning(true);
      setExecutionResult(null);
      
      // Compile
      const compileResult = compiler.compile(sourceCode);
      setCompilerResult(compileResult);
      
      if (!compileResult.success) {
        setIsRunning(false);
        return;
      }
      
      // Execute
      const execResult = compiler.execute(compileResult.instructions);
      setExecutionResult(execResult);
      setVmState(execResult.vmState);
      
    } catch (error) {
      setExecutionResult({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsRunning(false);
    }
  }, [sourceCode, compiler]);

  const stepDebug = useCallback(() => {
    if (!compilerResult?.success) return;
    
    try {
      const execResult = compiler.execute(compilerResult.instructions);
      setExecutionResult(execResult);
      setVmState(execResult.vmState);
    } catch (error) {
      setExecutionResult({
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }, [compilerResult, compiler]);

  const resetDebug = useCallback(() => {
    setExecutionResult(null);
    setVmState(null);
  }, []);

  const loadExample = (exampleName: string) => {
    setSourceCode(ExamplePrograms[exampleName as keyof typeof ExamplePrograms]);
    setSelectedExample(exampleName);
    setCompilerResult(null);
    setExecutionResult(null);
    resetDebug();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">CPC Compiler</h1>
              <span className="ml-3 text-sm text-gray-500">Browser Edition</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={selectedExample}
                onChange={(e) => loadExample(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                {Object.keys(ExamplePrograms).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              
              <button
                onClick={() => {
                  setShowDebugger(!showDebugger);
                  setDebugMode(!debugMode);
                }}
                className={`p-2 rounded-md ${showDebugger ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Toggle Debugger"
              >
                <Bug className="h-5 w-5" />
              </button>
              
              {debugMode && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={stepDebug}
                    disabled={!compilerResult?.success}
                    className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Step
                  </button>
                  <button
                    onClick={resetDebug}
                    className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                  >
                    Reset
                  </button>
                </div>
              )}
              
              <button
                onClick={compileAndRun}
                disabled={isRunning}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <Square className="h-4 w-4 mr-2" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Editor */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="text-sm font-medium text-gray-900">Source Code</h2>
            </div>
            <div className="h-96">
              <Editor
                value={sourceCode}
                onChange={setSourceCode}
                placeholder="Enter your C code here..."
              />
            </div>
          </div>

          {/* Output Panel */}
          <div className="space-y-6">
            {/* Compilation Results */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h2 className="text-sm font-medium text-gray-900">Compilation</h2>
              </div>
              <div className="p-4">
                {compilerResult ? (
                  <div className={`text-sm ${compilerResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {compilerResult.success ? (
                      <div>
                        <div className="font-medium">✓ Compilation successful</div>
                        <div className="mt-2 text-gray-600">
                          Generated {compilerResult.instructions.length} instructions
                        </div>
                        {compilerResult.instructions.length > 0 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-blue-600">View Instructions</summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                              {compilerResult.instructions.map((inst, i) => 
                                `${i.toString().padStart(3, ' ')}: ${inst.op}${inst.value !== undefined ? ` ${inst.value}` : ''}`
                              ).join('\n')}
                            </pre>
                          </details>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">✗ Compilation failed</div>
                        <div className="mt-1 text-red-500">{compilerResult.error}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No compilation results yet</div>
                )}
              </div>
            </div>

            {/* Execution Results */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h2 className="text-sm font-medium text-gray-900">Output</h2>
              </div>
              <div className="p-4">
                {executionResult ? (
                  <div className={`text-sm ${executionResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {executionResult.success ? (
                      <div>
                        <div className="font-medium">✓ Execution completed</div>
                        {executionResult.output && (
                          <div className="mt-2">
                            <div className="text-gray-600 mb-1">Output:</div>
                            <pre className="bg-gray-100 p-2 rounded text-gray-800 font-mono text-xs whitespace-pre-wrap">
                              {executionResult.output}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">✗ Execution failed</div>
                        <div className="mt-1 text-red-500">{executionResult.error}</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No execution results yet</div>
                )}
              </div>
            </div>

            {/* Debugger Panel */}
            {showDebugger && vmState && (
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <h2 className="text-sm font-medium text-gray-900">Debugger</h2>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-gray-700">Registers</div>
                      <div className="mt-1 space-y-1">
                        <div>PC: {vmState.pc}</div>
                        <div>SP: {vmState.sp}</div>
                        <div>BP: {vmState.bp}</div>
                        <div>AX: {vmState.ax}</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">Stack</div>
                      <div className="mt-1">
                        <div className="text-xs text-gray-500">
                          Size: {vmState.stack.length}
                        </div>
                        {vmState.stack.length > 0 && (
                          <div className="mt-1 max-h-20 overflow-auto">
                            {vmState.stack.slice(-10).map((value: number, i: number) => (
                              <div key={i} className="text-xs font-mono">
                                [{vmState.stack.length - 10 + i}]: {value}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">Supported C Language Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Data Types</h4>
              <ul className="text-blue-700 space-y-1">
                <li>• int (64-bit integers)</li>
                <li>• char (8-bit characters)</li>
                <li>• void (function return type)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Control Flow</h4>
              <ul className="text-blue-700 space-y-1">
                <li>• if/else statements</li>
                <li>• while loops</li>
                <li>• function calls</li>
                <li>• return statements</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Operators</h4>
              <ul className="text-blue-700 space-y-1">
                <li>• Arithmetic: +, -, *, /, %</li>
                <li>• Comparison: ==, !=, &lt;, &gt;, &lt;=, &gt;=</li>
                <li>• Assignment: =</li>
                <li>• Bitwise: &, |, ^, &lt;&lt;, &gt;&gt;</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}