/**
 * Retro SmackDown! Here Comes The Pain Character Select Screen
 * Features the legendary wrestling titans, custom CAW superstars, stat meters,
 * match type selections (Standard, Hardcore Chair, Dojo), local 2P versus toggle,
 * and direct gateways to "ROAD TO STARDOM (STORY MODE)" and "CREATE-A-WRESTLER".
 */

import React, { useState } from 'react';
import { ROSTER } from '../game/roster';
import { WrestlerProfile, GameSettings } from '../game/types';
import { audioEngine } from '../game/audioEngine';
import { haptics } from '../game/haptics';
import { Flame, Trophy, Swords, Zap, Activity, Gamepad2, Settings2, Sparkles, UserPlus, BookOpen } from 'lucide-react';

interface RosterSelectProps {
  rosterList?: WrestlerProfile[];
  onStartMatch: (p1: WrestlerProfile, p2: WrestlerProfile, settings: GameSettings) => void;
  onOpenGamepadSettings: () => void;
  onOpenStoryMode: () => void;
  onOpenCharacterCreator: () => void;
}

export const RosterSelect: React.FC<RosterSelectProps> = ({
  rosterList = ROSTER,
  onStartMatch,
  onOpenGamepadSettings,
  onOpenStoryMode,
  onOpenCharacterCreator,
}) => {
  const [selectedP1Index, setSelectedP1Index] = useState(0);
  const [selectedP2Index, setSelectedP2Index] = useState(Math.min(1, rosterList.length - 1));
  const [isP2Selecting, setIsP2Selecting] = useState(false);
  const [matchMode, setMatchMode] = useState<GameSettings['matchMode']>('standard');
  const [difficulty, setDifficulty] = useState<GameSettings['difficulty']>('normal');
  const [twoPlayerMode, setTwoPlayerMode] = useState(false);
  const [bloodEnabled, setBloodEnabled] = useState(true);

  const p1Profile = rosterList[selectedP1Index] || rosterList[0];
  const p2Profile = rosterList[selectedP2Index] || rosterList[1] || rosterList[0];

  const handleSelectWrestler = (index: number) => {
    audioEngine.playStrike(false);
    haptics.strikeLight();
    if (isP2Selecting) {
      setSelectedP2Index(index);
    } else {
      setSelectedP1Index(index);
    }
  };

  const handleLaunch = () => {
    audioEngine.init();
    audioEngine.playRingBell();
    audioEngine.playCrowdRoar(0.8);
    haptics.redSmackFinisher();

    onStartMatch(p1Profile, p2Profile, {
      hapticsEnabled: true,
      soundEnabled: true,
      musicEnabled: true,
      difficulty,
      matchMode,
      twoPlayerMode,
      bloodEnabled,
    });
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 bg-zinc-950 text-zinc-100 overflow-y-auto">
      {/* Dynamic Background Arena Lighting */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-zinc-950 to-red-950/20 pointer-events-none" />
      <div className="retro-scanlines absolute inset-0 opacity-40 pointer-events-none" />

      {/* HEADER BAR */}
      <div className="relative z-10 flex flex-wrap items-center justify-between border-b border-zinc-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded flex items-center justify-center shadow-[0_0_15px_#dc2626]">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-black text-2xl tracking-wider uppercase text-white italic">
              PAIN: <span className="text-red-500">HERE COMES THE SMACK</span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              Retro 3D Arcade Combat Engine · Gamepad Vibration & Dynamic Audio
            </p>
          </div>
        </div>

        {/* Major Mode Switchers */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenStoryMode}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black rounded-lg text-xs font-heading font-black uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all active:scale-95"
          >
            <Trophy className="w-4 h-4" />
            <span>ROAD TO STARDOM (STORY)</span>
          </button>

          <button
            onClick={onOpenCharacterCreator}
            className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-200 rounded-lg text-xs font-heading font-black uppercase tracking-wider transition-all active:scale-95 shadow-md"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>CREATE-A-WRESTLER (CAW)</span>
          </button>

          <button
            onClick={onOpenGamepadSettings}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-300 transition-colors"
          >
            <Gamepad2 className="w-4 h-4 text-amber-400" />
            <span>Controller / Rumble</span>
          </button>
        </div>
      </div>

      {/* MAIN SELECTION GRID & FIGHTER SHOWCASE */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 flex-1 items-center">
        {/* LEFT: PLAYER 1 CARD */}
        <div className="lg:col-span-3 bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-black text-xs text-amber-400 uppercase tracking-widest">
              PLAYER 1 (YOU)
            </span>
            <span className="text-[11px] font-mono-nums font-bold text-zinc-400">
              {p1Profile.weightClass}
            </span>
          </div>

          {/* Visual Wrestler Portrait / Emblem */}
          <div className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-zinc-700/80 bg-zinc-950 relative shadow-inner">
            {p1Profile.portraitUrl || p1Profile.cosmetics?.customPortraitUrl ? (
              <img
                src={p1Profile.portraitUrl || p1Profile.cosmetics?.customPortraitUrl}
                alt={p1Profile.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                style={{ background: `radial-gradient(circle, ${p1Profile.themeColor}33 0%, #090a0f 80%)` }}
              >
                <Flame className="w-12 h-12 mb-2" style={{ color: p1Profile.themeColor }} />
                <span className="font-heading font-black text-xs uppercase tracking-wider text-zinc-300">
                  {p1Profile.nickname}
                </span>
              </div>
            )}
            <div className="absolute bottom-1.5 left-1.5 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono-nums font-bold text-amber-400 border border-zinc-800">
              OVR: {Math.round((p1Profile.stats.power + p1Profile.stats.speed + p1Profile.stats.durability + p1Profile.stats.charisma) / 4)}
            </div>
          </div>

          <div>
            <h2 className="font-heading font-black text-xl text-white uppercase italic">
              {p1Profile.name}
            </h2>
            <p className="text-xs font-semibold text-zinc-400 italic">
              "{p1Profile.nickname}"
            </p>
          </div>

          {/* STATS BARS */}
          <div className="flex flex-col gap-2 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
            <StatRow label="SPEED" value={p1Profile.stats.speed} color="#3b82f6" />
            <StatRow label="POWER" value={p1Profile.stats.power} color="#ef4444" />
            <StatRow label="SUBMISSION" value={p1Profile.stats.submission} color="#10b981" />
            <StatRow label="CHARISMA" value={p1Profile.stats.charisma} color="#eab308" />
            <StatRow label="DURABILITY" value={p1Profile.stats.durability} color="#a855f7" />
          </div>

          {/* FINISHER & SIGNATURE INFO */}
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="bg-red-950/40 border border-red-900/60 p-2 rounded">
              <span className="text-[10px] font-black uppercase text-red-400 block">
                RED SMACKDOWN FINISHER
              </span>
              <span className="font-bold text-red-200">
                {p1Profile.finisherMove}
              </span>
            </div>
            <div className="bg-zinc-800/40 p-2 rounded border border-zinc-700/40">
              <span className="text-[10px] font-black uppercase text-zinc-400 block">
                SIGNATURE MOVE
              </span>
              <span className="font-semibold text-zinc-300">
                {p1Profile.signatureMove}
              </span>
            </div>
          </div>
        </div>

        {/* CENTER: ROSTER SELECTOR TILES */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsP2Selecting(false)}
                className={`px-3 py-1 text-xs font-black uppercase rounded transition-colors ${
                  !isP2Selecting
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Pick P1
              </button>
              <button
                onClick={() => setIsP2Selecting(true)}
                className={`px-3 py-1 text-xs font-black uppercase rounded transition-colors ${
                  isP2Selecting
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                Pick P2 / CPU
              </button>
            </div>
            <span className="text-xs text-zinc-400">
              Selecting: <strong className="text-white">{isP2Selecting ? 'Player 2' : 'Player 1'}</strong>
            </span>
          </div>

          {/* Wrestler Grid (Supports legends + created CAWs) */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[46vh] overflow-y-auto pr-1">
            {rosterList.map((w, idx) => {
              const isP1 = selectedP1Index === idx;
              const isP2 = selectedP2Index === idx;

              return (
                <button
                  key={w.id}
                  onClick={() => handleSelectWrestler(idx)}
                  className={`relative flex flex-col p-3 rounded-lg border-2 text-left transition-all group overflow-hidden ${
                    isP1
                      ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                      : isP2
                      ? 'border-red-600 bg-red-950/30 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                      : 'border-zinc-800 bg-zinc-900/80 hover:border-zinc-600'
                  }`}
                >
                  {/* Selection Badges */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {isP1 && (
                        <span className="px-1.5 py-0.5 bg-amber-500 text-black font-black text-[9px] rounded">
                          P1
                        </span>
                      )}
                      {isP2 && (
                        <span className="px-1.5 py-0.5 bg-red-600 text-white font-black text-[9px] rounded">
                          P2
                        </span>
                      )}
                    </div>
                    {w.isCustom && (
                      <span className="px-1.5 py-0.5 bg-emerald-950 border border-emerald-600/70 text-emerald-300 font-extrabold text-[8px] uppercase rounded">
                        CAW
                      </span>
                    )}
                  </div>

                  <span className="font-heading font-black text-sm uppercase text-white group-hover:text-amber-400 transition-colors truncate">
                    {w.name}
                  </span>
                  <span className="text-[11px] text-zinc-400 italic mb-2 truncate">
                    {w.nickname}
                  </span>

                  <div className="mt-auto flex items-center justify-between text-[10px] text-zinc-400 border-t border-zinc-800/80 pt-1.5">
                    <span>PWR: {w.stats.power}</span>
                    <span>SPD: {w.stats.speed}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* MATCH CONFIG BAR */}
          <div className="bg-zinc-900/80 p-4 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase text-zinc-400">
                MATCH:
              </span>
              <select
                value={matchMode}
                onChange={(e) => setMatchMode(e.target.value as GameSettings['matchMode'])}
                className="bg-zinc-950 border border-zinc-700 text-xs font-bold text-white px-2.5 py-1.5 rounded focus:outline-none focus:border-red-500"
              >
                <option value="standard">Standard 1-on-1 Exhibition</option>
                <option value="hardcore_chair">Hardcore Steel Chair Match</option>
                <option value="dojo_practice">Dojo Practice Mode</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase text-zinc-400">
                CPU AI:
              </span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as GameSettings['difficulty'])}
                className="bg-zinc-950 border border-zinc-700 text-xs font-bold text-white px-2.5 py-1.5 rounded focus:outline-none focus:border-red-500"
              >
                <option value="normal">Normal</option>
                <option value="hard">Hard (Adaptive Counters)</option>
                <option value="legend">Legend (Here Comes The Pain)</option>
              </select>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoPlayerMode}
                  onChange={(e) => setTwoPlayerMode(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-red-600 focus:ring-0"
                />
                <span>2-Player Versus</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bloodEnabled}
                  onChange={(e) => setBloodEnabled(e.target.checked)}
                  className="rounded bg-zinc-900 border-zinc-700 text-red-600 focus:ring-0"
                />
                <span>First Blood FX</span>
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT: PLAYER 2 CARD */}
        <div className="lg:col-span-3 bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <span className="font-black text-xs text-red-500 uppercase tracking-widest">
              PLAYER 2 ({twoPlayerMode ? 'COUCH 2P' : 'CPU'})
            </span>
            <span className="text-[11px] font-mono-nums font-bold text-zinc-400">
              {p2Profile.weightClass}
            </span>
          </div>

          {/* Visual Wrestler Portrait / Emblem */}
          <div className="w-full aspect-[4/3] rounded-lg overflow-hidden border border-zinc-700/80 bg-zinc-950 relative shadow-inner">
            {p2Profile.portraitUrl || p2Profile.cosmetics?.customPortraitUrl ? (
              <img
                src={p2Profile.portraitUrl || p2Profile.cosmetics?.customPortraitUrl}
                alt={p2Profile.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                style={{ background: `radial-gradient(circle, ${p2Profile.themeColor}33 0%, #090a0f 80%)` }}
              >
                <Flame className="w-12 h-12 mb-2" style={{ color: p2Profile.themeColor }} />
                <span className="font-heading font-black text-xs uppercase tracking-wider text-zinc-300">
                  {p2Profile.nickname}
                </span>
              </div>
            )}
            <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono-nums font-bold text-red-400 border border-zinc-800">
              OVR: {Math.round((p2Profile.stats.power + p2Profile.stats.speed + p2Profile.stats.durability + p2Profile.stats.charisma) / 4)}
            </div>
          </div>

          <div>
            <h2 className="font-heading font-black text-xl text-white uppercase italic">
              {p2Profile.name}
            </h2>
            <p className="text-xs font-semibold text-zinc-400 italic">
              "{p2Profile.nickname}"
            </p>
          </div>

          {/* STATS BARS */}
          <div className="flex flex-col gap-2 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
            <StatRow label="SPEED" value={p2Profile.stats.speed} color="#3b82f6" />
            <StatRow label="POWER" value={p2Profile.stats.power} color="#ef4444" />
            <StatRow label="SUBMISSION" value={p2Profile.stats.submission} color="#10b981" />
            <StatRow label="CHARISMA" value={p2Profile.stats.charisma} color="#eab308" />
            <StatRow label="DURABILITY" value={p2Profile.stats.durability} color="#a855f7" />
          </div>

          {/* FINISHER & SIGNATURE INFO */}
          <div className="flex flex-col gap-1.5 text-xs">
            <div className="bg-red-950/40 border border-red-900/60 p-2 rounded">
              <span className="text-[10px] font-black uppercase text-red-400 block">
                RED SMACKDOWN FINISHER
              </span>
              <span className="font-bold text-red-200">
                {p2Profile.finisherMove}
              </span>
            </div>
            <div className="bg-zinc-800/40 p-2 rounded border border-zinc-700/40">
              <span className="text-[10px] font-black uppercase text-zinc-400 block">
                SIGNATURE MOVE
              </span>
              <span className="font-semibold text-zinc-300">
                {p2Profile.signatureMove}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER START ACTION */}
      <div className="relative z-10 flex items-center justify-between border-t border-zinc-800 pt-4">
        <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono-nums">
          <span>HAPTICS: <strong className="text-emerald-400">ENABLED</strong></span>
          <span>·</span>
          <span>ADAPTIVE AI: <strong className="text-emerald-400">ACTIVE</strong></span>
        </div>

        <button
          onClick={handleLaunch}
          className="px-8 py-3.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-heading font-black text-lg uppercase tracking-wider rounded-lg shadow-[0_0_30px_rgba(239,68,68,0.7)] transition-all transform active:scale-95 flex items-center gap-2"
        >
          <Flame className="w-5 h-5" />
          <span>START THE MATCH</span>
        </button>
      </div>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center justify-between gap-3 text-[11px]">
    <span className="font-bold text-zinc-400 w-24">{label}</span>
    <div className="flex-1 h-2 bg-zinc-800 rounded overflow-hidden">
      <div
        className="h-full rounded transition-all duration-300"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
    <span className="font-mono-nums font-bold text-zinc-300 w-6 text-right">
      {value}
    </span>
  </div>
);
