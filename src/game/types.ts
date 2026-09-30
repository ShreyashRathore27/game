/**
 * Types & Interfaces for PAIN: Here Comes The Smack
 */

export type BodyPart = 'head' | 'torso' | 'arms' | 'legs';

export interface BodyDamage {
  head: number;  // 0 - 100
  torso: number; // 0 - 100
  arms: number;  // 0 - 100
  legs: number;  // 0 - 100
}

export type WrestlerId = 
  | 'rock'
  | 'austin'
  | 'undertaker'
  | 'angle'
  | 'reymysterio'
  | 'lesnar'
  | string; // Allows Custom Created Wrestlers

export interface WrestlerStats {
  speed: number;
  power: number;
  submission: number;
  charisma: number;
  durability: number;
}

export type AIPersonality = 'brawler' | 'technician' | 'showstopper' | 'high_flyer' | 'powerhouse';

export interface CustomCosmetics {
  tattooStyle: 'none' | 'tribal_sleeve' | 'chest_dragon' | 'back_skull' | 'barbwire';
  facialHair: 'clean' | 'stubble' | 'full_beard' | 'goatee';
  gearType: 'classic_trunks' | 'long_tights' | 'singlet' | 'cargo_pants';
  accentTrunkColor: number;
  wristTapeColor: number;
  kneepadColor: number;
  entranceMusic: 'arena_heavy_rock' | 'dark_synth_deadman' | 'high_energy_hiphop' | 'olympic_march';
  entrancePyro: 'flames' | 'sparks' | 'smoke' | 'none';
  customPortraitUrl?: string;
}

export interface WrestlerProfile {
  id: WrestlerId;
  name: string;
  nickname: string;
  weightClass: 'Heavyweight' | 'Cruiserweight' | 'Super Heavyweight';
  themeColor: string;
  accentColor: string;
  avatarColor: string;
  stats: WrestlerStats;
  signatureMove: string;
  finisherMove: string;
  tauntPhrase: string;
  description: string;
  trunkColor: number;
  bootColor: number;
  skinTone: number;
  hairColor: number;
  hairStyle: 'bald' | 'short' | 'long' | 'mask' | 'undercut' | 'mohawk';
  bodyType: 'lean' | 'athletic' | 'muscular' | 'colossal';
  aiPersonality?: AIPersonality;
  isCustom?: boolean;
  cosmetics?: CustomCosmetics;
  portraitUrl?: string;
}

export type WrestlerState = 
  | 'idle'
  | 'walk'
  | 'run'
  | 'strike_light'
  | 'strike_heavy'
  | 'running_attack'
  | 'grapple_tieup'
  | 'grapple_performing'
  | 'grapple_receiving'
  | 'irish_whip_throw'
  | 'irish_whip_run'
  | 'irish_whip_rebound'
  | 'climbing_turnbuckle'
  | 'top_rope_perched'
  | 'diving_attack'
  | 'ground_down'
  | 'ground_attack'
  | 'ground_submission'
  | 'submission_struggle'
  | 'pin_attempting'
  | 'pin_suffering'
  | 'chair_equipped'
  | 'chair_swing'
  | 'hit_stagger'
  | 'hit_knockdown'
  | 'counter_parry'
  | 'taunt'
  | 'special_finisher_executing'
  | 'special_finisher_victim'
  | 'block'
  | 'block_parry'
  | 'limping_walk';

export interface WrestlerFighter {
  id: WrestlerId;
  name: string;
  isCpu: boolean;
  playerIndex: 1 | 2;
  health: number; // 0 to 100
  stamina: number; // 0 to 100
  momentum: number; // 0 to 100
  redSmackTokens: number; // 0 to 3
  isRedSmackActive: boolean;
  bodyDamage: BodyDamage;
  isBleeding: boolean;
  state: WrestlerState;
  stateTimer: number;
  position: { x: number; y: number; z: number };
  rotationY: number;
  velocity: { x: number; y: number; z: number };
  hasChair: boolean;
  activeMoveName: string;
  isTargetPinnable: boolean;
  submissionProgress: number; // 0 to 100
  lastCounterType?: 'strike' | 'grapple';
  counterWindowTimer: number;
  isBlocking: boolean;
  aiPersonality?: AIPersonality;
}

export interface GameSettings {
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  difficulty: 'normal' | 'hard' | 'legend';
  matchMode: 'standard' | 'hardcore_chair' | 'dojo_practice';
  twoPlayerMode: boolean;
  bloodEnabled: boolean;
}

export interface GameEventNotification {
  id: string;
  title: string;
  type: 'smack' | 'counter' | 'finisher' | 'critical' | 'pin';
  timestamp: number;
}

// ----------------- STORY / CAREER MODE TYPES -----------------

export type RivalryHeat = 'cool' | 'heated' | 'blood_feud';
export type AlignmentType = 'babyface' | 'heel';
export type ChampionshipBelt = 'Developmental Championship' | 'Hardcore Championship' | 'Intercontinental Championship' | 'World Heavyweight Championship';

export interface StoryDialogueOption {
  id: string;
  label: string;
  dialogue: string;
  alignment: AlignmentType;
  heatChange: number; // e.g. +20 heat
  stipulation?: string;
  outcomeText: string;
}

export interface StoryScene {
  id: string;
  chapterNumber: number;
  title: string;
  subtitle: string;
  opponentId: string;
  opponentName: string;
  location: string;
  backdropType: 'backstage' | 'locker_room' | 'arena_tunnel' | 'gm_office';
  dialogueIntro: string;
  choices: StoryDialogueOption[];
  matchMode: 'standard' | 'hardcore_chair';
  championshipOnLine?: ChampionshipBelt;
  rewardPoints: number;
}

export interface StoryCareerState {
  currentChapter: number;
  alignment: AlignmentType;
  alignmentPoints: number; // negative = heel, positive = face
  skillPoints: number;
  rivalId: string;
  rivalryHeat: RivalryHeat;
  heldChampionships: ChampionshipBelt[];
  record: { wins: number; losses: number };
  historyLog: string[];
}
