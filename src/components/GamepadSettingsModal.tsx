/**
 * Modern Gamepad & Haptic Feedback Settings Modal
 * Tests Dual-Rumble actuators, detects controller brands, and configures tactile feedback.
 */

import React, { useState, useEffect } from 'react';
import { inputManager, ConnectedGamepadInfo } from '../game/inputManager';
import { haptics } from '../game/haptics';
import { audioEngine } from '../game/audioEngine';
import { GameSettings } from '../game/types';
import { X, Gamepad2, Vibrate, Volume2, ShieldCheck, Check } from 'lucide-react';

interface GamepadSettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
}

export const GamepadSettingsModal: React.FC<GamepadSettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [gamepads, setGamepads] = useState<ConnectedGamepadInfo[]>([]);
  const [testActive, setTestActive] = useState(false);

  useEffect(() => {
    const update = () => {
      inputManager.updateConnectedGamepads();
      setGamepads(inputManager.getConnectedGamepads());
    };
    update();
    const interval = setInterval(update, 800);
    return () => clearInterval(interval);
  }, []);

  const handleTestRumble = (index: number) => {
    setTestActive(true);
    haptics.strikeHeavy(index);
    audioEngine.playMatSlam(true);
    setTimeout(() => {
      haptics.redSmackFinisher(index);
      setTimeout(() => setTestActive(false), 500);
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-6 text-zinc-100 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Gamepad2 className="w-5 h-5 text-amber-400" />
            <h2 className="font-heading font-black text-lg uppercase tracking-wide">
              CONTROLLER & HAPTICS ENGINE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Connected Gamepads list */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            CONNECTED GAMEPAD DEVICES
          </span>

          {gamepads.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-4 text-center">
              <p className="text-sm font-semibold text-zinc-300">
                No physical gamepad detected right now.
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Plug in an Xbox, PlayStation DualSense/DualShock, or Nintendo Switch controller via USB or Bluetooth, or press any button on your controller.
              </p>
              <p className="text-xs text-amber-400/90 font-medium mt-2">
                Full Keyboard & Touch controls are active (WASD + J/K/L/I/U/O/Q/E).
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {gamepads.map((gp) => (
                <div
                  key={gp.index}
                  className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg p-3"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold uppercase text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      Pad {gp.index + 1}: {gp.type.toUpperCase()} CONTROLLER
                    </span>
                    <span className="text-[11px] text-zinc-400 truncate max-w-xs">
                      {gp.id}
                    </span>
                  </div>

                  <button
                    onClick={() => handleTestRumble(gp.index)}
                    disabled={testActive}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded text-xs font-bold transition-all active:scale-95 shadow-md"
                  >
                    <Vibrate className="w-3.5 h-3.5" />
                    <span>{testActive ? 'RUMBLING...' : 'TEST RUMBLE'}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Global Settings Toggles */}
        <div className="flex flex-col gap-3 border-t border-zinc-800 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white uppercase">
                Gamepad Dual-Rumble Haptics
              </span>
              <span className="text-[11px] text-zinc-400">
                Transmits force feedback on punches, slams, chair clangs, and Red Smackdown finishers.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.hapticsEnabled}
              onChange={(e) => {
                onUpdateSettings({ hapticsEnabled: e.target.checked });
                haptics.setEnabled(e.target.checked);
              }}
              className="w-5 h-5 rounded bg-zinc-900 border-zinc-700 text-red-600 focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white uppercase">
                Dynamic Sound FX Engine
              </span>
              <span className="text-[11px] text-zinc-400">
                Synthesized canvas thuds, referee 3-counts, steel chairs, and crowd roars.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(e) => {
                onUpdateSettings({ soundEnabled: e.target.checked });
                audioEngine.setSoundEnabled(e.target.checked);
              }}
              className="w-5 h-5 rounded bg-zinc-900 border-zinc-700 text-red-600 focus:ring-0"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white uppercase">
                Arena Rock Soundtrack
              </span>
              <span className="text-[11px] text-zinc-400">
                Heavy drop-D arena riff that dynamically builds during the match.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.musicEnabled}
              onChange={(e) => {
                onUpdateSettings({ musicEnabled: e.target.checked });
                audioEngine.setMusicEnabled(e.target.checked);
              }}
              className="w-5 h-5 rounded bg-zinc-900 border-zinc-700 text-red-600 focus:ring-0"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-zinc-800 pt-3">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase rounded transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
