/**
 * Comprehensive Move List & HCTP Combat Manual
 */

import React from 'react';
import { X, BookOpen, Swords, Shield, Zap, Flame, Award } from 'lucide-react';
import { ControllerType, inputManager } from '../game/inputManager';

interface MoveListModalProps {
  controllerType: ControllerType;
  onClose: () => void;
}

export const MoveListModal: React.FC<MoveListModalProps> = ({ controllerType, onClose }) => {
  const p = (action: string) => inputManager.getButtonPrompt(action, controllerType).key;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-100 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="font-heading font-black text-lg uppercase tracking-wide">
              SMACKDOWN COMBAT SYSTEM & MOVE LIST
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* 1. Strikes & Running */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-lg flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-extrabold uppercase">
              <Swords className="w-4 h-4" />
              <span>Strikes & Brawling</span>
            </div>
            <ul className="flex flex-col gap-1.5 text-zinc-300">
              <li>
                <strong className="text-white">Light Strike:</strong> Tap [{p('strike')}] (Fast Left Jab)
              </li>
              <li>
                <strong className="text-white">Heavy Strike:</strong> Hold [{p('strike')}] (Right Roundhouse / Hook)
              </li>
              <li>
                <strong className="text-white">Running Clothesline:</strong> Run + [{p('strike')}] (High impact knockdown)
              </li>
              <li>
                <strong className="text-white">Ground Stomp:</strong> Tap [{p('strike')}] near grounded opponent
              </li>
            </ul>
          </div>

          {/* 2. 4-Way Grapple System */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-lg flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-blue-400 font-extrabold uppercase">
              <Zap className="w-4 h-4" />
              <span>4-Way Grapple System</span>
            </div>
            <ul className="flex flex-col gap-1.5 text-zinc-300">
              <li>
                <strong className="text-white">Up + [{p('grapple')}]:</strong> Brainbuster / Vertical Suplex
              </li>
              <li>
                <strong className="text-white">Down + [{p('grapple')}]:</strong> Spinebuster / Powerbomb
              </li>
              <li>
                <strong className="text-white">Left + [{p('grapple')}]:</strong> Snap DDT / Neckbreaker
              </li>
              <li>
                <strong className="text-white">Right + [{p('grapple')}]:</strong> Overhead Belly-to-Belly Suplex
              </li>
            </ul>
          </div>

          {/* 3. Red Smackdown Finisher */}
          <div className="bg-red-950/40 border border-red-800/80 p-4 rounded-lg flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-red-400 font-extrabold uppercase">
              <Flame className="w-4 h-4" />
              <span>RED SMACKDOWN FINISHER</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Build your Momentum gauge by landing strikes, heavy grapples, reversals, and crowd taunts. When the meter flashes red, press <strong className="text-red-400 font-black">[{p('redSmack')}]</strong> next to your opponent to execute your devastating signature finisher!
            </p>
          </div>

          {/* 4. Block, Guard & Reversals */}
          <div className="bg-cyan-950/40 border border-cyan-800/80 p-4 rounded-lg flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-cyan-300 font-extrabold uppercase">
              <Shield className="w-4 h-4" />
              <span>Block, Guard & Reversals</span>
            </div>
            <ul className="flex flex-col gap-1.5 text-zinc-300">
              <li>
                <strong className="text-cyan-200">Guard Stance:</strong> Hold [{p('block')}] to raise high guard defense shield!
              </li>
              <li>
                <strong className="text-white">Deflect & Stun:</strong> Blocking any incoming strike completely negates damage and stuns the attacker for 1.35 seconds!
              </li>
              <li>
                <strong className="text-amber-300">Counter-Punish:</strong> When the enemy is deflected and staggered, immediately press [{p('strike')}] or [{p('grapple')}] for guaranteed heavy damage!
              </li>
              <li>
                <strong className="text-white">Reversal Window:</strong> Tap [{p('block')}] right at move impact to execute a dynamic reversal!
              </li>
            </ul>
          </div>

          {/* 5. Ring Environment & Weapons */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-lg flex flex-col gap-2">
            <span className="text-zinc-200 font-extrabold uppercase">
              Ring Ropes, Turnbuckles & Steel Chairs
            </span>
            <ul className="flex flex-col gap-1.5 text-zinc-300">
              <li>
                <strong className="text-white">Irish Whip:</strong> [{p('whipPin')}] throws opponent into the ropes!
              </li>
              <li>
                <strong className="text-white">Top Rope Climb:</strong> Approach corner post and press [{p('turnbuckle')}]. Press strike/grapple to dive!
              </li>
              <li>
                <strong className="text-white">Steel Chair:</strong> Approach ringside floor, press [{p('whipPin')}] to equip, then [{p('strike')}] to smash!
              </li>
            </ul>
          </div>

          {/* 6. Body Damage & Pinfall */}
          <div className="bg-zinc-900/70 border border-zinc-800 p-4 rounded-lg flex flex-col gap-2">
            <span className="text-zinc-200 font-extrabold uppercase">
              Body Damage & 3-Count Pinfalls
            </span>
            <ul className="flex flex-col gap-1.5 text-zinc-300">
              <li>
                <strong className="text-white">Paper Doll Damage:</strong> Head, Torso, Arms, Legs take localized damage. Severe Head damage causes bleeding!
              </li>
              <li>
                <strong className="text-white">Pinfall:</strong> Press [{p('whipPin')}] near downed opponent to pin. Mash buttons to kick out before the referee counts 3!
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-zinc-800 pt-3">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase rounded transition-colors"
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};
