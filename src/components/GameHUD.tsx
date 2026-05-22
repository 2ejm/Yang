import React from 'react';
import { GameStats } from '../types';
import { Shield, Coins, Flame, Award, Hourglass, ShieldAlert } from 'lucide-react';

interface GameHUDProps {
  stats: GameStats;
}

export const GameHUD: React.FC<GameHUDProps> = ({ stats }) => {
  const hpPercent = Math.max(0, Math.min(100, (stats.fenceHp / stats.fenceMaxHp) * 100));
  const isLp = hpPercent < 30;

  return (
    <div className="w-full flex flex-col gap-2 pointer-events-none select-none z-10">
      {/* Top Bar for status indicators */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-950/85 backdrop-blur-md px-5 py-3 rounded-2xl border border-neutral-800/80 shadow-xl">
        
        {/* Fence HP Bar */}
        <div className="flex flex-col gap-1 w-60">
          <div className="flex justify-between items-center px-1">
            <span className="flex items-center gap-1.5 text-xs text-neutral-300 font-sans font-medium">
              <Shield className={`w-3.5 h-3.5 ${isLp ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`} />
              목장 울타리 내구도
            </span>
            <span className="text-xs font-mono font-bold text-neutral-200">
              {Math.max(0, Math.floor(stats.fenceHp))} / {stats.fenceMaxHp}
            </span>
          </div>
          <div className="w-full h-3 bg-neutral-900 border border-neutral-800 rounded-full overflow-hidden relative">
            <div 
              className={`h-full transition-all duration-150 ${
                isLp 
                  ? 'bg-gradient-to-r from-red-600 to-rose-450 animate-pulse' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
               }`}
              style={{ width: `${hpPercent}%` }}
            />
            {isLp && (
              <div className="absolute inset-0 bg-red-600/10 animate-ping pointer-events-none rounded-full" />
            )}
          </div>
        </div>

        {/* HUD Statistics */}
        <div className="flex items-center gap-5">
          {/* Gold Balance */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-neutral-500 uppercase font-sans tracking-wider">보유 재화</span>
            <span className="text-sm font-mono font-black text-yellow-400 flex items-center gap-1 mt-0.5 animate-pulse">
              <Coins className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              {stats.gold.toLocaleString()} G
            </span>
          </div>

          <div className="h-6 w-px bg-neutral-800" />

          {/* Wave Number */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-neutral-500 uppercase font-sans tracking-wider">현재 웨이브</span>
            <span className="text-sm font-mono font-bold text-sky-400 flex items-center gap-1 mt-0.5">
              <Flame className="w-3.5 h-3.5 text-sky-450 shrink-0" />
              {stats.waveNum} 단계
            </span>
          </div>

          <div className="h-6 w-px bg-neutral-800" />

          {/* Wave Timer */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-neutral-500 uppercase font-sans tracking-wider">다음 습격까지</span>
            <span className={`text-sm font-mono font-bold flex items-center gap-1 mt-0.5 ${stats.waveTimeLeft <= 5 ? 'text-red-400 animate-pulse font-black' : 'text-neutral-300'}`}>
              <Hourglass className={`w-3.5 h-3.5 shrink-0 ${stats.waveTimeLeft <= 5 ? 'text-red-400 animate-spin' : 'text-indigo-400'}`} />
              {stats.waveTimeLeft}초
            </span>
          </div>

          <div className="h-6 w-px bg-neutral-800" />

          {/* Income Sheeps */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-neutral-500 uppercase font-sans tracking-wider font-medium">생산용 골드양</span>
            <span className="text-sm font-mono font-bold text-amber-500 flex items-center gap-1 mt-0.5">
              🐑 <span className="text-neutral-200">{stats.goldSheepCount}마리</span>
            </span>
          </div>
        </div>

        {/* HUD Game Score */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-medium font-sans">누적 제압수</span>
          <span className="text-md font-mono font-bold text-indigo-400 tracking-tight flex items-center gap-1 mt-0.5">
            <Award className="w-3.5 h-3.5 text-indigo-400" />
            {stats.wolvesDefeated} 마리
          </span>
        </div>
      </div>

      {/* Alert banner for critical low Fence HP */}
      {isLp && (
        <div className="w-full flex justify-center animate-bounce mt-1">
          <div className="flex items-center gap-2 px-4 py-1.5 bg-red-950/90 border-2 border-red-650 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.3)] backdrop-blur-md">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-pulse shrink-0" />
            <span className="text-red-100 font-sans font-bold text-[11px] tracking-wider uppercase animate-pulse">
              경고: 울타리 파손 위기! 보수가 시급합니다!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
