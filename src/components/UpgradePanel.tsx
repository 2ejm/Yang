import React from 'react';
import { GameStats, DefenseUpgrades, SheepUnit, SheepType } from '../types';
import { 
  Cloud, 
  Flame, 
  Snowflake, 
  Zap, 
  Skull, 
  ShieldAlert, 
  Coins, 
  Hammer, 
  Heart, 
  Wrench,
  Sparkles,
  GitMerge,
  HelpCircle
} from 'lucide-react';

interface UpgradePanelProps {
  stats: GameStats;
  upgrades: DefenseUpgrades;
  sheepUnitCount: number; // defensive sheep slots occupied
  selectedSheep: SheepUnit | null;
  hasMergeableMatch: boolean; // whether selected sheep has 3 matching on pasture
  onBuySheepUnit: () => void;
  onBuyGoldSheep: () => void;
  onRepairFence: () => void;
  onUpgradeFenceMaxHp: () => void;
  onUpgradeFenceRegen: () => void;
  onUpgradeClassAtk: (type: SheepType) => void;
  onAutoMergeAll: () => void;
  onMergeSpecific: (sheep: SheepUnit) => void;
  onDeselect: () => void;
  onSellSheep: (sheep: SheepUnit) => void;
}

const elementIcons: Record<SheepType, React.ComponentType<any>> = {
  normal: Cloud,
  fire: Flame,
  freeze: Snowflake,
  lightning: Zap,
  poison: Skull,
};

const elementColors: Record<SheepType, string> = {
  normal: 'text-slate-100 bg-slate-500/20 border-slate-400/30',
  fire: 'text-red-400 bg-red-500/10 border-red-500/20',
  freeze: 'text-sky-400 bg-sky-500/10 border-sky-400/20',
  lightning: 'text-amber-400 bg-amber-500/10 border-amber-400/20',
  poison: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20',
};

const elementNames: Record<SheepType, string> = {
  normal: '일반 클래스 (구름 모직)',
  fire: '화염 클래스 (범위 폭발)',
  freeze: '빙결 클래스 (적 이속 감속)',
  lightning: '전격 클래스 (연쇄 지진)',
  poison: '맹독 클래스 (중독 피해)',
};

export const UpgradePanel: React.FC<UpgradePanelProps> = ({
  stats,
  upgrades,
  sheepUnitCount,
  selectedSheep,
  hasMergeableMatch,
  onBuySheepUnit,
  onBuyGoldSheep,
  onRepairFence,
  onUpgradeFenceMaxHp,
  onUpgradeFenceRegen,
  onUpgradeClassAtk,
  onAutoMergeAll,
  onMergeSpecific,
  onDeselect,
  onSellSheep,
}) => {

  // Dynamic cost calculations
  const buyDefCost = 50 + sheepUnitCount * 3; // soft scaling
  const buyGoldCost = Math.round(40 * Math.pow(1.4, stats.goldSheepCount - 1));
  const repairFenceCost = 30; // flat emergency cost
  
  const upgradeHpCost = Math.round(60 * Math.pow(1.35, upgrades.fenceUpgradeLevel));
  const upgradeRegenCost = Math.round(75 * Math.pow(1.45, upgrades.fenceRegenLevel));

  const getClassCost = (type: SheepType) => {
    switch(type) {
      case 'normal': return Math.round(45 * Math.pow(1.3, upgrades.normalAtkLevel));
      case 'fire': return Math.round(55 * Math.pow(1.3, upgrades.fireAtkLevel));
      case 'freeze': return Math.round(50 * Math.pow(1.3, upgrades.freezeSlowLevel));
      case 'lightning': return Math.round(55 * Math.pow(1.3, upgrades.lightningAtkLevel));
      case 'poison': return Math.round(50 * Math.pow(1.3, upgrades.poisonAtkLevel));
    }
  };

  const getClassLevel = (type: SheepType) => {
    switch(type) {
      case 'normal': return upgrades.normalAtkLevel;
      case 'fire': return upgrades.fireAtkLevel;
      case 'freeze': return upgrades.freezeSlowLevel;
      case 'lightning': return upgrades.lightningAtkLevel;
      case 'poison': return upgrades.poisonAtkLevel;
    }
  };

  const getClassDmgMultiplier = (type: SheepType) => {
    return 100 + getClassLevel(type) * 15;
  };

  const isBoardFull = sheepUnitCount >= 16;

  return (
    <div className="w-full max-w-sm bg-neutral-950/85 backdrop-blur-md rounded-2xl border border-neutral-800 p-4 shadow-2xl flex flex-col gap-4 pointer-events-auto h-full overflow-y-auto max-h-[85vh] custom-scrollbar">
      
      {/* Title & Core Gold summary */}
      <div id="upgrade-panel-header" className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-indigo-400 shrink-0" />
          <h2 className="font-sans font-extrabold text-md text-neutral-100">양 목장 통제 본부</h2>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 rounded-full border border-yellow-500/20 select-none">
          <Coins className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-yellow-300 font-mono text-xs font-bold">{stats.gold.toLocaleString()} G</span>
        </div>
      </div>

      {/* SECTION 1: RANCH MANAGEMENT (Spawning & Purchases) */}
      <div className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest pl-1">목장 관리 및 증축</h3>
        
        {/* Buy random defense unit */}
        <div className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/40 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-neutral-200">수비 클래스 양 뽑기</h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">양 목장에 임의 공격 속성의 양 1마리를 분양 받습니다.</p>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 mt-1.5 inline-block">
                Pasture: {sheepUnitCount}/16 슬롯
              </span>
            </div>
            <button
              id="buy-defense-sheep-btn"
              disabled={stats.gold < buyDefCost || isBoardFull}
              onClick={onBuySheepUnit}
              className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-150 w-24 cursor-pointer select-none ${
                stats.gold >= buyDefCost && !isBoardFull
                  ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white border-indigo-400 hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                  : 'bg-neutral-900/80 text-neutral-500 border-neutral-800'
              }`}
            >
              {isBoardFull ? (
                <span className="text-[9px] text-red-400">가득 참</span>
              ) : (
                <>
                  <span>양 뽑기</span>
                  <span className="font-mono text-[9px] mt-0.5 opacity-80">◆ {buyDefCost}G</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Buy Gold Resource unit */}
        <div className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/40 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-neutral-200">생산용 골드양 분양</h4>
              <p className="text-[10px] text-neutral-400 mt-0.5">인컴 뒷마당에 주기적으로 골드를 수급해주는 황금 양을 들여옵니다.</p>
              <p className="text-[9px] text-amber-500 font-semibold mt-1">매 5초 일시 수입: +{(stats.goldSheepCount * 12).toLocaleString()}G</p>
            </div>
            <button
              id="buy-gold-sheep-btn"
              disabled={stats.gold < buyGoldCost}
              onClick={onBuyGoldSheep}
              className={`flex flex-col items-center justify-center px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-150 w-24 cursor-pointer select-none ${
                stats.gold >= buyGoldCost
                  ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-white border-amber-400 hover:scale-105 active:scale-95 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'bg-neutral-900/80 text-neutral-500 border-neutral-800'
              }`}
            >
              <span>양 들여오기</span>
              <span className="font-mono text-[9px] mt-0.5 opacity-80">◆ {buyGoldCost}G</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: SHEEP TRACT MANUAL/AUTO MERGING */}
      <div className="flex flex-col gap-2 border-t border-neutral-900 pt-3">
        <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest pl-1">양 합성 및 정돈</h3>
        
        <div className="grid grid-cols-2 gap-2">
          {/* Auto Merge All Button */}
          <button
            id="auto-merge-all-btn"
            onClick={onAutoMergeAll}
            className="p-2.5 rounded-xl border border-dashed border-emerald-500/40 bg-emerald-950/10 hover:bg-emerald-950/20 text-emerald-300 text-left flex flex-col gap-1 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span className="text-xs font-bold text-emerald-200">모두 자동 합성</span>
            </div>
            <p className="text-[9px] text-emerald-400 leading-tight">Pasture의 동일개체 동일등급 3마리를 자동으로 정렬해 윗단계로 일괄 병합합니다. (비용 FREE!)</p>
          </button>

          {/* Conditional Selected Sheep Manual Merge */}
          {selectedSheep ? (
            <button
              id="selected-merge-btn"
              disabled={!hasMergeableMatch}
              onClick={() => onMergeSpecific(selectedSheep)}
              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                hasMergeableMatch
                  ? 'border-indigo-500 bg-indigo-950/25 text-indigo-300 hover:scale-[1.02] active:scale-[0.98]'
                  : 'border-neutral-800 bg-neutral-900/40 text-neutral-500'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <GitMerge className={`w-3.5 h-3.5 ${hasMergeableMatch ? 'text-indigo-400 animate-pulse' : 'text-neutral-600'}`} />
                <span className="text-xs font-bold">선택 개체 합성</span>
              </div>
              <p className="text-[9px] mt-1 leading-tight">
                {hasMergeableMatch 
                  ? `목장의 동일 ${selectedSheep.tier}성 양 3마리를 융합하여 ${selectedSheep.tier + 1}성이 됩니다!` 
                  : '동일등급 동일개체 3마리가 목장에 있어야 합사가 이뤄집니다.'}
              </p>
            </button>
          ) : (
            <div className="p-2.5 rounded-xl border border-neutral-800 bg-neutral-900/20 text-neutral-500 text-center flex flex-col justify-center items-center gap-1 italic">
              <HelpCircle className="w-5 h-5 text-neutral-700" />
              <span className="text-[9px]">양을 선택하면 합성 통제실이 열립니다.</span>
            </div>
          )}
        </div>

        {/* Selected Sheep Details HUD Card */}
        {selectedSheep && (
          <div className="p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 flex flex-col gap-1.5 relative">
            <button 
              onClick={onDeselect}
              className="absolute top-2 right-2 px-1 text-[9px] bg-indigo-900/40 text-indigo-300 hover:bg-indigo-900 rounded select-none cursor-pointer"
            >
              선택취소
            </button>
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">선택된 개체 요약</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐑</span>
              <div className="flex-1">
                <h5 className="text-xs font-black text-neutral-200">
                  {elementNames[selectedSheep.type]} ({selectedSheep.tier}성)
                </h5>
                <p className="text-[9px] text-neutral-400">슬롯 {selectedSheep.slotIdx + 1}번에 방목형 복무 중</p>
              </div>
            </div>
            
            {/* Sell button */}
            <button
              onClick={() => onSellSheep(selectedSheep)}
              className="mt-1 w-full py-2 bg-gradient-to-r from-red-650 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-sans font-bold text-[11px] rounded-lg border border-red-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md flex items-center justify-center gap-1 cursor-pointer select-none"
            >
              <span>💸 이 양 판매하기</span>
              <span className="font-mono text-[9px] bg-black/30 px-1.5 py-0.5 rounded text-yellow-300">
                +{selectedSheep.tier === 1 ? 35 : selectedSheep.tier === 2 ? 105 : 315}G 반환
              </span>
            </button>
          </div>
        )}
      </div>

      {/* SECTION 3: FENCE REINFORCEMENTS */}
      <div className="flex flex-col gap-2 border-t border-neutral-900 pt-3">
        <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest pl-1">울타리 보수공사</h3>
        
        <div className="grid grid-cols-3 gap-2">
          {/* Emergency repair button */}
          <button
            disabled={stats.gold < repairFenceCost || stats.fenceHp >= stats.fenceMaxHp}
            onClick={onRepairFence}
            className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer select-none ${
              stats.gold >= repairFenceCost && stats.fenceHp < stats.fenceMaxHp
                ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:scale-[1.03] active:scale-[0.97]'
                : 'border-neutral-850 bg-neutral-900/20 text-neutral-600'
            }`}
          >
            <Hammer className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-bold">긴급 보임</span>
            <span className="font-mono text-[8px] opacity-75">◆ {repairFenceCost}G</span>
          </button>

          {/* Upgrade Fence Max HP */}
          <button
            disabled={stats.gold < upgradeHpCost}
            onClick={onUpgradeFenceMaxHp}
            className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer select-none ${
              stats.gold >= upgradeHpCost
                ? 'border-sky-500/40 bg-sky-950/20 text-sky-300 hover:scale-[1.03] active:scale-[0.97]'
                : 'border-neutral-850 bg-neutral-900/20 text-neutral-600'
            }`}
          >
            <Heart className="w-4 h-4 text-sky-400 shrink-0" />
            <span className="text-[10px] font-bold">내구 확장 (+100)</span>
            <span className="font-mono text-[8px] opacity-75">LV {upgrades.fenceUpgradeLevel} / ◆ {upgradeHpCost}G</span>
          </button>

          {/* Upgrade regen */}
          <button
            disabled={stats.gold < upgradeRegenCost}
            onClick={onUpgradeFenceRegen}
            className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all cursor-pointer select-none ${
              stats.gold >= upgradeRegenCost
                ? 'border-purple-500/40 bg-purple-950/20 text-purple-300 hover:scale-[1.03] active:scale-[0.97]'
                : 'border-neutral-850 bg-neutral-900/20 text-neutral-600'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-[10px] font-bold">자동 재생 (+3/초)</span>
            <span className="font-mono text-[8px] opacity-75">LV {upgrades.fenceRegenLevel} / ◆ {upgradeRegenCost}G</span>
          </button>
        </div>
      </div>

      {/* SECTION 4: PER-CLASS DAMAGE/SLOW UPGRADES */}
      <div className="flex flex-col gap-2 border-t border-neutral-900 pt-3">
        <h3 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest pl-1">공격 클래스 상시 공조 </h3>
        
        <div className="flex flex-col gap-2">
          {(Object.keys(elementIcons) as SheepType[]).map((type) => {
            const Icon = elementIcons[type];
            const colorClass = elementColors[type];
            const cost = getClassCost(type);
            const level = getClassLevel(type);
            const canAfford = stats.gold >= cost;
            const multiplier = getClassDmgMultiplier(type);

            return (
              <div 
                key={type}
                className="p-2 rounded-xl border border-neutral-800 bg-neutral-900/30 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`p-1.5 rounded-lg border ${colorClass} shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-neutral-200 truncate">{elementNames[type].split(' ')[0]} 강공</span>
                      <span className="text-[9px] font-mono text-neutral-400 bg-neutral-800 px-1 hover:text-white rounded">LV {level}</span>
                    </div>
                    {type === 'freeze' ? (
                      <p className="text-[9px] text-neutral-500 mt-0.5 leading-none">피해 증가 & 감속 {getClassLevel(type) * 2}% 강화</p>
                    ) : (
                      <p className="text-[9px] text-neutral-500 mt-0.5 leading-none">클래스 투사 파워: {multiplier}% 강화</p>
                    )}
                  </div>
                </div>
                <button
                  disabled={!canAfford}
                  onClick={() => onUpgradeClassAtk(type)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-150 w-20 cursor-pointer select-none ${
                    canAfford
                      ? 'bg-yellow-500 text-neutral-950 border-yellow-400 hover:scale-105 active:scale-95 shadow-[0_0_8px_rgba(234,179,8,0.15)]'
                      : 'bg-neutral-900 text-neutral-600 border-neutral-950 pointer-events-none'
                  }`}
                >
                  <span>강화</span>
                  <span className="font-mono block text-[8px] tracking-tight">◆ {cost}G</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
