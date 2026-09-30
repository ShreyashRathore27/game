/**
 * Story Mode / Career Presentation: "Road to Stardom"
 * Dynamic narrative scenes, dialogue choices, rivalry heat,
 * championship showcases, and Gym training attribute upgrades.
 */

import React, { useState } from 'react';
import { StoryCareerState, StoryScene, StoryDialogueOption, WrestlerProfile, GameSettings } from '../game/types';
import { STORY_SCENES } from '../game/storyMode';
import { ROSTER } from '../game/roster';
import { audioEngine } from '../game/audioEngine';
import { haptics } from '../game/haptics';
import { Trophy, Dumbbell, Flame, Swords, ArrowRight, ShieldCheck, Skull, HeartHandshake, History, Award } from 'lucide-react';

interface StoryModeViewProps {
  careerState: StoryCareerState;
  playerProfile: WrestlerProfile;
  onUpdateCareer: (updated: Partial<StoryCareerState>) => void;
  onUpdatePlayerStats: (newStats: WrestlerProfile['stats']) => void;
  onStartStoryMatch: (playerProfile: WrestlerProfile, opponentProfile: WrestlerProfile, matchMode: GameSettings['matchMode']) => void;
  onExitStory: () => void;
}

export const StoryModeView: React.FC<StoryModeViewProps> = ({
  careerState,
  playerProfile,
  onUpdateCareer,
  onUpdatePlayerStats,
  onStartStoryMatch,
  onExitStory,
}) => {
  const currentSceneIndex = Math.min(STORY_SCENES.length - 1, careerState.currentChapter - 1);
  const scene: StoryScene = STORY_SCENES[currentSceneIndex];

  const opponentProfile = ROSTER.find(r => r.id === scene.opponentId) || ROSTER[1];

  const [selectedChoice, setSelectedChoice] = useState<StoryDialogueOption | null>(null);
  const [showGymModal, setShowGymModal] = useState(false);

  const handleSelectChoice = (choice: StoryDialogueOption) => {
    setSelectedChoice(choice);
    audioEngine.playStrike(false);
    haptics.strikeLight();

    // Update alignment and rivalry heat
    const newAlignmentPoints = careerState.alignmentPoints + (choice.alignment === 'babyface' ? 15 : -15);
    const newAlignment = newAlignmentPoints >= 0 ? 'babyface' : 'heel';

    let newHeat = careerState.rivalryHeat;
    if (choice.heatChange > 30) newHeat = 'blood_feud';
    else if (choice.heatChange > 15) newHeat = 'heated';

    onUpdateCareer({
      alignment: newAlignment,
      alignmentPoints: newAlignmentPoints,
      rivalryHeat: newHeat,
      historyLog: [
        `Ch. ${scene.chapterNumber}: ${choice.label} (${choice.alignment.toUpperCase()})`,
        ...careerState.historyLog,
      ],
    });
  };

  const handleEnterRing = () => {
    audioEngine.playRingBell();
    audioEngine.playCrowdRoar(0.9);
    haptics.redSmackFinisher();
    onStartStoryMatch(playerProfile, opponentProfile, scene.matchMode);
  };

  return (
    <div className="relative w-full h-full flex flex-col justify-between p-6 bg-zinc-950 text-zinc-100 overflow-y-auto">
      {/* Background Graphic */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
        <img
          src="/src/assets/images/story_backstage_corridor_1790750810629.jpg"
          alt="Backstage Corridor"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover filter blur-sm scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
      </div>

      {/* TOP CAREER BROADCAST BAR */}
      <div className="relative z-10 flex flex-wrap items-center justify-between border-b border-zinc-800 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded flex items-center justify-center shadow-[0_0_15px_#f59e0b]">
            <Trophy className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="font-heading font-black text-xl tracking-wider uppercase text-white">
              ROAD TO STARDOM: <span className="text-amber-400">SEASON MODE</span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              Chapter {scene.chapterNumber} of {STORY_SCENES.length} · {scene.location}
            </p>
          </div>
        </div>

        {/* Career Stats & Alignment */}
        <div className="flex items-center gap-4 text-xs font-mono-nums">
          <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <span className="text-zinc-500 font-bold text-[10px] uppercase">RECORD</span>
            <span className="font-extrabold text-white">
              {careerState.record.wins}W - {careerState.record.losses}L
            </span>
          </div>

          <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-bold uppercase text-[11px] ${
            careerState.alignment === 'babyface'
              ? 'bg-blue-950/60 border-blue-500/50 text-blue-300'
              : 'bg-red-950/60 border-red-500/50 text-red-300'
          }`}>
            {careerState.alignment === 'babyface' ? (
              <HeartHandshake className="w-3.5 h-3.5 text-blue-400" />
            ) : (
              <Skull className="w-3.5 h-3.5 text-red-400" />
            )}
            <span>{careerState.alignment}</span>
          </div>

          <div className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 font-bold uppercase text-[11px] ${
            careerState.rivalryHeat === 'blood_feud'
              ? 'bg-red-900/50 border-red-500 text-red-200 animate-pulse'
              : careerState.rivalryHeat === 'heated'
              ? 'bg-amber-900/40 border-amber-500 text-amber-200'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}>
            <Flame className="w-3.5 h-3.5" />
            <span>RIVALRY: {careerState.rivalryHeat.replace('_', ' ')}</span>
          </div>

          <button
            onClick={() => setShowGymModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-extrabold rounded-md text-xs transition-colors shadow-md"
          >
            <Dumbbell className="w-4 h-4" />
            <span>TRAINING GYM ({careerState.skillPoints} XP)</span>
          </button>

          <button
            onClick={onExitStory}
            className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-xs font-semibold text-zinc-300"
          >
            Exit Story
          </button>
        </div>
      </div>

      {/* MAIN CHAPTER STAGE */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 my-4 flex-1 items-center">
        {/* LEFT: ROOKIE PRODIGY PROFILE CARD */}
        <div className="lg:col-span-3 bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-2xl flex flex-col gap-3">
          <div className="w-full aspect-square rounded-lg overflow-hidden border border-zinc-700/80 bg-zinc-950 relative shadow-inner">
            <img
              src="/src/assets/images/rookie_prodigy_portrait_1790750796395.jpg"
              alt="Rookie Wrestler"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono-nums font-bold text-amber-400">
              ROOKIE
            </div>
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              YOUR PRODIGY
            </span>
            <h2 className="font-heading font-black text-xl text-white uppercase italic">
              {playerProfile.name}
            </h2>
            <p className="text-xs text-zinc-400 italic">
              "{playerProfile.nickname}"
            </p>
          </div>

          {/* Held Championships */}
          <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] font-extrabold uppercase text-zinc-400 block mb-1">
              CHAMPIONSHIP BELTS ({careerState.heldChampionships.length})
            </span>
            {careerState.heldChampionships.length === 0 ? (
              <span className="text-xs text-zinc-500 italic">No championships won yet.</span>
            ) : (
              <div className="flex flex-col gap-1">
                {careerState.heldChampionships.map((belt, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>{belt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER: NARRATIVE DIALOGUE & BRANCHING DECISIONS */}
        <div className="lg:col-span-6 bg-zinc-900/95 border-2 border-zinc-800 rounded-xl p-6 shadow-2xl flex flex-col justify-between gap-5">
          <div className="flex flex-col gap-1.5 border-b border-zinc-800 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-400">
                {scene.title}
              </span>
              {scene.championshipOnLine && (
                <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-[10px] uppercase rounded">
                  FOR THE: {scene.championshipOnLine}
                </span>
              )}
            </div>
            <h3 className="font-heading font-black text-2xl text-white uppercase italic">
              {scene.subtitle}
            </h3>
          </div>

          {/* Narrative Scene Prose */}
          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-lg text-sm text-zinc-200 leading-relaxed font-medium">
            <p>{scene.dialogueIntro}</p>
          </div>

          {/* Branching Player Choices */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
              MAKE YOUR DECISION:
            </span>
            <div className="grid grid-cols-1 gap-2.5">
              {scene.choices.map((choice) => {
                const isSelected = selectedChoice?.id === choice.id;
                return (
                  <button
                    key={choice.id}
                    onClick={() => handleSelectChoice(choice)}
                    className={`flex flex-col p-3.5 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-heading font-black text-sm text-white uppercase">
                        {choice.label}
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                        choice.alignment === 'babyface'
                          ? 'bg-blue-900/50 text-blue-300'
                          : 'bg-red-900/50 text-red-300'
                      }`}>
                        {choice.alignment}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 italic">
                      {choice.dialogue}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Outcome Preview */}
          {selectedChoice && (
            <div className="bg-zinc-950 border border-amber-500/50 p-3 rounded-lg text-xs flex items-center justify-between">
              <span className="text-amber-300 font-semibold">
                {selectedChoice.outcomeText}
              </span>
              <span className="font-mono-nums text-[10px] text-zinc-400">
                Reward: +{scene.rewardPoints} XP
              </span>
            </div>
          )}
        </div>

        {/* RIGHT: OPPONENT CARD */}
        <div className="lg:col-span-3 bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-2xl flex flex-col gap-3">
          <div className="w-full aspect-square rounded-lg overflow-hidden border border-zinc-700/80 bg-zinc-950 relative shadow-inner">
            <img
              src="/src/assets/images/rookie_prodigy_fullbody_1790750783027.jpg"
              alt="Opponent Wrestler"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute bottom-1 right-1 bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-mono-nums font-bold">
              OPPONENT
            </div>
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
              TARGET
            </span>
            <h2 className="font-heading font-black text-xl text-white uppercase italic">
              {opponentProfile.name}
            </h2>
            <p className="text-xs text-zinc-400 italic">
              "{opponentProfile.nickname}"
            </p>
          </div>

          <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80 text-xs">
            <span className="text-[10px] font-extrabold uppercase text-zinc-400 block mb-0.5">
              SIGNATURE THREAT
            </span>
            <span className="font-bold text-red-400 block">
              {opponentProfile.finisherMove}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono-nums mt-1 block">
              PWR: {opponentProfile.stats.power} · SPD: {opponentProfile.stats.speed}
            </span>
          </div>
        </div>
      </div>

      {/* FOOTER ACTION */}
      <div className="relative z-10 flex items-center justify-between border-t border-zinc-800 pt-4">
        <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono-nums">
          <Swords className="w-4 h-4 text-amber-400" />
          <span>STIPULATION: <strong className="text-white uppercase">{scene.matchMode.replace('_', ' ')}</strong></span>
        </div>

        <button
          onClick={handleEnterRing}
          disabled={!selectedChoice}
          className={`flex items-center gap-2.5 px-8 py-3.5 rounded-lg font-heading font-black text-lg uppercase tracking-wider transition-all transform active:scale-95 shadow-xl ${
            selectedChoice
              ? 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.7)]'
              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
          }`}
        >
          <span>ENTER THE RING</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* TRAINING GYM XP UPGRADE MODAL */}
      {showGymModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl flex flex-col gap-4 text-zinc-100">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-amber-400" />
                <h3 className="font-heading font-black text-lg uppercase">
                  TRAINING GYM ATTRIBUTE UPGRADES
                </h3>
              </div>
              <button
                onClick={() => setShowGymModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="flex items-center justify-between bg-zinc-900 p-3 rounded-lg border border-zinc-800 text-xs font-mono-nums">
              <span>AVAILABLE SKILL POINTS:</span>
              <strong className="text-amber-400 font-black text-sm">{careerState.skillPoints} XP</strong>
            </div>

            {/* Stat rows */}
            <div className="flex flex-col gap-3">
              {(['speed', 'power', 'submission', 'charisma', 'durability'] as (keyof WrestlerProfile['stats'])[]).map((statKey) => {
                const currentVal = playerProfile.stats[statKey];
                const canUpgrade = careerState.skillPoints >= 50 && currentVal < 100;

                const handleUpgrade = () => {
                  if (!canUpgrade) return;
                  audioEngine.playStrike(false);
                  haptics.strikeLight();
                  onUpdateCareer({ skillPoints: careerState.skillPoints - 50 });
                  onUpdatePlayerStats({
                    ...playerProfile.stats,
                    [statKey]: Math.min(100, currentVal + 4),
                  });
                };

                return (
                  <div key={statKey} className="flex items-center justify-between text-xs">
                    <span className="font-bold uppercase text-zinc-300 w-24">{statKey}:</span>
                    <span className="font-mono-nums font-black text-amber-400 w-8">{currentVal}</span>
                    <button
                      onClick={handleUpgrade}
                      disabled={!canUpgrade}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-black font-extrabold text-[11px] uppercase rounded transition-colors"
                    >
                      +4 (50 XP)
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowGymModal(false)}
              className="mt-2 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs uppercase rounded transition-colors"
            >
              Done Training
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
