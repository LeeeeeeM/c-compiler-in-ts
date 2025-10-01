import React, { useState, useRef, useEffect } from 'react';
import { Minimize2, Trash2, Terminal } from 'lucide-react';

interface ConsoleProps {
  isVisible: boolean;
  onClose: () => void;
}

export const Console: React.FC<ConsoleProps> = ({ isVisible, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [position, setPosition] = useState({ 
    x: 300, 
    y: 20 
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const consoleRef = useRef<HTMLDivElement>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  // 添加日志
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // 清空日志
  const clearLogs = () => {
    setLogs([]);
  };

  // 处理拖拽开始
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setHasDragged(false);
    setStartPosition({ x: e.clientX, y: e.clientY });
    const rect = consoleRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // 处理拖拽移动
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      
      // 检测是否真的在拖拽（移动距离超过10像素）
      const deltaX = Math.abs(e.clientX - startPosition.x);
      const deltaY = Math.abs(e.clientY - startPosition.y);
      if (deltaX > 10 || deltaY > 10) {
        setHasDragged(true);
      }
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // 限制在屏幕范围内
      const maxX = window.innerWidth - (isExpanded ? 384 : 64); // 384 = 96*4, 64 = 16*4
      const maxY = window.innerHeight - (isExpanded ? 320 : 64); // 320 = 80*4, 64 = 16*4
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  };

  // 处理拖拽结束
  const handleMouseUp = () => {
    setIsDragging(false);
    // 延迟重置hasDragged，让点击事件有机会执行
    setTimeout(() => setHasDragged(false), 100);
  };

  // 添加全局事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // 暴露addLog方法给父组件
  useEffect(() => {
    (window as any).consoleAddLog = addLog;
    return () => {
      delete (window as any).consoleAddLog;
    };
  }, []);

  if (!isVisible) return null;

  // 悬浮球状态
  if (!isExpanded) {
    return (
      <div
        ref={consoleRef}
        className={`fixed z-50 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-2xl flex items-center justify-center ${isDragging ? 'cursor-grabbing' : 'cursor-pointer hover:scale-110'}`}
        style={{
          left: position.x,
          top: position.y
        }}
        onMouseDown={handleMouseDown}
        onClick={(e) => {
          if (!hasDragged) {
            setIsExpanded(true);
          }
        }}
      >
        <Terminal className="h-8 w-8 text-white" />
        {logs.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-bold">{logs.length}</span>
          </div>
        )}
      </div>
    );
  }

  // 展开状态
  return (
    <div
      ref={consoleRef}
      className="fixed z-50 bg-white rounded-xl shadow-2xl border border-slate-300 overflow-hidden backdrop-blur-sm w-96 h-80"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'default',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 控制台头部 */}
      <div className="console-header bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between cursor-grab active:cursor-grabbing rounded-t-xl">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-white" />
          <span className="text-sm font-semibold">CPC 控制台</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearLogs}
            className="p-1.5 hover:bg-white/20 rounded-lg bg-transparent"
            title="清空日志"
          >
            <Trash2 className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg bg-transparent"
            title="收缩为悬浮球"
          >
            <Minimize2 className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>

      {/* 控制台内容 */}
      <div className="h-full flex flex-col">
        {/* 日志区域 */}
        <div
          ref={logsRef}
          className="flex-1 p-4 bg-slate-900 text-green-400 font-mono text-xs overflow-y-auto"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#10b981'
          }}
        >
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>CPC 控制台已就绪</p>
              <p className="text-xs mt-1">编译和执行日志将显示在这里...</p>
            </div>
          ) : (
            logs.map((log, index) => {
              const isOutput = log.includes('[输出]');
              return (
                <div 
                  key={index} 
                  className={`mb-1 break-words leading-relaxed ${isOutput ? 'text-white' : ''}`}
                >
                  {log}
                </div>
              );
            })
          )}
        </div>

        {/* 输入区域 */}
        <div className="border-t border-slate-200 p-3 bg-slate-50">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="输入命令..."
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  const input = e.currentTarget;
                  addLog(`> ${input.value}`);
                  input.value = '';
                }
              }}
            />
            <button
              onClick={() => {
                const input = document.querySelector('input[placeholder="输入命令..."]') as HTMLInputElement;
                if (input && input.value) {
                  addLog(`> ${input.value}`);
                  input.value = '';
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              执行
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};