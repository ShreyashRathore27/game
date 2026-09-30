/**
 * Broadcast Game HUD & HUD Overlay
 * Features the iconic RED SMACKDOWN meter, momentum bar, health gauges,
 * Body Part Doll damage systems, Pinfall 3-Count kickout gauge,
 * Submission struggle meters, and real-time controller prompts.
 */

import React from 'react';
import { WrestlerFighter, WrestlerProfile, GameEventNotification } from '../game/types';
import { BodyPartDoll } from './BodyPartDoll';
import { inputManager, ControllerType } from '../game/inputManager';
import { Flame, ShieldAlert, Sparkles, Volume2, VolumeX, Pause, HelpCircle, Gamepad2 } from 'lucide-react';

interface GameHUDProps {
  p1: WrestlerFighter;
  p2: WrestlerFighter;
  p1Profile: WrestlerProfile;
  p2Profile: WrestlerProfile;
  matchTime: number;
  matchMode: string;
  isPinActive: boolean;
  pinCount: number;
  victimIndex: number;
  kickoutMeter: number;
  isSubmissionActive: boolean;
  submissionMeter: number;
  submissionHoldName: string;
  notifications: GameEventNotification[];
  controllerType: ControllerType;
  activeCrowdChant?: string;
  onPause: () => void;
  onOpenMoveList: () => void;
  onOpenGamepadSettings: () => void;
  onQuickAction: (actionKey: string) => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  p1,
  p2,
  p1Profile,
  p2Profile,
  matchTime,
  matchMode,
  isPinActive,
  pinCount,
  victimIndex,
  kickoutMeter,
  isSubmissionActive,
  submissionMeter,
  submissionHoldName,
  notifications,
  controllerType,
  activeCrowdChant,
  onPause,
  onOpenMoveList,
  onOpenGamepadSettings,
  onQuickAction,
}) => {
  // Format match time
  const minutes = Math.floor(matchTime / 60);
  const seconds = Math.floor(matchTime % 60);
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const latestNotif = notifications[0];

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 select-none">
      {/* 1. TOP BROADCAST BAR */}
      <div className="w-full flex items-start justify-between">
        {/* PLAYER 1 HUD (YOU) */}
        <div className="pointer-events-auto flex items-start gap-3 bg-zinc-950/85 backdrop-blur-md p-2.5 rounded-lg border-2 border-cyan-500/80 shadow-[0_0_20px_rgba(6,182,212,0.3)] max-w-sm">
          {/* Wrestler Photo Thumbnail */}
          {p1Profile.portraitUrl ? (
            <img
              src={p1Profile.portraitUrl}
              alt={p1.name}
              className="w-12 h-14 object-cover object-top rounded border border-cyan-400 shadow-md"
            />
          ) : (
            <BodyPartDoll
              damage={p1.bodyDamage}
              isBleeding={p1.isBleeding}
              playerName={p1.name}
              isPlayer1={true}
            />
          )}

          <div className="flex flex-col gap-1 w-52">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-400 text-[10px] font-black text-cyan-300 tracking-wider shadow-[0_0_8px_#06b6d4]">
                  YOU (P1)
                </span>
                <span className="font-heading font-black text-sm tracking-wide text-zinc-100 uppercase truncate">
                  {p1.name}
                </span>
                {(p1.isBlocking || p1.state === 'block') && (
                  <span className="px-1.5 py-0.5 rounded bg-cyan-400 text-zinc-950 font-black text-[9px] tracking-wide animate-pulse shadow-[0_0_10px_#38bdf8]">
                    🛡️ GUARD
                  </span>
                )}
              </div>
              <span className="text-[10px] font-mono-nums font-bold text-cyan-400">
                {Math.round(p1.health)} HP
              </span>
            </div>

            {/* Health Bar */}
            <div className="w-full h-3 bg-zinc-900 rounded overflow-hidden border border-cyan-600/50 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-500 rounded-sm transition-all duration-200"
                style={{ width: `${Math.max(0, Math.min(100, p1.health))}%` }}
              />
            </div>

            {/* RED SMACKDOWN / MOMENTUM METER */}
            <div className="flex flex-col gap-0.5 mt-0.5">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <span className="text-zinc-400 flex items-center gap-1">
                  MOMENTUM
                </span>
                <div className="flex items-center gap-1">
                  {/* Stored Red Smack Tokens */}
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`inline-block w-2.5 h-2.5 rounded-full border transition-all ${
                        idx < p1.redSmackTokens
                          ? 'bg-red-600 border-red-400 shadow-[0_0_8px_#ef4444] animate-pulse'
                          : 'bg-zinc-800 border-zinc-700'
                      }`}
                      title="Stored Red Smackdown Finisher"
                    />
                  ))}
                </div>
              </div>

              {/* Momentum Bar */}
              <div className={`w-full h-3.5 rounded overflow-hidden p-0.5 bg-zinc-900 border transition-all ${
                p1.redSmackTokens > 0
                  ? 'border-red-500 animate-smack-glow'
                  : 'border-zinc-700/60'
              }`}>
                <div
                  className={`h-full rounded-sm transition-all duration-150 ${
                    p1.redSmackTokens > 0
                      ? 'bg-gradient-to-r from-red-600 via-red-500 to-rose-400'
                      : 'bg-gradient-to-r from-amber-600 to-yellow-400'
                  }`}
                  style={{ width: `${p1.momentum}%` }}
                />
              </div>

              {p1.redSmackTokens > 0 && (
                <div className="flex items-center justify-between text-[10px] font-black text-red-500 tracking-wider animate-pulse">
                  <span>★ RED SMACKDOWN READY ★</span>
                  <span className="text-[9px] bg-red-950/80 px-1 py-0.2 rounded text-red-300">
                    PRESS [{inputManager.getButtonPrompt('redSmack', controllerType).key}]
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CENTER MATCH CLOCK & CHANT / TICKER BAR */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="bg-zinc-950/90 backdrop-blur-md px-4 py-1 rounded-b-lg border-x border-b border-zinc-800 text-center shadow-lg">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">
              {matchMode.replace('_', ' ')}
            </span>
            <span className="font-mono-nums font-black text-lg text-amber-400 tracking-wider">
              {formattedTime}
            </span>
          </div>

          {/* DYNAMIC CROWD AUDIO CHANT BANNER */}
          {activeCrowdChant && (
            <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 via-red-600 to-amber-500 text-white font-black text-xs uppercase tracking-widest border-2 border-white shadow-[0_0_25px_rgba(239,68,68,0.9)] animate-bounce flex items-center gap-2">
              <span>{activeCrowdChant}</span>
            </div>
          )}

          {/* BLOCK / GUARD STATUS ALERTS */}
          {(p1.isBlocking || p1.state === 'block') && (
            <div className="px-3 py-1 rounded-full bg-cyan-600 text-white font-black text-xs uppercase tracking-widest border border-cyan-300 shadow-[0_0_20px_#06b6d4] flex items-center gap-1.5 animate-pulse">
              <span>🛡️ GUARD ACTIVE (DEFLECT & COUNTER READY!)</span>
            </div>
          )}
          {p1.state === 'block_parry' && (
            <div className="px-3 py-1 rounded-full bg-emerald-500 text-zinc-950 font-black text-xs uppercase tracking-widest border border-white shadow-[0_0_25px_#10b981] flex items-center gap-1.5 animate-bounce">
              <span>⚡ BLOCKED! OPPONENT STUNNED! ATTACK NOW [J / K]!</span>
            </div>
          )}

          {/* Action Notification Ticker */}
          {latestNotif && !activeCrowdChant && (
            <div className={`px-3 py-1 rounded text-xs font-black tracking-wider uppercase backdrop-blur-md transition-all shadow-lg animate-bounce ${
              latestNotif.type === 'finisher' || latestNotif.type === 'critical'
                ? 'bg-red-600/90 text-white border border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.8)]'
                : latestNotif.type === 'counter'
                ? 'bg-blue-600/90 text-white border border-blue-400'
                : 'bg-zinc-900/90 text-zinc-200 border border-zinc-700'
            }`}>
              {latestNotif.title}
            </div>
          )}
        </div>

        {/* PLAYER 2 HUD (OPPONENT / CPU) */}
        <div className="pointer-events-auto flex items-start gap-3 bg-zinc-950/85 backdrop-blur-md p-2.5 rounded-lg border-2 border-red-600/80 shadow-[0_0_20px_rgba(239,68,68,0.3)] max-w-sm">
          <div className="flex flex-col gap-1 w-52 text-right">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-nums font-bold text-red-400">
                {Math.round(p2.health)} HP
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-black text-sm tracking-wide text-zinc-100 uppercase truncate">
                  {p2.name}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-red-950 border border-red-500 text-[10px] font-black text-red-300 tracking-wider">
                  OPPONENT
                </span>
              </div>
            </div>

            {/* Health Bar */}
            <div className="w-full h-3 bg-zinc-900 rounded overflow-hidden border border-red-600/50 p-0.5">
              <div
                className="h-full bg-gradient-to-l from-red-600 via-amber-500 to-emerald-500 rounded-sm transition-all duration-200 ml-auto"
                style={{ width: `${Math.max(0, Math.min(100, p2.health))}%` }}
              />
            </div>

            {/* Momentum Bar */}
            <div className="flex flex-col gap-0.5 mt-0.5">
              <div className="flex items-center justify-between text-[10px] font-bold">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <span
                      key={idx}
                      className={`inline-block w-2.5 h-2.5 rounded-full border transition-all ${
                        idx < p2.redSmackTokens
                          ? 'bg-red-600 border-red-400 shadow-[0_0_8px_#ef4444] animate-pulse'
                          : 'bg-zinc-800 border-zinc-700'
                      }`}
                      title="Stored Red Smackdown Finisher"
                    />
                  ))}
                </div>
                <span className="text-zinc-400">MOMENTUM</span>
              </div>

              <div className={`w-full h-3.5 rounded overflow-hidden p-0.5 bg-zinc-900 border transition-all ${
                p2.redSmackTokens > 0
                  ? 'border-red-500 animate-smack-glow'
                  : 'border-zinc-700/60'
              }`}>
                <div
                  className={`h-full rounded-sm transition-all duration-150 ml-auto ${
                    p2.redSmackTokens > 0
                      ? 'bg-gradient-to-l from-red-600 via-red-500 to-rose-400'
                      : 'bg-gradient-to-l from-amber-600 to-yellow-400'
                  }`}
                  style={{ width: `${p2.momentum}%` }}
                />
              </div>

              {p2.redSmackTokens > 0 && (
                <div className="text-[10px] font-black text-red-500 tracking-wider animate-pulse">
                  ★ RED SMACKDOWN READY ★
                </div>
              )}
            </div>
          </div>

          {/* Opponent Photo Thumbnail */}
          {p2Profile.portraitUrl ? (
            <img
              src={p2Profile.portraitUrl}
              alt={p2.name}
              className="w-12 h-14 object-cover object-top rounded border border-red-500 shadow-md"
            />
          ) : (
            <BodyPartDoll
              damage={p2.bodyDamage}
              isBleeding={p2.isBleeding}
              playerName={p2.name}
              isPlayer1={false}
            />
          )}
        </div>
      </div>

      {/* 2. CENTER ACTIVE EVENT OVERLAYS (PINFALL / SUBMISSION / SLAMS) */}
      {(p1.state === 'grapple_performing' || p2.state === 'grapple_performing' || p1.state === 'special_finisher_executing' || p2.state === 'special_finisher_executing') && (
        <div className="self-center flex flex-col items-center pointer-events-none my-auto z-20">
          <div className="bg-gradient-to-r from-red-950/90 via-zinc-950/95 to-red-950/90 border-2 border-amber-400 px-6 py-2.5 rounded-xl shadow-[0_0_35px_rgba(239,68,68,0.7)] flex flex-col items-center gap-0.5 backdrop-blur-md">
            <span className="text-[10px] font-black tracking-widest text-amber-300 uppercase">
              {p1.state.includes('special') || p2.state.includes('special') ? '★ RED SMACKDOWN IMPACT ★' : '⚡ DEVASTATING SLAM ⚡'}
            </span>
            <span className="font-heading font-black text-2xl md:text-3xl text-white tracking-wider uppercase text-shadow-red animate-pulse">
              💥 {p1.activeMoveName || p2.activeMoveName || 'VERTICAL SLAM'}!
            </span>
          </div>
        </div>
      )}

      {p1.state === 'block_parry' && (
        <div className="self-center flex flex-col items-center pointer-events-none my-auto z-20">
          <div className="bg-cyan-950/95 border-2 border-cyan-300 px-6 py-3 rounded-xl shadow-[0_0_30px_#06b6d4] flex flex-col items-center gap-1 backdrop-blur-md animate-pulse">
            <span className="font-heading font-black text-xl md:text-2xl text-cyan-200 uppercase tracking-wider">
              🛡️ ATTACK DEFLECTED!
            </span>
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              OPPONENT IS STUNNED! ATTACK NOW [J / K]!
            </span>
          </div>
        </div>
      )}

      {isPinActive && (
        <div className="pointer-events-auto self-center flex flex-col items-center bg-zinc-950/95 border-2 border-red-600 p-6 rounded-xl shadow-[0_0_40px_rgba(239,68,68,0.7)] backdrop-blur-lg max-w-md w-full animate-impact-shake">
          <span className="text-xs font-bold uppercase tracking-widest text-red-400 mb-1">
            REFEREE PIN COUNT
          </span>
          <div className="flex items-center gap-6 my-2">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl border-2 transition-all ${
                  pinCount >= num
                    ? 'bg-red-600 border-white text-white scale-110 shadow-[0_0_20px_#ef4444]'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-600'
                }`}
              >
                {num}
              </div>
            ))}
          </div>

          {/* Kickout Struggle Gauge */}
          <div className="w-full mt-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-extrabold text-zinc-300">
              <span>KICKOUT STRUGGLE</span>
              <span className="text-red-400 animate-pulse">
                MASH BUTTONS TO ESCAPE!
              </span>
            </div>
            <div className="w-full h-4 bg-zinc-900 rounded border border-zinc-700 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-emerald-400 rounded-sm transition-all"
                style={{ width: `${Math.min(100, kickoutMeter)}%` }}
              />
            </div>
            <button
              onClick={() => onQuickAction('kickout')}
              className="mt-2 py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase rounded tracking-wider shadow-lg active:scale-95 transition-transform"
            >
              TAP / CLICK TO KICK OUT!
            </button>
          </div>
        </div>
      )}

      {isSubmissionActive && (
        <div className="pointer-events-auto self-center flex flex-col items-center bg-zinc-950/95 border-2 border-amber-500 p-6 rounded-xl shadow-[0_0_40px_rgba(245,158,11,0.6)] backdrop-blur-lg max-w-md w-full animate-impact-shake">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
            SUBMISSION HOLD
          </span>
          <span className="text-base font-black text-white tracking-wide mb-3">
            {submissionHoldName}
          </span>

          <div className="w-full flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-extrabold text-zinc-300">
              <span className="text-emerald-400">ESCAPE ROPE</span>
              <span className="text-red-500 animate-pulse">TAP OUT!</span>
            </div>
            <div className="w-full h-4 bg-zinc-900 rounded border border-zinc-700 overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-600 rounded-sm transition-all"
                style={{ width: `${Math.min(100, submissionMeter)}%` }}
              />
            </div>
            <button
              onClick={() => onQuickAction('submission_escape')}
              className="mt-2 py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white font-black text-sm uppercase rounded tracking-wider shadow-lg active:scale-95 transition-transform"
            >
              STRUGGLE TO REACH ROPES!
            </button>
          </div>
        </div>
      )}

      {/* 3. BOTTOM CONTROL HELPER TRAY & ACTION BUTTONS */}
      <div className="w-full flex flex-col md:flex-row items-center md:items-end justify-between gap-3">
        {/* On-screen quick controls & Prompts */}
        <div className="pointer-events-auto flex items-center gap-2 bg-zinc-950/90 backdrop-blur-md px-3.5 py-2 rounded-lg border border-zinc-800 text-xs shadow-xl">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Gamepad2 className="w-4 h-4 text-cyan-400" />
            <span className="font-bold uppercase tracking-wider text-[11px] text-cyan-400">
              {controllerType}:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono-nums text-[11px]">
            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">
              [{inputManager.getButtonPrompt('strike', controllerType).key}] Strike
            </span>
            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">
              [{inputManager.getButtonPrompt('grapple', controllerType).key}] Grapple
            </span>
            <span className="bg-cyan-950 border border-cyan-500/80 px-2 py-0.5 rounded text-cyan-200 font-bold shadow-[0_0_8px_rgba(6,182,212,0.4)]">
              [{inputManager.getButtonPrompt('block', controllerType).key}] 🛡️ BLOCK & PARRY
            </span>
            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">
              [{inputManager.getButtonPrompt('whipPin', controllerType).key}] Whip/Pin/Chair
            </span>
            <span className="bg-red-950 border border-red-600/80 px-1.5 py-0.5 rounded text-red-200 font-bold">
              [{inputManager.getButtonPrompt('redSmack', controllerType).key}] Red Smack
            </span>
            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">
              [{inputManager.getButtonPrompt('turnbuckle', controllerType).key}] Climb/Lift
            </span>
            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200">
              [{inputManager.getButtonPrompt('taunt', controllerType).key}] Taunt
            </span>
          </div>
        </div>

        {/* TACTILE ON-SCREEN ACTION PADS (Click / Touch) */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => onQuickAction('strike')}
            className="flex flex-col items-center justify-center px-3 py-2 bg-zinc-900 hover:bg-zinc-800 active:bg-cyan-700 text-white rounded-lg border border-zinc-700 active:scale-95 transition-all shadow-md"
            title="Punch / Kick Combo"
          >
            <span className="text-xs font-black">🥊 STRIKE</span>
            <span className="text-[9px] text-zinc-400 font-mono-nums">[J / Z]</span>
          </button>

          <button
            onClick={() => onQuickAction('grapple')}
            className="flex flex-col items-center justify-center px-3 py-2 bg-zinc-900 hover:bg-zinc-800 active:bg-cyan-700 text-white rounded-lg border border-zinc-700 active:scale-95 transition-all shadow-md"
            title="Grapple / Slam / Suplex"
          >
            <span className="text-xs font-black">🤼 GRAPPLE</span>
            <span className="text-[9px] text-zinc-400 font-mono-nums">[K / X]</span>
          </button>

          <button
            onClick={() => onQuickAction('block')}
            className={`flex flex-col items-center justify-center px-3 py-2 text-cyan-200 rounded-lg border-2 active:scale-95 transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)] ${
              p1.isBlocking || p1.state === 'block'
                ? 'bg-cyan-700 border-cyan-300 ring-2 ring-cyan-400 shadow-[0_0_20px_#06b6d4]'
                : 'bg-cyan-950 hover:bg-cyan-900 border-cyan-400'
            }`}
            title="Block incoming strikes and deflect into opponent stun"
          >
            <span className="text-xs font-black">🛡️ BLOCK</span>
            <span className="text-[9px] text-cyan-300 font-mono-nums">[B / SPACE]</span>
          </button>

          <button
            onClick={() => onQuickAction('whipPin')}
            className="flex flex-col items-center justify-center px-3 py-2 bg-zinc-900 hover:bg-zinc-800 active:bg-amber-700 text-white rounded-lg border border-zinc-700 active:scale-95 transition-all shadow-md"
            title="Pin Downed Opponent or Irish Whip"
          >
            <span className="text-xs font-black">⭕ PIN/WHIP</span>
            <span className="text-[9px] text-zinc-400 font-mono-nums">[L / C]</span>
          </button>

          {p1.redSmackTokens > 0 && (
            <button
              onClick={() => onQuickAction('redSmack')}
              className="flex flex-col items-center justify-center px-3 py-2 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-lg border-2 border-amber-300 active:scale-95 transition-all shadow-[0_0_20px_#ef4444] animate-pulse"
              title="Execute Red Smackdown Finisher!"
            >
              <span className="text-xs font-black">🔥 FINISHER</span>
              <span className="text-[9px] text-red-200 font-mono-nums">[I / V]</span>
            </button>
          )}

          <button
            onClick={() => onQuickAction('taunt')}
            className="flex flex-col items-center justify-center px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-300 rounded-lg border border-zinc-700 active:scale-95 transition-all shadow-md"
            title="Build Momentum"
          >
            <span className="text-xs font-black">⚡ TAUNT</span>
            <span className="text-[9px] text-zinc-400 font-mono-nums">[O / T]</span>
          </button>

          {/* Settings / Move List */}
          <button
            onClick={onOpenMoveList}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-blue-400 rounded-lg border border-zinc-800 transition-colors"
            title="Move List Manual"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={onPause}
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg border border-zinc-800 transition-colors"
            title="Pause Match"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
