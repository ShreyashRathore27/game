/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { RosterSelect } from './components/RosterSelect';
import { GameHUD } from './components/GameHUD';
import { MoveListModal } from './components/MoveListModal';
import { GamepadSettingsModal } from './components/GamepadSettingsModal';
import { ChampionshipWinModal } from './components/ChampionshipWinModal';
import { StoryModeView } from './components/StoryModeView';
import { CharacterCreator } from './components/CharacterCreator';
import { CombatEngine } from './game/combatEngine';
import { WrestlingArenaScene } from './game/threeScene';
import { inputManager, ControllerType } from './game/inputManager';
import { audioEngine } from './game/audioEngine';
import { haptics } from './game/haptics';
import { GameSettings, GameEventNotification, WrestlerProfile, StoryCareerState } from './game/types';
import { ROSTER } from './game/roster';
import { INITIAL_CAREER_STATE, STORY_SCENES } from './game/storyMode';
import { Play, RotateCcw, Users, Gamepad2, HelpCircle, Trophy } from 'lucide-react';

export default function App() {
  const [gameState, setGameState] = useState<
    'roster_select' | 'story_mode' | 'character_creator' | 'match' | 'paused'
  >('roster_select');

  // Custom Superstars CAW List
  const [customRoster, setCustomRoster] = useState<WrestlerProfile[]>([
    ...ROSTER,
    {
      id: 'caw_rookie_prodigy',
      name: 'The Maverick',
      nickname: 'Apex Prodigy',
      weightClass: 'Heavyweight',
      themeColor: '#dc2626',
      accentColor: '#f59e0b',
      avatarColor: '#18181b',
      stats: {
        speed: 90,
        power: 88,
        submission: 84,
        charisma: 95,
        durability: 90,
      },
      signatureMove: 'Spinebuster & Lariat',
      finisherMove: 'The Apex Cataclysm',
      tauntPhrase: 'NOBODY CAN STOP THE PAIN!',
      description: 'The hot-blooded rookie climbing the ranks of the PAIN federation. Athletic, fearsome, and determined to claim gold.',
      trunkColor: 0xdc2626,
      bootColor: 0x18181b,
      skinTone: 0xd49b72,
      hairColor: 0x18181b,
      hairStyle: 'undercut',
      bodyType: 'muscular',
      isCustom: true,
      cosmetics: {
        tattooStyle: 'tribal_sleeve',
        facialHair: 'stubble',
        gearType: 'classic_trunks',
        accentTrunkColor: 0xffffff,
        wristTapeColor: 0xffffff,
        kneepadColor: 0x18181b,
        entranceMusic: 'arena_heavy_rock',
        entrancePyro: 'flames',
        customPortraitUrl: '/src/assets/images/rookie_prodigy_portrait_1790750796395.jpg',
      },
    },
  ]);

  // Story Mode Career State
  const [careerState, setCareerState] = useState<StoryCareerState>(INITIAL_CAREER_STATE);
  const [activeStoryMatch, setActiveStoryMatch] = useState(false);

  // Active Fighters in Ring
  const [p1Profile, setP1Profile] = useState<WrestlerProfile>(customRoster[6] || ROSTER[0]);
  const [p2Profile, setP2Profile] = useState<WrestlerProfile>(ROSTER[1]);

  const [settings, setSettings] = useState<GameSettings>({
    hapticsEnabled: true,
    soundEnabled: true,
    musicEnabled: true,
    difficulty: 'normal',
    matchMode: 'standard',
    twoPlayerMode: false,
    bloodEnabled: true,
  });

  // Active Combat & Three.js instances
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const combatEngineRef = useRef<CombatEngine | null>(null);
  const threeSceneRef = useRef<WrestlingArenaScene | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Reactive state for HUD
  const [hudTick, setHudTick] = useState<number>(0);
  const [notifications, setNotifications] = useState<GameEventNotification[]>([]);
  const [controllerType, setControllerType] = useState<ControllerType>('keyboard');

  // Modals
  const [showMoveList, setShowMoveList] = useState(false);
  const [showGamepadSettings, setShowGamepadSettings] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);

  // Detect connected gamepad type
  useEffect(() => {
    const checkController = () => {
      setControllerType(inputManager.getPrimaryControllerType());
    };
    checkController();
    const interval = setInterval(checkController, 1000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Starts a standard match (Exhibition or Dojo)
   */
  const handleStartExhibition = (
    selectedP1: WrestlerProfile,
    selectedP2: WrestlerProfile,
    newSettings: GameSettings
  ) => {
    setP1Profile(selectedP1);
    setP2Profile(selectedP2);
    setSettings(newSettings);
    setActiveStoryMatch(false);
    setShowWinModal(false);
    setNotifications([]);

    audioEngine.init();
    audioEngine.setSoundEnabled(newSettings.soundEnabled);
    audioEngine.setMusicEnabled(newSettings.musicEnabled);
    haptics.setEnabled(newSettings.hapticsEnabled);

    setGameState('match');
  };

  /**
   * Starts a Story Mode match
   */
  const handleStartStoryMatch = (
    player: WrestlerProfile,
    opponent: WrestlerProfile,
    matchMode: GameSettings['matchMode']
  ) => {
    setP1Profile(player);
    setP2Profile(opponent);
    setSettings((prev) => ({ ...prev, matchMode }));
    setActiveStoryMatch(true);
    setShowWinModal(false);
    setNotifications([]);

    audioEngine.init();
    audioEngine.setSoundEnabled(settings.soundEnabled);
    audioEngine.setMusicEnabled(settings.musicEnabled);
    haptics.setEnabled(settings.hapticsEnabled);

    setGameState('match');
  };

  /**
   * Saves a newly created wrestler from CAW suite
   */
  const handleSaveCAW = (newWrestler: WrestlerProfile) => {
    setCustomRoster((prev) => [newWrestler, ...prev]);
    setP1Profile(newWrestler);
    setGameState('roster_select');
  };

  /**
   * Initializes Three.js & Combat Engine when entering 'match' state
   */
  useEffect(() => {
    if (gameState !== 'match') return;
    if (!canvasContainerRef.current) return;

    // 1. Initialize Three.js Scene
    const scene = new WrestlingArenaScene(canvasContainerRef.current);
    threeSceneRef.current = scene;

    // 2. Initialize Combat Engine with full profiles
    const combat = new CombatEngine(p1Profile, p2Profile, settings);
    combat.setScene(scene);
    combatEngineRef.current = combat;

    // Notification callback
    combat.onNotification = (notif) => {
      setNotifications((prev) => [notif, ...prev.slice(0, 4)]);
    };

    lastTimeRef.current = performance.now();

    // 3. Main Gameplay Loop (60 FPS)
    const gameLoop = (currentTime: number) => {
      animFrameRef.current = requestAnimationFrame(gameLoop);
      const delta = Math.min(0.05, (currentTime - lastTimeRef.current) / 1000);
      lastTimeRef.current = currentTime;

      const engine = combatEngineRef.current;
      if (!engine) return;

      // Poll controller inputs
      const p1Input = inputManager.poll(1);
      const p2Input = inputManager.poll(2, !settings.twoPlayerMode);

      // Check Pause button
      if (p1Input.pausePressed || p2Input.pausePressed) {
        setGameState((prev) => (prev === 'match' ? 'paused' : 'match'));
        return;
      }

      // Tick Combat Engine & Adaptive AI
      engine.update(delta, p1Input, p2Input);

      // Trigger win modal if someone won
      if (engine.matchWinner !== null && !showWinModal) {
        setShowWinModal(true);

        // Story Mode Progression Handling
        if (activeStoryMatch) {
          const isPlayerWinner = engine.matchWinner === 1;
          const currentScene = STORY_SCENES[careerState.currentChapter - 1];

          if (isPlayerWinner && currentScene) {
            const nextCh = Math.min(STORY_SCENES.length, careerState.currentChapter + 1);
            const wonBelts = [...careerState.heldChampionships];
            if (currentScene.championshipOnLine && !wonBelts.includes(currentScene.championshipOnLine)) {
              wonBelts.push(currentScene.championshipOnLine);
            }

            setCareerState((prev) => ({
              ...prev,
              currentChapter: nextCh,
              skillPoints: prev.skillPoints + currentScene.rewardPoints,
              heldChampionships: wonBelts,
              record: {
                wins: prev.record.wins + 1,
                losses: prev.record.losses,
              },
              historyLog: [
                `VICTORY at Chapter ${currentScene.chapterNumber}: Defeated ${currentScene.opponentName} for ${currentScene.championshipOnLine || 'glory'}!`,
                ...prev.historyLog,
              ],
            }));
          } else {
            setCareerState((prev) => ({
              ...prev,
              record: {
                wins: prev.record.wins,
                losses: prev.record.losses + 1,
              },
            }));
          }
        }
      }

      // Update HUD state
      setHudTick(currentTime);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (threeSceneRef.current) {
        threeSceneRef.current.dispose();
        threeSceneRef.current = null;
      }
      combatEngineRef.current = null;
    };
  }, [gameState, p1Profile, p2Profile, settings, activeStoryMatch]);

  /**
   * Quick action button handlers (e.g. Kickout or Submission tap)
   */
  const handleQuickAction = (key: string) => {
    const engine = combatEngineRef.current;
    if (!engine) return;

    if (key === 'kickout' && engine.isPinActive) {
      engine.kickoutMeter += 18;
      haptics.strikeHeavy();
    } else if (key === 'submission_escape' && engine.isSubmissionActive) {
      engine.submissionMeter -= 14;
      haptics.submissionStruggle();
    } else {
      inputManager.triggerVirtualAction(key);
    }
  };

  const handleRematch = () => {
    setShowWinModal(false);
    if (activeStoryMatch) {
      handleStartStoryMatch(p1Profile, p2Profile, settings.matchMode);
    } else {
      handleStartExhibition(p1Profile, p2Profile, settings);
    }
  };

  const handleReturnToRoster = () => {
    setShowWinModal(false);
    if (activeStoryMatch) {
      setGameState('story_mode');
    } else {
      setGameState('roster_select');
    }
  };

  const currentEngine = combatEngineRef.current;

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-zinc-950 text-zinc-100 select-none">
      {/* 1. CHARACTER SELECT SCREEN */}
      {gameState === 'roster_select' && (
        <RosterSelect
          rosterList={customRoster}
          onStartMatch={handleStartExhibition}
          onOpenGamepadSettings={() => setShowGamepadSettings(true)}
          onOpenStoryMode={() => setGameState('story_mode')}
          onOpenCharacterCreator={() => setGameState('character_creator')}
        />
      )}

      {/* 2. ROAD TO STARDOM: STORY / CAREER MODE */}
      {gameState === 'story_mode' && (
        <StoryModeView
          careerState={careerState}
          playerProfile={p1Profile}
          onUpdateCareer={(updated) => setCareerState((prev) => ({ ...prev, ...updated }))}
          onUpdatePlayerStats={(newStats) => setP1Profile((prev) => ({ ...prev, stats: newStats }))}
          onStartStoryMatch={handleStartStoryMatch}
          onExitStory={() => setGameState('roster_select')}
        />
      )}

      {/* 3. CREATE-A-WRESTLER (CAW) STUDIO */}
      {gameState === 'character_creator' && (
        <CharacterCreator
          initialProfile={p1Profile}
          onSave={handleSaveCAW}
          onCancel={() => setGameState('roster_select')}
        />
      )}

      {/* 4. THREE.JS 3D ARENA CANVAS CONTAINER */}
      {(gameState === 'match' || gameState === 'paused') && (
        <div className="relative w-full h-full">
          <div ref={canvasContainerRef} className="w-full h-full" />

          {/* Retro Broadcast CRT scanline effect */}
          <div className="retro-scanlines absolute inset-0 opacity-25 pointer-events-none" />

          {/* BROADCAST HUD */}
          {currentEngine && (
            <GameHUD
              p1={currentEngine.p1}
              p2={currentEngine.p2}
              p1Profile={p1Profile}
              p2Profile={p2Profile}
              matchTime={currentEngine.matchTime}
              matchMode={settings.matchMode}
              isPinActive={currentEngine.isPinActive}
              pinCount={currentEngine.pinCount}
              victimIndex={currentEngine.victimIndex}
              kickoutMeter={currentEngine.kickoutMeter}
              isSubmissionActive={currentEngine.isSubmissionActive}
              submissionMeter={currentEngine.submissionMeter}
              submissionHoldName={currentEngine.submissionHoldName}
              notifications={notifications}
              controllerType={controllerType}
              activeCrowdChant={currentEngine.activeCrowdChant}
              onPause={() => setGameState('paused')}
              onOpenMoveList={() => setShowMoveList(true)}
              onOpenGamepadSettings={() => setShowGamepadSettings(true)}
              onQuickAction={handleQuickAction}
            />
          )}

          {/* PAUSE MENU OVERLAY */}
          {gameState === 'paused' && (
            <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
              <div className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
                <h3 className="font-heading font-black text-2xl tracking-wider uppercase text-white">
                  MATCH PAUSED
                </h3>
                <p className="text-xs text-zinc-400">
                  {p1Profile.name} vs {p2Profile.name}
                </p>

                <div className="flex flex-col gap-2.5 w-full mt-2">
                  <button
                    onClick={() => setGameState('match')}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase rounded transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    <span>Resume Match</span>
                  </button>

                  <button
                    onClick={() => setShowMoveList(true)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase border border-zinc-800 rounded transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-blue-400" />
                    <span>Move List Manual</span>
                  </button>

                  <button
                    onClick={() => setShowGamepadSettings(true)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase border border-zinc-800 rounded transition-colors"
                  >
                    <Gamepad2 className="w-4 h-4 text-amber-400" />
                    <span>Gamepad & Rumble Settings</span>
                  </button>

                  <button
                    onClick={handleRematch}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase border border-zinc-800 rounded transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Restart Match</span>
                  </button>

                  <button
                    onClick={handleReturnToRoster}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-bold text-xs uppercase border border-zinc-800 rounded transition-colors"
                  >
                    <Users className="w-4 h-4" />
                    <span>Exit Match</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. MODALS */}
      {showMoveList && (
        <MoveListModal
          controllerType={controllerType}
          onClose={() => setShowMoveList(false)}
        />
      )}

      {showGamepadSettings && (
        <GamepadSettingsModal
          settings={settings}
          onUpdateSettings={(newVals) => setSettings((prev) => ({ ...prev, ...newVals }))}
          onClose={() => setShowGamepadSettings(false)}
        />
      )}

      {showWinModal && currentEngine && currentEngine.matchWinner && (
        <ChampionshipWinModal
          winner={currentEngine.matchWinner === 1 ? currentEngine.p1 : currentEngine.p2}
          loser={currentEngine.matchWinner === 1 ? currentEngine.p2 : currentEngine.p1}
          winnerProfile={currentEngine.matchWinner === 1 ? p1Profile : p2Profile}
          winMethod={currentEngine.winMethod || 'pinfall'}
          matchTime={currentEngine.matchTime}
          onRematch={handleRematch}
          onSelectNew={handleReturnToRoster}
        />
      )}
    </main>
  );
}
