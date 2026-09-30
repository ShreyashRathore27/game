/**
 * Iconic SmackDown! Here Comes The Pain "Paper Doll" Body Damage Display
 * Shows targeted localized damage for HEAD, TORSO, ARMS, and LEGS.
 * Colors: Undamaged (Steel) -> Yellow -> Orange -> Critical Flashing Red.
 */

import React from 'react';
import { BodyDamage } from '../game/types';

interface BodyPartDollProps {
  damage: BodyDamage;
  isBleeding?: boolean;
  playerName: string;
  isPlayer1?: boolean;
}

export const BodyPartDoll: React.FC<BodyPartDollProps> = ({
  damage,
  isBleeding,
  playerName,
  isPlayer1 = true,
}) => {
  const getPartColor = (val: number) => {
    if (val >= 75) return '#ef4444'; // Red (Critical)
    if (val >= 50) return '#f97316'; // Orange (Moderate)
    if (val >= 25) return '#eab308'; // Yellow (Light)
    return '#475569'; // Muted Slate (Normal)
  };

  const getPartGlow = (val: number) => {
    if (val >= 75) return 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.9))';
    if (val >= 50) return 'drop-shadow(0 0 4px rgba(249, 115, 22, 0.7))';
    if (val >= 25) return 'drop-shadow(0 0 3px rgba(234, 179, 8, 0.6))';
    return 'none';
  };

  return (
    <div className={`flex flex-col ${isPlayer1 ? 'items-start' : 'items-end'}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-zinc-400 mb-1">
        <span>{isPlayer1 ? 'P1' : 'P2'} DAMAGE</span>
        {isBleeding && (
          <span className="text-red-500 font-extrabold animate-pulse">
            [FIRST BLOOD]
          </span>
        )}
      </div>

      <div className="relative w-14 h-24 bg-zinc-950/70 p-1.5 rounded border border-zinc-800/80 flex items-center justify-center">
        <svg
          viewBox="0 0 100 160"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* HEAD */}
          <circle
            cx="50"
            cy="24"
            r="16"
            fill={getPartColor(damage.head)}
            style={{ filter: getPartGlow(damage.head) }}
            className={`transition-colors duration-300 ${damage.head >= 75 ? 'animate-pulse' : ''}`}
          />
          {damage.head >= 75 && (
            <line
              x1="45"
              y1="22"
              x2="55"
              y2="28"
              stroke="#7f1d1d"
              strokeWidth="3"
            />
          )}

          {/* TORSO & CHEST */}
          <path
            d="M32 44 L68 44 L64 92 L36 92 Z"
            fill={getPartColor(damage.torso)}
            style={{ filter: getPartGlow(damage.torso) }}
            className="transition-colors duration-300"
          />

          {/* ARMS (Left & Right) */}
          {/* Left Arm */}
          <path
            d="M28 44 L16 52 L12 88 L22 88 L26 56 Z"
            fill={getPartColor(damage.arms)}
            style={{ filter: getPartGlow(damage.arms) }}
            className="transition-colors duration-300"
          />
          {/* Right Arm */}
          <path
            d="M72 44 L84 52 L88 88 L78 88 L74 56 Z"
            fill={getPartColor(damage.arms)}
            style={{ filter: getPartGlow(damage.arms) }}
            className="transition-colors duration-300"
          />

          {/* LEGS (Left & Right) */}
          {/* Left Leg */}
          <path
            d="M36 96 L47 96 L44 148 L32 148 Z"
            fill={getPartColor(damage.legs)}
            style={{ filter: getPartGlow(damage.legs) }}
            className="transition-colors duration-300"
          />
          {/* Right Leg */}
          <path
            d="M53 96 L64 96 L68 148 L56 148 Z"
            fill={getPartColor(damage.legs)}
            style={{ filter: getPartGlow(damage.legs) }}
            className="transition-colors duration-300"
          />

          {/* Subtle Anatomical Wireframe Outlines */}
          <circle cx="50" cy="24" r="16" fill="none" stroke="#000" strokeWidth="1.5" opacity="0.3" />
          <path d="M32 44 L68 44 L64 92 L36 92 Z" fill="none" stroke="#000" strokeWidth="1.5" opacity="0.3" />
        </svg>

        {/* Damage Values summary */}
        <div className={`absolute top-0.5 ${isPlayer1 ? '-right-7' : '-left-7'} flex flex-col gap-0.5 text-[8px] font-mono-nums font-bold text-zinc-500`}>
          <span style={{ color: getPartColor(damage.head) }}>H:{Math.round(damage.head)}</span>
          <span style={{ color: getPartColor(damage.torso) }}>B:{Math.round(damage.torso)}</span>
          <span style={{ color: getPartColor(damage.arms) }}>A:{Math.round(damage.arms)}</span>
          <span style={{ color: getPartColor(damage.legs) }}>L:{Math.round(damage.legs)}</span>
        </div>
      </div>
    </div>
  );
};
