import React from 'react';
import { Upgrade, UpgradeType } from '../types';
import { 
  Sword, 
  Zap, 
  Disc, 
  Heart, 
  ShieldAlert, 
  Gauge, 
  Magnet, 
  Layers, 
  Coins 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UpgradePanelProps {
  upgrades: Upgrade[];
  minerals: number;
  onUpgrade: (type: UpgradeType) => void;
}

const uIcons: Record<UpgradeType, React.ComponentType<any>> = {
  damage: Sword,
  fireRate: Zap,
  range: Disc,
  maxHp: Heart,
  regen: ShieldAlert,
  speed: Gauge,
  magnet: Magnet,
  projectileCount: Layers,
};

const iconColors: Record<UpgradeType, string> = {
  damage: 'text-rose-400 bg-rose-500/10',
  fireRate: 'text-amber-400 bg-amber-500/10',
  range: 'text-sky-400 bg-sky-500/10',
  maxHp: 'text-emerald-400 bg-emerald-500/10',
  regen: 'text-purple-400 bg-purple-500/10',
  speed: 'text-teal-400 bg-teal-500/10',
  magnet: 'text-cyan-400 bg-cyan-500/10',
  projectileCount: 'text-indigo-400 bg-indigo-500/10',
};

export const UpgradePanel: React.FC<UpgradePanelProps> = ({
  upgrades,
  minerals,
  onUpgrade,
}) => {
  return (
    <div className="w-full max-w-sm bg-neutral-950/85 backdrop-blur-md rounded-2xl border border-neutral-800 p-4 shadow-2xl flex flex-col gap-3 pointer-events-auto max-h-[85vh] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-1">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-yellow-400 animate-pulse" />
          <span className="font-sans font-bold text-lg text-neutral-100">우주선 업그레이드</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 rounded-full border border-yellow-500/20">
          <span className="text-yellow-400 font-mono text-xs font-bold">보유 광물:</span>
          <span className="text-yellow-300 font-mono text-sm font-bold">{minerals.toLocaleString()}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {upgrades.map((up) => {
          const Icon = uIcons[up.id];
          const colorClass = iconColors[up.id];
          const isMaxed = up.level >= up.maxLevel;
          const cost = isMaxed ? 0 : Math.round(up.baseCost * Math.pow(up.costMultiplier, up.level));
          const canAfford = minerals >= cost && !isMaxed;

          return (
            <div 
              key={up.id}
              className={`p-2.5 rounded-xl border transition-all duration-200 bg-neutral-900/40 hover:bg-neutral-900/70 border-neutral-800 flex items-center justify-between gap-3`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="font-sans font-medium text-xs text-neutral-200 truncate">{up.name}</span>
                    <span className="font-mono text-[10px] text-neutral-400">
                      LV {up.level}/{up.maxLevel}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 truncate mt-0.5">{up.desc}</p>
                  
                  {/* Progress bar */}
                  <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden mt-1.5">
                    <div 
                      className={`h-full transition-all duration-300 ${isMaxed ? 'bg-gradient-to-r from-cyan-400 to-indigo-500' : 'bg-neutral-300'}`}  
                      style={{ width: `${(up.level / up.maxLevel) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                {isMaxed ? (
                  <span className="text-[10px] font-bold text-center block px-2.5 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-400 bg-cyan-500/5 uppercase tracking-wide">
                    MAX
                  </span>
                ) : (
                  <button
                    disabled={!canAfford}
                    onClick={() => onUpgrade(up.id)}
                    className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-200 border w-20 cursor-pointer ${
                      canAfford
                        ? 'bg-yellow-500 text-neutral-950 border-yellow-400 hover:scale-[1.04] shadow-[0_0_12px_rgba(234,179,8,0.2)] active:scale-[0.965]'
                        : 'bg-neutral-800/50 text-neutral-500 border-neutral-800 pointer-events-none'
                    }`}
                  >
                    <span>강화</span>
                    <span className="font-mono mt-0.5 flex items-center gap-0.5 text-[9px]">
                      ◆ {cost}
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
