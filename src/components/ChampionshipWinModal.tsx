/**
 * Championship Victory Screen & Match Summary
 */

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { WrestlerProfile, WrestlerFighter } from '../game/types';
import { Trophy, RotateCcw, Users, Flame } from 'lucide-react';

interface ChampionshipWinModalProps {
  winner: WrestlerFighter;
  loser: WrestlerFighter;
  winnerProfile: WrestlerProfile;
  winMethod: 'pinfall' | 'submission' | 'knockout';
  matchTime: number;
  onRematch: () => void;
  onSelectNew: () => void;
}

export const ChampionshipWinModal: React.FC<ChampionshipWinModalProps> = ({
  winner,
  loser,
  winnerProfile,
  winMethod,
  matchTime,
  onRematch,
  onSelectNew,
}) => {
  useEffect(() => {
    // Launch gold & red championship confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#eab308', '#ef4444', '#f59e0b', '#ffffff'],
    });

    const timeout = setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });
    }, 400);

    return () => clearTimeout(timeout);
  }, []);

  const minutes = Math.floor(matchTime / 60);
  const seconds = Math.floor(matchTime % 60);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-zinc-950 border-2 border-amber-500 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.5)] p-6 text-zinc-100 flex flex-col items-center text-center gap-5 animate-impact-shake">
        {/* Championship Belt Emblem */}
        <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.8)] bg-zinc-900">
          <img
            src="/src/assets/images/championship_gold_emblem_1790748723898.jpg"
            alt="Heavyweight Championship Emblem"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>

        <div>
          <span className="text-xs font-black uppercase tracking-widest text-amber-400 block mb-1">
            AND NEW / STILL CHAMPION!
          </span>
          <h2 className="font-heading font-black text-3xl text-white uppercase italic tracking-wide">
            {winner.name}
          </h2>
          <p className="text-sm font-semibold text-zinc-400 italic">
            "{winnerProfile.tauntPhrase}"
          </p>
        </div>

        {/* Match Statistics */}
        <div className="w-full bg-zinc-900/80 border border-zinc-800 rounded-lg p-3.5 grid grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col items-center">
            <span className="text-zinc-500 uppercase font-bold text-[10px]">
              VICTORY METHOD
            </span>
            <span className="font-heading font-extrabold text-white uppercase text-sm">
              {winMethod.toUpperCase()}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-zinc-500 uppercase font-bold text-[10px]">
              MATCH TIME
            </span>
            <span className="font-mono-nums font-extrabold text-amber-400 text-sm">
              {formattedTime}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 w-full mt-2">
          <button
            onClick={onRematch}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-heading font-black text-sm uppercase rounded-lg shadow-lg active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REMATCH</span>
          </button>

          <button
            onClick={onSelectNew}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-heading font-black text-sm uppercase border border-zinc-700 rounded-lg active:scale-95 transition-all"
          >
            <Users className="w-4 h-4" />
            <span>ROSTER SELECT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
