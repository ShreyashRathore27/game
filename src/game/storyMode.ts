/**
 * Story Mode & Career Narrative Engine: "Road to Stardom"
 * Tracks rookie progression, branching dialogue choices, rivalry heat,
 * championships, and character attribute upgrades.
 */

import { StoryCareerState, StoryScene, ChampionshipBelt } from './types';

export const INITIAL_CAREER_STATE: StoryCareerState = {
  currentChapter: 1,
  alignment: 'babyface',
  alignmentPoints: 0,
  skillPoints: 120, // Starting XP
  rivalId: 'austin',
  rivalryHeat: 'cool',
  heldChampionships: [],
  record: { wins: 0, losses: 0 },
  historyLog: ['Signed rookie contract with PAIN Wrestling Federation.'],
};

export const STORY_SCENES: StoryScene[] = [
  {
    id: 'ch1_tryout',
    chapterNumber: 1,
    title: 'CHAPTER 1: THE ROOKIE TRYOUT',
    subtitle: 'Developmental Gym & Training Camp',
    opponentId: 'angle',
    opponentName: 'The Olympic Machine',
    location: 'PW Developmental Gym · Pittsburgh, PA',
    backdropType: 'locker_room',
    dialogueIntro:
      'You step into the training center locker room. Veteran collegiate champion Kurt Angle leans against the ring ropes, glaring at you with cold intensity. "You think you have what it takes to survive here, rookie? In this ring, pedigree and discipline mean everything. Show me you have heart, or pack your bags!"',
    choices: [
      {
        id: 'ch1_choice_face',
        label: 'Respect the Veteran Code',
        dialogue: '"I came here to learn from the best. I will earn every inch with pure wrestling discipline."',
        alignment: 'babyface',
        heatChange: 10,
        outcomeText: 'Angle nods curtly. "We will see on the canvas. Standard wrestling rules, rookie."',
      },
      {
        id: 'ch1_choice_heel',
        label: 'Disrespect the Legend',
        dialogue: '"Your time is past, old man. I am the future, and I am putting you out to pasture tonight!"',
        alignment: 'heel',
        heatChange: 35,
        outcomeText: 'Angle scowls furiously. "You talk too much. I will twist your ankle until you scream!"',
      },
    ],
    matchMode: 'standard',
    championshipOnLine: 'Developmental Championship',
    rewardPoints: 200,
  },
  {
    id: 'ch2_backstage_ambush',
    chapterNumber: 2,
    title: 'CHAPTER 2: TELEVISION DEBUT & THE RIVALRY',
    subtitle: 'Backstage Brawl & Hardcore Grudge',
    opponentId: 'austin',
    opponentName: 'The Texas Rattlesnake',
    location: 'Live Arena Tunnel · Backstage Corridor',
    backdropType: 'backstage',
    dialogueIntro:
      'You are walking through the arena corridor before your live broadcast debut when a steel folding chair clatters against the wall. The Texas Rattlesnake steps out of the shadows, eyes bloodshot with adrenaline. "You made some noise in developmental, kid. But out here in the real world, someone always stomps your teeth down your throat. You want a piece of this?"',
    choices: [
      {
        id: 'ch2_choice_brawl',
        label: 'Square Up Face-to-Face',
        dialogue: '"I am not backing down from anyone. Drop the chair and fight like a man!"',
        alignment: 'babyface',
        heatChange: 25,
        stipulation: 'Hardcore Rules Active',
        outcomeText: 'Austin smirks: "Hell yeah! Let\'s go break some furniture!"',
      },
      {
        id: 'ch2_choice_cheap_shot',
        label: 'Snatch the Chair and Strike First',
        dialogue: '"I do not wait for permission!" (You swing the steel chair!)',
        alignment: 'heel',
        heatChange: 50,
        stipulation: 'Steel Chair Hardcore Match',
        outcomeText: 'Austin ducks and roars: "You just started a Blood Feud, you SOB!"',
      },
    ],
    matchMode: 'hardcore_chair',
    championshipOnLine: 'Hardcore Championship',
    rewardPoints: 350,
  },
  {
    id: 'ch3_authority_feud',
    chapterNumber: 3,
    title: 'CHAPTER 3: THE DEADMAN\'S SHADOW',
    subtitle: 'General Manager Ultimatum',
    opponentId: 'undertaker',
    opponentName: 'The Deadman Phenom',
    location: 'Smoky Arena Hall of Darkness',
    backdropType: 'arena_tunnel',
    dialogueIntro:
      'The arena lights suddenly plunge into deep purple darkness. A cold wind sweeps through the corridor as a 6-foot-10 silhouette emerges through the smoke. The Deadman fixes his gaze upon you. "You have climbed high, but you now stand on holy ground. Only the chosen survive the graveyard. Rest... in... peace!"',
    choices: [
      {
        id: 'ch3_choice_defiance',
        label: 'Defy the Darkness with Fire',
        dialogue: '"I do not fear myths or monsters! I am taking the Intercontinental title and carving my own legacy!"',
        alignment: 'babyface',
        heatChange: 30,
        outcomeText: 'The gong chimes three times. The Phenom steps into the ring awaiting combat.',
      },
      {
        id: 'ch3_choice_ruthless',
        label: 'Target the Deadman\'s Knees',
        dialogue: '"Your legend dies tonight. When your legs give out, you are just flesh and bone like anyone else."',
        alignment: 'heel',
        heatChange: 45,
        outcomeText: 'The Phenom\'s eyes roll back into his skull. The challenge is accepted!',
      },
    ],
    matchMode: 'standard',
    championshipOnLine: 'Intercontinental Championship',
    rewardPoints: 500,
  },
  {
    id: 'ch4_main_event_grandeur',
    chapterNumber: 4,
    title: 'CHAPTER 4: PAINMANIA MAIN EVENT',
    subtitle: 'World Heavyweight Championship Clash',
    opponentId: 'rock',
    opponentName: 'The Great Champion',
    location: 'Sold-Out Dome Stadium · 80,000 Fans',
    backdropType: 'gm_office',
    dialogueIntro:
      'The roar of 80,000 fans vibrates the concrete floor beneath your boots. Pyrotechnics explode outside. In the gorilla position, The Great Champion turns around in his customized silk shirt and sunglasses. "Finally, the rookie has come to the big dance! But to be the champion of this industry, you have to go through the most electrifying force in entertainment history. Can you feel the electricity, rookie?"',
    choices: [
      {
        id: 'ch4_choice_destiny',
        label: '"This is my destiny. Let\'s give them a classic!"',
        dialogue: '"You have inspired millions, but tonight a new era begins. Let\'s leave everything in that ring!"',
        alignment: 'babyface',
        heatChange: 20,
        outcomeText: 'The Champion raises the eyebrow: "Just bring it!"',
      },
      {
        id: 'ch4_choice_hostile',
        label: '"Your era is over, Hollywood!"',
        dialogue: '"I am sick of your catchphrases and theatrics. Tonight I smash your face and take your title!"',
        alignment: 'heel',
        heatChange: 40,
        outcomeText: 'The Champion scoffs: "Know your role and shut your mouth! It\'s go time!"',
      },
    ],
    matchMode: 'standard',
    championshipOnLine: 'World Heavyweight Championship',
    rewardPoints: 1000,
  },
];
