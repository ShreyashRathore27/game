/**
 * Advanced Adaptive AI for Wrestling Game Opponents
 * Features Tactical Habit Learning (countering player move spam),
 * Distinct Combat Personalities (Brawler, Technician, Showstopper, High Flyer, Powerhouse),
 * and Multi-hit Combo Execution (Stun -> Whip -> Rebound -> Ground Slam -> Pin).
 */

import { WrestlerFighter, AIPersonality, BodyPart, GameSettings } from './types';
import { InputState } from './inputManager';

export interface PlayerTacticTracker {
  recentStrikes: number;
  recentGrapples: number;
  recentRunningAttacks: number;
  recentWeaponPicks: number;
  totalActions: number;
  lastActionTime: number;
}

export class AdvancedAIEngine {
  private personality: AIPersonality;
  private tracker: PlayerTacticTracker;
  private comboStep: number = 0;
  private comboTimer: number = 0;
  private currentTacticalAdvice: string = '';
  private actionCooldown: number = 0.6; // Human-like attack pacing
  private telegraphTimer: number = 0; // Brief ready phase before launching attack

  constructor(personality: AIPersonality = 'brawler') {
    this.personality = personality;
    this.tracker = {
      recentStrikes: 0,
      recentGrapples: 0,
      recentRunningAttacks: 0,
      recentWeaponPicks: 0,
      totalActions: 0,
      lastActionTime: Date.now(),
    };
  }

  public setPersonality(p: AIPersonality) {
    this.personality = p;
  }

  public getTacticalAdvice(): string {
    return this.currentTacticalAdvice;
  }

  /**
   * Records player behavior to detect spamming and adapt counter tactics
   */
  public recordPlayerAction(action: 'strike' | 'grapple' | 'run' | 'chair') {
    this.tracker.totalActions++;
    if (action === 'strike') this.tracker.recentStrikes++;
    if (action === 'grapple') this.tracker.recentGrapples++;
    if (action === 'run') this.tracker.recentRunningAttacks++;
    if (action === 'chair') this.tracker.recentWeaponPicks++;

    // Decay older counts every 15 actions to keep memory rolling
    if (this.tracker.totalActions > 20) {
      this.tracker.recentStrikes = Math.round(this.tracker.recentStrikes * 0.6);
      this.tracker.recentGrapples = Math.round(this.tracker.recentGrapples * 0.6);
      this.tracker.recentRunningAttacks = Math.round(this.tracker.recentRunningAttacks * 0.6);
      this.tracker.recentWeaponPicks = Math.round(this.tracker.recentWeaponPicks * 0.6);
      this.tracker.totalActions = 10;
    }
  }

  /**
   * Generates intelligent, personality-driven controller inputs for the CPU opponent
   */
  public computeDecision(
    cpu: WrestlerFighter,
    player: WrestlerFighter,
    settings: GameSettings,
    delta: number
  ): InputState {
    const input: InputState = {
      moveX: 0,
      moveZ: 0,
      isRunning: false,
      strike: false,
      strikePressed: false,
      grapple: false,
      grapplePressed: false,
      whipPinWeapon: false,
      whipPinWeaponPressed: false,
      redSmack: false,
      redSmackPressed: false,
      turnbucklePickup: false,
      turnbucklePickupPressed: false,
      taunt: false,
      tauntPressed: false,
      counterStrike: false,
      counterGrapple: false,
      universalCounter: false,
      block: false,
      blockPressed: false,
      pausePressed: false,
    };

    // Decrement timers
    if (this.actionCooldown > 0) this.actionCooldown -= delta;
    if (this.telegraphTimer > 0) this.telegraphTimer -= delta;

    const dist = Math.hypot(player.position.x - cpu.position.x, player.position.z - cpu.position.z);
    const dx = player.position.x - cpu.position.x;
    const dz = player.position.z - cpu.position.z;

    const isLegend = settings.difficulty === 'legend';
    const isHard = settings.difficulty === 'hard';

    // 1. TACTICAL LEARNING & FAIR COUNTER PREDICTION
    const strikeSpamRatio = this.tracker.totalActions > 4 
      ? this.tracker.recentStrikes / this.tracker.totalActions 
      : 0.3;
    const grappleSpamRatio = this.tracker.totalActions > 4 
      ? this.tracker.recentGrapples / this.tracker.totalActions 
      : 0.3;

    if (strikeSpamRatio > 0.45) {
      this.currentTacticalAdvice = 'AI noticed you favor strikes! Watch for parry windows.';
    } else if (grappleSpamRatio > 0.45) {
      this.currentTacticalAdvice = 'AI noticed you favor grapples! Keep distance or strike first.';
    } else {
      this.currentTacticalAdvice = 'AI analyzing tactical tendencies...';
    }

    // Fair Adaptive Reversal Logic (Allows player attacks to connect without feeling robbed!)
    const strikeCounterChance = (isLegend ? 0.25 : isHard ? 0.16 : 0.08) + (strikeSpamRatio * 0.12);
    const grappleCounterChance = (isLegend ? 0.25 : isHard ? 0.16 : 0.08) + (grappleSpamRatio * 0.12);

    if (['strike_light', 'strike_heavy', 'running_attack'].includes(player.state)) {
      if (Math.random() < strikeCounterChance) {
        input.counterStrike = true;
        input.block = true;
        return input;
      }
    }

    if (['grapple_tieup', 'grapple_performing'].includes(player.state)) {
      if (Math.random() < grappleCounterChance) {
        input.counterGrapple = true;
        input.block = true;
        return input;
      }
    }

    // If player is actively blocking with hands raised, CPU sometimes hesitates or tries to circle
    if (player.isBlocking || player.state === 'block') {
      if (Math.random() < 0.6) {
        // Circle around player instead of foolishly walking into guard
        input.moveX = -dz / (dist || 1);
        input.moveZ = dx / (dist || 1);
        return input;
      }
    }

    // 2. RED SMACKDOWN FINISHER TRIGGER
    if (cpu.redSmackTokens > 0 && dist < 2.5 && player.state !== 'ground_down' && this.actionCooldown <= 0) {
      if (this.personality === 'showstopper' && cpu.momentum > 60) {
        input.redSmackPressed = true;
        this.actionCooldown = 1.2;
        return input;
      }
      if (this.personality === 'powerhouse' || this.personality === 'brawler' || player.health < 40) {
        input.redSmackPressed = true;
        this.actionCooldown = 1.2;
        return input;
      }
    }

    // 3. GROUND STATE STRATEGY (PIN, SUBMISSION, OR STOMP)
    if (player.state === 'ground_down') {
      if (dist < 2.0 && this.actionCooldown <= 0) {
        if (this.personality === 'technician' && (player.bodyDamage.legs > 40 || player.bodyDamage.arms > 40)) {
          input.grapplePressed = true;
          this.actionCooldown = 1.0;
          return input;
        }

        const canPin = player.health < 35 || player.bodyDamage.head > 65 || player.bodyDamage.torso > 70;
        if (canPin && Math.random() < (isLegend ? 0.75 : 0.45)) {
          input.whipPinWeaponPressed = true;
          this.actionCooldown = 1.5;
          return input;
        }

        if (Math.random() < 0.4) {
          input.strikePressed = true;
          this.actionCooldown = 0.9;
        } else if (Math.random() < 0.3 && cpu.momentum < 80) {
          input.tauntPressed = true;
          this.actionCooldown = 1.2;
        } else if (Math.random() < 0.3) {
          input.turnbucklePickupPressed = true;
          this.actionCooldown = 1.0;
        }
        return input;
      }
    }

    // 4. IN-RING MOVEMENT & ATTACK PACING
    if (dist > 1.7) {
      input.moveX = dx / dist;
      input.moveZ = dz / dist;
      input.isRunning = dist > 2.8;
    } else {
      // In close range (< 1.7m): Check attack cooldown!
      if (this.actionCooldown > 0) {
        // Natural sparring footwork while waiting for cooldown
        input.moveX = (Math.random() - 0.5) * 0.4;
        input.moveZ = (Math.random() - 0.5) * 0.4;
        return input;
      }

      // Attack opportunity ready! Set human cooldown (0.75s to 1.2s)
      this.actionCooldown = (isLegend ? 0.6 : isHard ? 0.8 : 1.1) + Math.random() * 0.4;

      switch (this.personality) {
        case 'brawler':
          if (!cpu.hasChair && settings.matchMode === 'hardcore_chair' && Math.abs(cpu.position.x) > 3.0 && Math.random() < 0.25) {
            input.whipPinWeaponPressed = true;
          } else if (Math.random() < 0.65) {
            input.strike = true;
            input.strikePressed = true;
          } else {
            input.grapplePressed = true;
          }
          break;

        case 'technician':
          if (Math.random() < 0.65) {
            input.grapplePressed = true;
            if (player.bodyDamage.head < 50) {
              input.moveZ = -1;
            } else {
              input.moveX = 1;
            }
          } else {
            input.strikePressed = true;
          }
          break;

        case 'high_flyer':
          if (Math.random() < 0.35) {
            input.whipPinWeaponPressed = true;
          } else if (Math.random() < 0.55) {
            input.strikePressed = true;
          } else {
            input.grapplePressed = true;
          }
          break;

        case 'showstopper':
          if (Math.random() < 0.15 && cpu.momentum < 80) {
            input.tauntPressed = true;
          } else if (Math.random() < 0.55) {
            input.strikePressed = true;
          } else {
            input.grapplePressed = true;
            input.moveZ = 1;
          }
          break;

        case 'powerhouse':
        default:
          if (Math.random() < 0.6) {
            input.grapplePressed = true;
            input.moveZ = 1;
          } else {
            input.strike = true;
            input.strikePressed = true;
          }
          break;
      }
    }

    return input;
  }
}
