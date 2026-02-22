import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Play, Timer, Zap, AlertCircle, ChevronLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GameMode, Block } from './types';
import { GRID_COLS, GRID_ROWS, INITIAL_ROWS, TIME_LIMIT, MIN_TARGET, MAX_TARGET, BLOCK_VALUES } from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const createBlock = (value?: number): Block => ({
  id: generateId(),
  value: value ?? BLOCK_VALUES[Math.floor(Math.random() * BLOCK_VALUES.length)],
  isSelected: false,
});

export default function App() {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [grid, setGrid] = useState<(Block | null)[][]>([]);
  const [targetSum, setTargetSum] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load high score
  useEffect(() => {
    const saved = localStorage.getItem('sumblock_highscore');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('sumblock_highscore', score.toString());
    }
  }, [score, highScore]);

  const generateTarget = useCallback(() => {
    setTargetSum(Math.floor(Math.random() * (MAX_TARGET - MIN_TARGET + 1)) + MIN_TARGET);
  }, []);

  const addNewRow = useCallback(() => {
    setGrid((prev) => {
      // Check if top row is occupied
      if (prev[0].some((cell) => cell !== null)) {
        setIsGameOver(true);
        return prev;
      }

      const newGrid = [...prev];
      // Shift everything up
      for (let r = 0; r < GRID_ROWS - 1; r++) {
        newGrid[r] = [...newGrid[r + 1]];
      }
      // Add new row at the bottom
      newGrid[GRID_ROWS - 1] = Array.from({ length: GRID_COLS }, () => createBlock());
      return newGrid;
    });
    setTimeLeft(TIME_LIMIT);
  }, []);

  const initGame = (selectedMode: GameMode) => {
    const initialGrid: (Block | null)[][] = Array.from({ length: GRID_ROWS }, () =>
      Array.from({ length: GRID_COLS }, () => null)
    );

    // Fill bottom rows
    for (let r = GRID_ROWS - INITIAL_ROWS; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        initialGrid[r][c] = createBlock();
      }
    }

    setGrid(initialGrid);
    setMode(selectedMode);
    setScore(0);
    setIsGameOver(false);
    setSelectedIds([]);
    generateTarget();
    setTimeLeft(TIME_LIMIT);
    setIsPaused(false);
  };

  // Timer logic for Time Mode
  useEffect(() => {
    if (mode === 'time' && !isGameOver && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            addNewRow();
            return TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, isGameOver, isPaused, addNewRow]);

  const handleBlockClick = (block: Block) => {
    if (isGameOver || isPaused) return;

    setSelectedIds((prev) => {
      const isAlreadySelected = prev.includes(block.id);
      let next: string[];
      if (isAlreadySelected) {
        next = prev.filter((id) => id !== block.id);
      } else {
        next = [...prev, block.id];
      }

      // Check sum
      const currentSum = next.reduce((sum, id) => {
        const b = grid.flat().find((item) => item?.id === id);
        return sum + (b?.value || 0);
      }, 0);

      if (currentSum === targetSum) {
        // Success!
        setTimeout(() => {
          removeBlocks(next);
          setScore((s) => s + next.length * 10);
          generateTarget();
          if (mode === 'classic') {
            addNewRow();
          }
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#141414', '#E4E3E0', '#F27D26']
          });
        }, 100);
        return [];
      } else if (currentSum > targetSum) {
        // Exceeded sum, clear selection
        return [];
      }

      return next;
    });
  };

  const removeBlocks = (ids: string[]) => {
    setGrid((prev) => {
      const newGrid = prev.map((row) =>
        row.map((cell) => (cell && ids.includes(cell.id) ? null : cell))
      );

      // Apply gravity: blocks fall down
      for (let c = 0; c < GRID_COLS; c++) {
        let emptyRow = GRID_ROWS - 1;
        for (let r = GRID_ROWS - 1; r >= 0; r--) {
          if (newGrid[r][c] !== null) {
            const temp = newGrid[r][c];
            newGrid[r][c] = null;
            newGrid[emptyRow][c] = temp;
            emptyRow--;
          }
        }
      }
      return newGrid;
    });
    setSelectedIds([]);
  };

  if (!mode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#E4E3E0]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter uppercase italic font-mono">
              数字<span className="text-[#F27D26]">消除</span>
            </h1>
            <p className="text-sm font-mono opacity-60 uppercase tracking-widest">数学消除协议</p>
          </div>

          <div className="grid gap-4">
            <button
              onClick={() => initGame('classic')}
              className="group relative overflow-hidden bg-[#141414] text-[#E4E3E0] p-6 rounded-none border-2 border-[#141414] hover:bg-transparent hover:text-[#141414] transition-all duration-300"
            >
              <div className="relative z-10 flex flex-col items-start text-left">
                <span className="text-2xl font-bold uppercase italic">经典模式</span>
                <span className="text-xs opacity-60 font-mono">每次成功消除后新增一行。尽可能生存更久。</span>
              </div>
              <Play className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-100 transition-opacity w-12 h-12" />
            </button>

            <button
              onClick={() => initGame('time')}
              className="group relative overflow-hidden bg-transparent text-[#141414] p-6 rounded-none border-2 border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-all duration-300"
            >
              <div className="relative z-10 flex flex-col items-start text-left">
                <span className="text-2xl font-bold uppercase italic">计时模式</span>
                <span className="text-xs opacity-60 font-mono">每{TIME_LIMIT}秒强制新增一行。速度是唯一的盟友。</span>
              </div>
              <Timer className="absolute right-4 top-1/2 -translate-y-1/2 opacity-10 group-hover:opacity-100 transition-opacity w-12 h-12" />
            </button>

            <button
              onClick={() => setShowInstructions(true)}
              className="text-xs font-mono uppercase opacity-40 hover:opacity-100 transition-opacity"
            >
              玩法说明?
            </button>
          </div>

          <AnimatePresence>
            {showInstructions && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-[#141414]/90 backdrop-blur-sm flex items-center justify-center p-6"
              >
                <div className="bg-[#E4E3E0] p-8 border-2 border-[#141414] max-w-sm w-full text-left space-y-4">
                  <h3 className="text-2xl font-black italic uppercase">操作手册</h3>
                  <ul className="space-y-2 text-sm font-mono list-disc pl-4">
                    <li>选择数字使其总和等于 <span className="font-bold">目标数字</span>。</li>
                    <li>数字无需相邻。</li>
                    <li>如果总和超过目标，选择将自动清除。</li>
                    <li>防止方块堆积到 <span className="text-red-600 font-bold">顶端红线</span>。</li>
                    <li><span className="font-bold">经典模式：</span> 每次成功消除后增加一行。</li>
                    <li><span className="font-bold">计时模式：</span> 每{TIME_LIMIT}秒自动增加一行。</li>
                  </ul>
                  <button 
                    onClick={() => setShowInstructions(false)}
                    className="w-full py-3 bg-[#141414] text-[#E4E3E0] font-bold uppercase italic"
                  >
                    我明白了
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-8 flex justify-center gap-8 border-t border-[#141414]/10">
            <div className="text-left">
              <p className="text-[10px] font-mono uppercase opacity-50">最高分</p>
              <p className="text-2xl font-bold font-mono">{highScore.toLocaleString()}</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] font-mono uppercase opacity-50">状态</p>
              <p className="text-2xl font-bold font-mono text-emerald-600">就绪</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] flex flex-col md:flex-row">
      {/* Sidebar / Header */}
      <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#141414] p-6 flex flex-col justify-between bg-[#E4E3E0] z-20">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setMode(null)}
              className="p-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter">
              数字<span className="text-[#F27D26]">消除</span>
            </h2>
          </div>

          <div className="space-y-6">
            <div className="p-4 border-2 border-[#141414] bg-[#141414] text-[#E4E3E0]">
              <p className="text-[10px] font-mono uppercase opacity-60 mb-1">目标数字</p>
              <p className="text-6xl font-black font-mono leading-none">{targetSum}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border border-[#141414]">
                <p className="text-[10px] font-mono uppercase opacity-60">当前得分</p>
                <p className="text-xl font-bold font-mono">{score.toLocaleString()}</p>
              </div>
              <div className="p-3 border border-[#141414]">
                <p className="text-[10px] font-mono uppercase opacity-60">最高得分</p>
                <p className="text-xl font-bold font-mono">{highScore.toLocaleString()}</p>
              </div>
            </div>

            {mode === 'time' && (
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-mono uppercase opacity-60">下一行倒计时</p>
                  <p className={cn(
                    "text-xl font-bold font-mono",
                    timeLeft <= 3 ? "text-red-600 animate-pulse" : ""
                  )}>{timeLeft}s</p>
                </div>
                <div className="h-2 bg-[#141414]/10 overflow-hidden">
                  <motion.div 
                    className="h-full bg-[#141414]"
                    initial={{ width: '100%' }}
                    animate={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
                    transition={{ duration: 1, ease: "linear" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="w-full py-3 border-2 border-[#141414] font-bold uppercase italic flex items-center justify-center gap-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            {isPaused ? '继续' : '暂停'}
          </button>
          <button 
            onClick={() => initGame(mode)}
            className="w-full py-3 border-2 border-[#141414] font-bold uppercase italic flex items-center justify-center gap-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-all"
          >
            <RotateCcw className="w-4 h-4" /> 重置游戏
          </button>
          <div className="text-[10px] font-mono uppercase opacity-40 text-center">
            模式: {mode === 'classic' ? '经典' : '计时'} • v1.0.4
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 md:p-8">
        <div 
          className="relative bg-white border-2 border-[#141414] shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
            width: 'min(90vw, 500px)',
            aspectRatio: `${GRID_COLS} / ${GRID_ROWS}`,
          }}
        >
          {/* Background Grid Lines */}
          {Array.from({ length: GRID_ROWS * GRID_COLS }).map((_, i) => (
            <div key={`bg-${i}`} className="border-[0.5px] border-[#141414]/5" />
          ))}

          {/* Blocks */}
          <div className="absolute inset-0 grid" style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
          }}>
            <AnimatePresence>
              {grid.map((row, rIndex) =>
                row.map((block, cIndex) => {
                  if (!block) return null;
                  const isSelected = selectedIds.includes(block.id);
                  
                  return (
                    <motion.button
                      key={block.id}
                      layoutId={block.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ 
                        scale: 1, 
                        opacity: 1,
                        gridRow: rIndex + 1,
                        gridColumn: cIndex + 1,
                      }}
                      exit={{ scale: 1.5, opacity: 0, filter: 'blur(10px)' }}
                      onClick={() => handleBlockClick(block)}
                      className={cn(
                        "w-full h-full flex items-center justify-center text-2xl md:text-3xl font-black transition-all duration-200 border border-[#141414]/10",
                        isSelected 
                          ? "bg-[#F27D26] text-[#E4E3E0] z-10 scale-95 shadow-inner" 
                          : "bg-white text-[#141414] hover:bg-[#141414]/5"
                      )}
                    >
                      {block.value}
                    </motion.button>
                  );
                })
              )}
            </AnimatePresence>
          </div>

          {/* Warning Line (Top Row) */}
          <div className="absolute top-0 left-0 w-full h-[10%] border-b-2 border-dashed border-red-500/30 pointer-events-none" />
        </div>

        {/* Pause Overlay */}
        <AnimatePresence>
          {isPaused && !isGameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-[#141414]/40 backdrop-blur-md flex items-center justify-center"
            >
              <div className="text-center space-y-4">
                <h3 className="text-6xl font-black italic uppercase text-[#E4E3E0] tracking-tighter">已暂停</h3>
                <button 
                  onClick={() => setIsPaused(false)}
                  className="px-8 py-4 bg-[#F27D26] text-[#E4E3E0] font-bold uppercase italic hover:scale-105 transition-transform"
                >
                  恢复协议
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {isGameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 z-50 bg-[#141414]/90 backdrop-blur-sm flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-[#E4E3E0] p-8 border-4 border-[#F27D26] max-w-sm w-full text-center space-y-6"
              >
                <div className="space-y-2">
                  <AlertCircle className="w-16 h-16 text-red-600 mx-auto" />
                  <h3 className="text-4xl font-black italic uppercase tracking-tighter">系统崩溃</h3>
                  <p className="text-sm font-mono opacity-60 uppercase">方块已达到临界阈值</p>
                </div>

                <div className="py-4 border-y border-[#141414]/10">
                  <p className="text-[10px] font-mono uppercase opacity-50">最终得分</p>
                  <p className="text-5xl font-black font-mono">{score.toLocaleString()}</p>
                </div>

                <div className="grid gap-3">
                  <button 
                    onClick={() => initGame(mode)}
                    className="w-full py-4 bg-[#141414] text-[#E4E3E0] font-bold uppercase italic hover:bg-[#F27D26] transition-colors"
                  >
                    再试一次
                  </button>
                  <button 
                    onClick={() => setMode(null)}
                    className="w-full py-4 border-2 border-[#141414] font-bold uppercase italic hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                  >
                    返回主菜单
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
