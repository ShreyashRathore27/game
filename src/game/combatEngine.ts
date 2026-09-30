/**
 * Combat Simulation & State Machine Engine
 * Faithfully implements SmackDown! Here Comes The Pain mechanics:
 * 4-Way Grapple System, Body Part Damage (Head/Torso/Arms/Legs),
 * RED SMACKDOWN Finishers, Irish Whips, Turnbuckle Dives, Steel Chairs,
 * Counter/Reversal Windows, Referee 3-Counts, and Pinfall Mini-Games.
 */

import * as THREE from 'three';
import { WrestlerFighter, WrestlerProfile, GameSettings, GameEventNotification, BodyPart, AIPersonality } from './types';
import { ROSTER } from './roster';
import { InputState } from './inputManager';
import { audioEngine } from './audioEngine';
import { haptics } from './haptics';
import { WrestlingArenaScene } from './threeScene';
import { AdvancedAIEngine } from './advancedAI';

export type CombatEventType = 
  | 'hit'
  | 'counter'
  | 'grapple'
  | 'slam'
  | 'rope_bounce'
  | 'chair_hit'
  | 'finisher'
  | 'pin_start'
  | 'pin_count'
  | 'pin_kickout'
  | 'pin_win'
  | 'submission_start'
  | 'submission_tapout';

export interface CombatEvent {
  type: CombatEventType;
  attackerIndex: number;
  defenderIndex: number;
  moveName: string;
  damageTarget?: BodyPart;
  message?: string;
  countNumber?: number;
}

export class CombatEngine {
  public p1: WrestlerFighter;
  public p2: WrestlerFighter;
  public p1Profile: WrestlerProfile;
  public p2Profile: WrestlerProfile;
  public settings: GameSettings;
  public scene: WrestlingArenaScene | null = null;

  public pinCount: number = 0;
  public pinTimer: number = 0;
  public isPinActive: boolean = false;
  public pinnerIndex: number = 0;
  public victimIndex: number = 0;
  public kickoutMeter: number = 0; // 0 to 100

  public isSubmissionActive: boolean = false;
  public submissionHoldName: string = '';
  public submissionMeter: number = 0;

  public matchTime: number = 0; // in seconds
  public matchWinner: number | null = null; // 1 or 2
  public winMethod: 'pinfall' | 'submission' | 'knockout' | null = null;

  // Dynamic Crowd Audio & Chant State
  public activeCrowdChant: string = '';
  public chantTimer: number = 0;

  // 3-Hit Strike Combo Tracking
  private p1Combo: number = 0;
  private p2Combo: number = 0;
  private p1ComboTimer: number = 0;
  private p2ComboTimer: number = 0;

  public onEvent?: (event: CombatEvent) => void;
  public onNotification?: (notification: GameEventNotification) => void;
  public aiEngine: AdvancedAIEngine;

  constructor(p1Input: string | WrestlerProfile, p2Input: string | WrestlerProfile, settings: GameSettings) {
    this.settings = settings;
    this.p1Profile = typeof p1Input === 'string' ? (ROSTER.find(r => r.id === p1Input) || ROSTER[0]) : p1Input;
    this.p2Profile = typeof p2Input === 'string' ? (ROSTER.find(r => r.id === p2Input) || ROSTER[1]) : p2Input;

    const p2Personality: AIPersonality = this.p2Profile.aiPersonality || (
      this.p2Profile.id === 'austin' ? 'brawler' :
      this.p2Profile.id === 'angle' ? 'technician' :
      this.p2Profile.id === 'rock' ? 'showstopper' :
      this.p2Profile.id === 'reymysterio' ? 'high_flyer' : 'powerhouse'
    );
    this.aiEngine = new AdvancedAIEngine(p2Personality);

    this.p1 = this.createFighter(this.p1Profile, 1, false, -2.2, 0);
    this.p2 = this.createFighter(this.p2Profile, 2, !settings.twoPlayerMode, 2.2, Math.PI);
  }

  public setScene(scene: WrestlingArenaScene) {
    this.scene = scene;
    this.scene.registerWrestler(this.p1, this.p1Profile);
    this.scene.registerWrestler(this.p2, this.p2Profile);
  }

  private createFighter(
    profile: WrestlerProfile,
    playerIndex: 1 | 2,
    isCpu: boolean,
    startX: number,
    startRot: number
  ): WrestlerFighter {
    return {
      id: profile.id,
      name: profile.name,
      isCpu,
      playerIndex,
      health: 100,
      stamina: 100,
      momentum: 20,
      redSmackTokens: 1, // Start with 1 ready token for arcade action!
      isRedSmackActive: false,
      bodyDamage: { head: 0, torso: 0, arms: 0, legs: 0 },
      isBleeding: false,
      state: 'idle',
      stateTimer: 0,
      position: { x: startX, y: 1.0, z: 0 },
      rotationY: startRot,
      velocity: { x: 0, y: 0, z: 0 },
      hasChair: false,
      activeMoveName: '',
      isTargetPinnable: false,
      submissionProgress: 0,
      counterWindowTimer: 0,
      isBlocking: false,
    };
  }

  /**
   * Main gameplay tick (60 FPS)
   */
  public update(delta: number, p1Input: InputState, p2Input: InputState) {
    if (this.matchWinner !== null) return;
    this.matchTime += delta;

    // Dynamic Crowd Audio Chant Timer
    if (this.chantTimer > 0) {
      this.chantTimer -= delta;
      if (this.chantTimer <= 0) {
        this.activeCrowdChant = '';
      }
    }

    // AI Decision Making for CPU
    if (this.p2.isCpu) {
      p2Input = this.processCpuAI(this.p2, this.p1, delta);
    }

    // Process Pins and Submissions
    if (this.isPinActive) {
      this.updatePinfall(delta, p1Input, p2Input);
      return;
    }

    if (this.isSubmissionActive) {
      this.updateSubmission(delta, p1Input, p2Input);
      return;
    }

    // Process individual fighter states and inputs
    this.updateFighter(this.p1, this.p2, p1Input, delta);
    this.updateFighter(this.p2, this.p1, p2Input, delta);

    // Sync positions and animations to 3D Three.js scene
    if (this.scene) {
      this.scene.updateFighterState(this.p1);
      this.scene.updateFighterState(this.p2);
    }
  }

  /**
   * Updates fighter physics, inputs, attacks, grapples, and recoveries
   */
  private updateFighter(f: WrestlerFighter, opp: WrestlerFighter, input: InputState, delta: number) {
    // Decrement state timer
    if (f.stateTimer > 0) {
      f.stateTimer -= delta;
      if (f.stateTimer <= 0) {
        this.onFighterStateEnd(f, opp);
      }
    }

    // Counter window timer
    if (f.counterWindowTimer > 0) {
      f.counterWindowTimer -= delta;
    }

    // Check limping if leg damage is severe
    const isLegDamaged = f.bodyDamage.legs > 55;

    // 0. BLOCK / GUARD / PARRY STANCE (Space / E / RT / LT / Virtual Button)
    const canDefend = ['idle', 'walk', 'run', 'limping_walk', 'block'].includes(f.state);
    if (input.block && canDefend) {
      f.state = 'block';
      f.isBlocking = true;
      f.counterWindowTimer = 0.5;
      f.lastCounterType = 'strike';
      f.velocity.x = 0;
      f.velocity.z = 0;
      // Auto-face opponent while blocking
      const angle = Math.atan2(opp.position.x - f.position.x, opp.position.z - f.position.z);
      f.rotationY = angle;
      return;
    } else if (f.state === 'block' && !input.block) {
      f.state = 'idle';
      f.isBlocking = false;
    } else if (f.state !== 'block' && f.state !== 'block_parry') {
      f.isBlocking = false;
    }

    // 1. FREE MOVEMENT (IDLE / WALK / RUN / LIMPING)
    const canMove = ['idle', 'walk', 'run', 'limping_walk'].includes(f.state);
    if (canMove) {
      const moveMag = Math.hypot(input.moveX, input.moveZ);

      if (moveMag > 0.15) {
        // Calculate movement direction
        const angle = Math.atan2(input.moveX, input.moveZ);
        f.rotationY = angle;

        let speed = input.isRunning ? 5.2 : 2.8;
        if (isLegDamaged) speed *= 0.65; // Leg injury handicap

        f.velocity.x = Math.sin(angle) * speed;
        f.velocity.z = Math.cos(angle) * speed;

        f.state = isLegDamaged ? 'limping_walk' : (input.isRunning ? 'run' : 'walk');
      } else {
        f.velocity.x = 0;
        f.velocity.z = 0;
        f.state = 'idle';
        // Auto-face opponent when idle in close quarters
        const distToOpp = this.getDistance(f, opp);
        if (distToOpp < 2.5) {
          const faceAngle = Math.atan2(opp.position.x - f.position.x, opp.position.z - f.position.z);
          f.rotationY = faceAngle;
        }
      }

      // 2. COUNTER / REVERSAL ATTEMPTS (Universal RT / R2 / Space)
      if (input.universalCounter || input.counterStrike || input.counterGrapple) {
        f.counterWindowTimer = 0.35;
        f.lastCounterType = 'strike';
      }

      // 3. TAUNT (R1 / RB / O)
      if (input.tauntPressed) {
        f.state = 'taunt';
        f.stateTimer = 1.6;
        f.velocity.x = 0;
        f.velocity.z = 0;
        this.addMomentum(f, 22);
        this.notify('smack', `${f.name}: SIGNATURE TAUNT!`);
        audioEngine.playCrowdRoar(0.4);
        if (f.id === 'angle') {
          this.triggerCrowdChant('you_suck');
        } else {
          this.triggerCrowdChant('lets_go', f.name);
        }
        return;
      }

      // 4. WEAPON / CHAIR / PIN / IRISH WHIP (B / Circle)
      if (input.whipPinWeaponPressed) {
        // If opponent is grounded -> GO FOR PIN!
        const distToOpp = this.getDistance(f, opp);
        if (opp.state === 'ground_down' && distToOpp < 2.0) {
          this.initiatePinfall(f, opp);
          return;
        }

        // Pick up or drop chair
        if (f.hasChair) {
          f.hasChair = false;
          this.notify('smack', `${f.name} dropped the Steel Chair`);
          return;
        } else if (distToOpp > 3.0 && Math.abs(f.position.x) > 3.0) {
          f.hasChair = true;
          this.notify('smack', `${f.name} grabbed a STEEL CHAIR!`);
          audioEngine.playChairClang();
          haptics.chairShot(f.playerIndex - 1);
          return;
        }

        // Irish Whip (if opponent is standing nearby)
        if (distToOpp < 2.2 && ['idle', 'walk', 'run', 'hit_stagger'].includes(opp.state)) {
          this.executeIrishWhip(f, opp);
          return;
        }
      }

      // 5. CLIMB TURNBUCKLE / PICK UP OPPONENT (L1 / LB)
      if (input.turnbucklePickupPressed) {
        // If opponent is down -> pick them up onto their feet
        const distToOpp = this.getDistance(f, opp);
        if (opp.state === 'ground_down' && distToOpp < 2.0) {
          opp.state = 'hit_stagger';
          opp.stateTimer = 1.0;
          this.notify('smack', `${f.name} hauled ${opp.name} to their feet!`);
          return;
        }

        // Check if near ring corner
        const cornerDist = this.getNearestCornerDistance(f.position);
        if (cornerDist < 1.2) {
          f.state = 'top_rope_perched';
          f.stateTimer = 6.0;
          f.velocity.x = 0;
          f.velocity.z = 0;
          this.notify('smack', `${f.name} climbs to the TOP ROPE!`);
          return;
        }
      }

      // 6. RED SMACKDOWN FINISHER (Y / Triangle)
      if (input.redSmackPressed) {
        if (f.redSmackTokens > 0) {
          const distToOpp = this.getDistance(f, opp);
          if (distToOpp < 2.5 && opp.state !== 'ground_down') {
            this.executeRedSmackdownFinisher(f, opp);
            return;
          }
        }
      }

      // 7. GRAPPLE / TIE-UP (X / Square)
      if (input.grapplePressed) {
        if (f.playerIndex === 1) this.aiEngine.recordPlayerAction('grapple');
        const distToOpp = this.getDistance(f, opp);
        // Magnetic forward lunge toward opponent
        if (distToOpp < 3.2 && distToOpp > 1.2) {
          const faceAngle = Math.atan2(opp.position.x - f.position.x, opp.position.z - f.position.z);
          f.rotationY = faceAngle;
          f.position.x += Math.sin(faceAngle) * 0.4;
          f.position.z += Math.cos(faceAngle) * 0.4;
        }
        const updatedDist = this.getDistance(f, opp);
        if (updatedDist < 2.5) {
          if (opp.state === 'ground_down') {
            // Ground submission
            this.initiateSubmission(f, opp);
            return;
          } else {
            // Check opponent counter parry window!
            if (opp.counterWindowTimer > 0 && opp.lastCounterType === 'grapple') {
              this.executeCounterReversal(opp, f, 'grapple');
              return;
            }
            // Tie-up Grapple
            this.initiateGrapple(f, opp, input);
            return;
          }
        }
      }

      // 8. STRIKES (A / Cross)
      if (input.strikePressed) {
        if (f.playerIndex === 1) {
          this.aiEngine.recordPlayerAction(f.hasChair ? 'chair' : input.isRunning ? 'run' : 'strike');
        }
        if (f.hasChair) {
          // Chair Swing
          this.executeChairSwing(f, opp);
          return;
        }

        const distToOpp = this.getDistance(f, opp);
        // Magnetic forward step so strikes connect smoothly
        if (distToOpp < 3.2 && distToOpp > 1.1) {
          const faceAngle = Math.atan2(opp.position.x - f.position.x, opp.position.z - f.position.z);
          f.rotationY = faceAngle;
          f.position.x += Math.sin(faceAngle) * 0.35;
          f.position.z += Math.cos(faceAngle) * 0.35;
        }
        const updatedDist = this.getDistance(f, opp);
        // Check opponent strike counter!
        if (updatedDist < 2.5 && opp.counterWindowTimer > 0 && opp.lastCounterType === 'strike') {
          this.executeCounterReversal(opp, f, 'strike');
          return;
        }

        if (input.isRunning) {
          // Running Attack (Clothesline / Big Boot)
          this.executeRunningAttack(f, opp);
        } else {
          // Standing Strikes
          this.executeStrike(f, opp, input.strike);
        }
        return;
      }
    }

    // TOP ROPE PERCHED ACTIONS
    if (f.state === 'top_rope_perched') {
      if (input.strikePressed || input.grapplePressed) {
        this.executeTopRopeDive(f, opp);
        return;
      }
    }

    // IRISH WHIP REBOUND RUN
    if (f.state === 'irish_whip_run') {
      // Continue sprinting until hitting ring rope
      const ringEdge = 3.6;
      if (Math.abs(f.position.x) > ringEdge || Math.abs(f.position.z) > ringEdge) {
        // Rebound off ropes!
        if (this.scene) {
          this.scene.jiggleRopes(0);
        }
        f.state = 'irish_whip_rebound';
        f.stateTimer = 1.2;
        f.velocity.x *= -1;
        f.velocity.z *= -1;
        f.rotationY += Math.PI;
      }
    }

    // Apply movement velocities and ring boundaries
    f.position.x += f.velocity.x * delta;
    f.position.z += f.velocity.z * delta;

    // Body collision & pushback separation (wrestlers push against each other instead of passing through)
    const distToOpp = this.getDistance(f, opp);
    const minBodyDist = 1.15;
    const isGrappling = [
      'grapple_tieup', 'grapple_performing', 'grapple_receiving',
      'special_finisher_executing', 'special_finisher_victim',
      'pin_attempting', 'pin_suffering', 'ground_submission', 'submission_struggle'
    ].includes(f.state);

    if (distToOpp < minBodyDist && !isGrappling && distToOpp > 0.001) {
      const push = (minBodyDist - distToOpp) * 0.5;
      const pushAngle = Math.atan2(f.position.x - opp.position.x, f.position.z - opp.position.z);
      f.position.x += Math.sin(pushAngle) * push;
      f.position.z += Math.cos(pushAngle) * push;
    }

    // Ring Boundaries (-3.8 to 3.8 inside ring)
    const bounds = 3.8;
    f.position.x = Math.max(-bounds, Math.min(bounds, f.position.x));
    f.position.z = Math.max(-bounds, Math.min(bounds, f.position.z));
  }

  /**
   * Calculates exact 3D contact point between attacker's striking limb and defender's body
   */
  private getStrikeContactPoint(
    attacker: WrestlerFighter,
    defender: WrestlerFighter,
    heightOffset: number,
    lateralSpread: number = 0
  ): { x: number; y: number; z: number; normX: number; normZ: number } {
    const dirX = defender.position.x - attacker.position.x;
    const dirZ = defender.position.z - attacker.position.z;
    const distXZ = Math.hypot(dirX, dirZ) || 1;
    const normX = dirX / distXZ;
    const normZ = dirZ / distXZ;

    // Contact occurs on the surface of the defender's frame facing the incoming strike:
    const bodyRadius = 0.42;
    const contactX = (defender.position.x - normX * bodyRadius) - normZ * lateralSpread;
    const contactZ = (defender.position.z - normZ * bodyRadius) + normX * lateralSpread;
    const contactY = defender.position.y + heightOffset;

    return { x: contactX, y: contactY, z: contactZ, normX, normZ };
  }

  /**
   * Strike (Jab / Heavy Roundhouse / Stomp)
   */
  private executeStrike(attacker: WrestlerFighter, defender: WrestlerFighter, isHeavy: boolean) {
    attacker.state = isHeavy ? 'strike_heavy' : 'strike_light';
    attacker.stateTimer = isHeavy ? 0.45 : 0.28;
    attacker.velocity.x = 0;
    attacker.velocity.z = 0;

    const dist = this.getDistance(attacker, defender);
    if (dist < 2.5) {
      // Calculate exact 3D point of contact on the defender
      const contact = this.getStrikeContactPoint(
        attacker,
        defender,
        isHeavy ? 1.35 : 1.25,
        isHeavy ? 0.16 : 0.0
      );

      // 1. Check Block / Guard / Parry!
      if (defender.isBlocking || defender.state === 'block') {
        defender.state = 'block_parry';
        defender.stateTimer = 0.45;
        attacker.state = 'hit_stagger';
        attacker.stateTimer = 1.35; // Attacker is stunned! Open to counter-attack!

        audioEngine.playCounterSting();
        haptics.counterParry(defender.playerIndex - 1);
        this.addMomentum(defender, 18);
        if (this.scene) {
          // Spawn subtle 3D impact ring & deflected sparks at exact contact point
          this.scene.spawnStrikeImpact(
            contact.x,
            contact.y,
            contact.z,
            contact.normX,
            contact.normZ,
            isHeavy,
            true
          );
          this.scene.triggerCameraShake(0.28, 0.18);
        }
        this.notify('counter', `🛡️ BLOCKED & DEFLECTED! ${attacker.name} IS STUNNED! ATTACK NOW [J / K]!`);
        this.triggerCrowdChant('this_is_awesome');
        return;
      }

      // Check Punish Damage when attacking a stunned opponent!
      let damage = isHeavy ? 9 : 4;
      if (defender.state === 'hit_stagger') {
        damage = Math.floor(damage * 1.5);
        this.notify('critical', `💥 COUNTER-PUNISH! ${attacker.name} SHATTERS DEFENSE!`);
      }

      this.applyDamage(defender, damage, 'head');
      this.addMomentum(attacker, isHeavy ? 8 : 4);

      defender.state = isHeavy ? 'hit_knockdown' : 'hit_stagger';
      defender.stateTimer = isHeavy ? 1.6 : 0.45;

      audioEngine.playStrike(isHeavy);
      if (this.scene) {
        // Spawn subtle 3D oriented impact shockwave ring & directional contact sparks
        this.scene.spawnStrikeImpact(
          contact.x,
          contact.y,
          contact.z,
          contact.normX,
          contact.normZ,
          isHeavy,
          false
        );
        this.scene.triggerCameraShake(isHeavy ? 0.32 : 0.18, isHeavy ? 0.22 : 0.12);
        if (isHeavy) {
          audioEngine.playMatSlam(false);
          haptics.strikeHeavy(attacker.playerIndex - 1);
          this.scene.spawnImpactDust(defender.position.x, defender.position.z, 0.85);
        } else {
          haptics.strikeLight(attacker.playerIndex - 1);
        }
      }

      this.notify('smack', `${attacker.name} lands ${isHeavy ? 'DEVASTATING HEAVY HOOK' : 'RAPID JAB'}!`);
    } else {
      audioEngine.playStrike(false);
    }
  }

  /**
   * Running attack (Clothesline / Dropkick)
   */
  private executeRunningAttack(attacker: WrestlerFighter, defender: WrestlerFighter) {
    attacker.state = 'running_attack';
    attacker.stateTimer = 0.5;

    const dist = this.getDistance(attacker, defender);
    if (dist < 2.7) {
      const contact = this.getStrikeContactPoint(attacker, defender, 1.30, 0.1);

      if (defender.isBlocking || defender.state === 'block') {
        defender.state = 'block_parry';
        defender.stateTimer = 0.45;
        attacker.state = 'hit_stagger';
        attacker.stateTimer = 1.35;

        audioEngine.playCounterSting();
        haptics.counterParry(defender.playerIndex - 1);
        this.addMomentum(defender, 18);
        if (this.scene) {
          this.scene.spawnStrikeImpact(
            contact.x,
            contact.y,
            contact.z,
            contact.normX,
            contact.normZ,
            true,
            true
          );
          this.scene.triggerCameraShake(0.28, 0.2);
        }
        this.notify('counter', `🛡️ RUNNING ATTACK BLOCKED! ${attacker.name} BOUNCED OFF! HIT HIM NOW [J / K]!`);
        this.triggerCrowdChant('this_is_awesome');
        return;
      }

      this.applyDamage(defender, 12, 'torso');
      this.addMomentum(attacker, 12);

      defender.state = 'hit_knockdown';
      defender.stateTimer = 2.0;

      audioEngine.playStrike(true);
      audioEngine.playMatSlam(true);
      haptics.massiveSlam(attacker.playerIndex - 1);
      if (this.scene) {
        this.scene.spawnStrikeImpact(
          contact.x,
          contact.y,
          contact.z,
          contact.normX,
          contact.normZ,
          true,
          false
        );
        this.scene.triggerCameraShake(0.38, 0.28);
        this.scene.spawnImpactDust(defender.position.x, defender.position.z, 1.4);
      }

      this.notify('smack', `BAH GAWD! ${attacker.name} NAILS RUNNING CLOTHESLINE!`);
    }
  }

  /**
   * 4-Way Grapple System (Suplex / Powerbomb / DDT / Chokeslam)
   */
  private initiateGrapple(attacker: WrestlerFighter, defender: WrestlerFighter, input: InputState) {
    attacker.state = 'grapple_performing';
    attacker.stateTimer = 1.8;
    defender.state = 'grapple_receiving';
    defender.stateTimer = 1.8;

    // Face each other
    this.faceEachOther(attacker, defender);

    // Determine move based on input direction
    let moveName = 'Vertical Suplex';
    let targetPart: BodyPart = 'torso';
    let damage = 14;

    if (input.moveZ < -0.3) {
      moveName = 'Brainbuster Suplex';
      targetPart = 'head';
      damage = 18;
    } else if (input.moveZ > 0.3) {
      moveName = 'Spinebuster / Powerbomb';
      targetPart = 'torso';
      damage = 16;
    } else if (input.moveX < -0.3) {
      moveName = 'Snap DDT';
      targetPart = 'head';
      damage = 15;
    } else if (input.moveX > 0.3) {
      moveName = 'Overhead Belly-to-Belly';
      targetPart = 'legs';
      damage = 15;
    }

    attacker.activeMoveName = moveName;
    defender.activeMoveName = moveName;

    // Delayed impact trigger for animation sync (at 1100ms when hoisted victim strikes the canvas!)
    setTimeout(() => {
      if (attacker.state === 'grapple_performing') {
        this.applyDamage(defender, damage, targetPart);
        this.addMomentum(attacker, 15);
        audioEngine.playMatSlam(true);
        haptics.massiveSlam(attacker.playerIndex - 1);
        if (this.scene) {
          this.scene.triggerCameraShake(0.55, 0.38);
          this.scene.spawnImpactDust(defender.position.x, defender.position.z, 2.2);
          this.scene.spawnHitSparks(defender.position.x, defender.position.y + 0.3, defender.position.z, false);
        }
        this.notify('smack', `💥 BAH GAWD! ${attacker.name} HOISTED & SLAMMED ${defender.name} WITH ${moveName.toUpperCase()}!`);
      }
    }, 1100);
  }

  /**
   * RED SMACKDOWN FINISHER!
   * The signature show-stopping climax (Rock Bottom, Stunner, Tombstone, Angle Slam, 619, F-5)
   */
  private executeRedSmackdownFinisher(attacker: WrestlerFighter, defender: WrestlerFighter) {
    attacker.redSmackTokens = Math.max(0, attacker.redSmackTokens - 1);
    attacker.state = 'special_finisher_executing';
    attacker.stateTimer = 2.6;
    defender.state = 'special_finisher_victim';
    defender.stateTimer = 2.6;

    const profile = ROSTER.find(r => r.id === attacker.id) || this.p1Profile;
    attacker.activeMoveName = profile.finisherMove;
    defender.activeMoveName = profile.finisherMove;

    this.faceEachOther(attacker, defender);

    // Dynamic announcer callout
    const hypeCallout = 
      profile.id === 'rock' ? 'ROCK BOTTOM! ROCK BOTTOM! AS GOD IS MY WITNESS!' :
      profile.id === 'austin' ? 'STONE COLD STUNNER! HE HIT THE STUNNER!' :
      profile.id === 'undertaker' ? 'TOMBSTONE PILEDRIVER! HE SPIKED HIS HEAD!' :
      profile.id === 'angle' ? 'OLYMPIC SLAM! RIGHT INTO THE CANVAS!' :
      profile.id === 'reymysterio' ? 'THE 619! DIALED IT UP FOR THE PIN!' :
      profile.id === 'lesnar' ? 'F-5! HE TOOK HIM TO SUPLEX CITY!' :
      `RED SMACKDOWN: ${profile.finisherMove}!`;

    // Trigger full cinematic visual, audio, camera shake, and haptic surge
    if (this.scene) {
      this.scene.triggerFinisherCinematic();
      this.scene.spawnHitSparks(defender.position.x, defender.position.y + 0.8, defender.position.z, true);
    }
    this.notify('finisher', hypeCallout);

    setTimeout(() => {
      this.applyDamage(defender, 30, 'head');
      this.addMomentum(attacker, 25);
      defender.state = 'ground_down';
      defender.stateTimer = 3.5;
      if (this.scene) {
        this.scene.triggerCameraShake(0.65, 0.45);
        this.scene.spawnImpactDust(defender.position.x, defender.position.z, 2.8);
        this.scene.spawnHitSparks(defender.position.x, defender.position.y + 0.2, defender.position.z, true);
      }
      this.triggerCrowdChant('holy_shit', attacker.name);
    }, 1500);
  }

  /**
   * Reversals / Counter Parries (Iconic HCTP L2/R2 timing mechanics)
   */
  private executeCounterReversal(counterer: WrestlerFighter, victim: WrestlerFighter, type: 'strike' | 'grapple') {
    counterer.state = 'counter_parry';
    counterer.stateTimer = 0.8;
    victim.state = 'hit_stagger';
    victim.stateTimer = 1.0;

    audioEngine.playCounterSting();
    haptics.counterParry(counterer.playerIndex - 1);
    this.addMomentum(counterer, 18);

    const msg = type === 'strike' ? 'STRIKE REVERSAL!' : 'GRAPPLE COUNTER!';
    this.notify('counter', `${counterer.name}: ${msg}`);
    this.triggerCrowdChant('this_is_awesome');
  }

  /**
   * Irish Whip into ropes
   */
  private executeIrishWhip(attacker: WrestlerFighter, defender: WrestlerFighter) {
    attacker.state = 'irish_whip_throw';
    attacker.stateTimer = 0.6;
    defender.state = 'irish_whip_run';
    defender.stateTimer = 2.0;

    // Launch defender in facing direction
    const angle = attacker.rotationY;
    defender.velocity.x = Math.sin(angle) * 6.5;
    defender.velocity.z = Math.cos(angle) * 6.5;

    this.notify('smack', `${attacker.name} whips ${defender.name} into the ropes!`);
  }

  /**
   * Top-Rope Flying Diving Attack (Frog Splash / Flying Elbow)
   */
  private executeTopRopeDive(attacker: WrestlerFighter, defender: WrestlerFighter) {
    attacker.state = 'diving_attack';
    attacker.stateTimer = 1.0;

    // Leap toward opponent
    const targetX = defender.position.x;
    const targetZ = defender.position.z;
    attacker.velocity.x = (targetX - attacker.position.x) * 2.2;
    attacker.velocity.z = (targetZ - attacker.position.z) * 2.2;

    setTimeout(() => {
      this.applyDamage(defender, 30, 'torso');
      this.addMomentum(attacker, 18);
      defender.state = 'ground_down';
      defender.stateTimer = 3.0;
      attacker.state = 'ground_down';
      attacker.stateTimer = 1.5;

      audioEngine.playMatSlam(true);
      haptics.massiveSlam(attacker.playerIndex - 1);
      if (this.scene) {
        this.scene.triggerCameraShake(0.55, 0.35);
        this.scene.spawnImpactDust(defender.position.x, defender.position.z, 2.0);
        this.scene.spawnHitSparks(defender.position.x, defender.position.y + 0.3, defender.position.z, false);
      }
      this.notify('smack', `HOLY SMACK! ${attacker.name}: TOP-ROPE HIGH-FLYING DIVE!`);
      this.triggerCrowdChant('holy_shit', attacker.name);
    }, 550);
  }

  /**
   * Steel Chair Smash
   */
  private executeChairSwing(attacker: WrestlerFighter, defender: WrestlerFighter) {
    attacker.state = 'chair_swing';
    attacker.stateTimer = 0.8;

    const dist = this.getDistance(attacker, defender);
    if (dist < 2.5) {
      const contact = this.getStrikeContactPoint(attacker, defender, 1.45, 0.12);

      if (defender.isBlocking || defender.state === 'block') {
        defender.state = 'block_parry';
        defender.stateTimer = 0.45;
        attacker.state = 'hit_stagger';
        attacker.stateTimer = 1.35;

        audioEngine.playChairClang();
        audioEngine.playCounterSting();
        haptics.counterParry(defender.playerIndex - 1);
        this.addMomentum(defender, 20);
        if (this.scene) {
          this.scene.spawnStrikeImpact(
            contact.x,
            contact.y,
            contact.z,
            contact.normX,
            contact.normZ,
            true,
            true,
            true
          );
          this.scene.triggerCameraShake(0.35, 0.22);
        }
        this.notify('counter', `🛡️ STEEL CHAIR BLOCKED! ${attacker.name} LOST HIS GRIP! ATTACK NOW [J / K]!`);
        this.triggerCrowdChant('this_is_awesome');
        return;
      }

      this.applyDamage(defender, 28, 'head');
      this.addMomentum(attacker, 14);

      defender.state = 'hit_knockdown';
      defender.stateTimer = 2.4;

      audioEngine.playChairClang();
      haptics.chairShot(attacker.playerIndex - 1);
      if (this.scene) {
        this.scene.triggerCameraShake(0.5, 0.3);
        this.scene.spawnStrikeImpact(
          contact.x,
          contact.y,
          contact.z,
          contact.normX,
          contact.normZ,
          true,
          false,
          true
        );
        this.scene.spawnImpactDust(defender.position.x, defender.position.z, 1.3);
      }
      this.notify('critical', `CLANG! ${attacker.name} CRACKS STEEL CHAIR OVER THE SKULL!`);
      this.triggerCrowdChant('holy_shit', attacker.name);
    } else {
      audioEngine.playStrike(true);
    }
  }

  /**
   * Pinfall System (Classic 3-Count Referee Count & Kickout Meter)
   */
  private initiatePinfall(pinner: WrestlerFighter, victim: WrestlerFighter) {
    this.isPinActive = true;
    this.pinnerIndex = pinner.playerIndex;
    this.victimIndex = victim.playerIndex;
    this.pinCount = 0;
    this.pinTimer = 0;
    this.kickoutMeter = 10;

    pinner.state = 'pin_attempting';
    victim.state = 'pin_suffering';

    audioEngine.playRefMatSlap(0);
    this.notify('pin', `REFEREE SLIDES IN! 1... 2... 3 COUNT!`);
  }

  private updatePinfall(delta: number, p1Input: InputState, p2Input: InputState) {
    this.pinTimer += delta;
    const victimInput = this.victimIndex === 1 ? p1Input : p2Input;
    const victimFighter = this.victimIndex === 1 ? this.p1 : this.p2;

    // Victim button mashing to kick out!
    if (victimInput.strikePressed || victimInput.grapplePressed || victimInput.whipPinWeaponPressed) {
      let escapeBoost = 14;
      // Leg and torso damage makes escaping harder
      escapeBoost -= (victimFighter.bodyDamage.legs / 100) * 5;
      escapeBoost -= (victimFighter.bodyDamage.torso / 100) * 4;
      this.kickoutMeter += Math.max(3, escapeBoost);
      haptics.pinCountPulse(this.victimIndex - 1);
    }

    // CPU kickout behavior
    if (victimFighter.isCpu) {
      const difficultyFactor = this.settings.difficulty === 'legend' ? 1.5 : 1.0;
      this.kickoutMeter += delta * (40 * difficultyFactor - victimFighter.bodyDamage.head * 0.2);
    }

    // Check Kickout threshold
    if (this.kickoutMeter >= 100) {
      this.isPinActive = false;
      victimFighter.state = 'idle';
      const pinner = this.pinnerIndex === 1 ? this.p1 : this.p2;
      pinner.state = 'hit_stagger';
      pinner.stateTimer = 0.8;
      this.notify('pin', `${victimFighter.name} KICKS OUT AT THE LAST SECOND!`);
      audioEngine.playCrowdRoar(0.7);
      this.triggerCrowdChant('this_is_awesome');
      return;
    }

    // Referee Count Slaps every 1.1 seconds
    const countCheck = Math.floor(this.pinTimer / 1.1);
    if (countCheck > this.pinCount && this.pinCount < 3) {
      this.pinCount = countCheck;
      audioEngine.playRefMatSlap(this.pinCount);
      haptics.pinCountPulse();
      this.notify('pin', `COUNT: ${this.pinCount}!`);
      if (this.pinCount === 2) {
        audioEngine.playCrowdChant('kickout_gasp');
      }

      if (this.pinCount >= 3) {
        // THREE COUNT! WINNER!
        this.isPinActive = false;
        this.matchWinner = this.pinnerIndex;
        this.winMethod = 'pinfall';
        const winner = this.pinnerIndex === 1 ? this.p1 : this.p2;
        audioEngine.playRingBell();
        audioEngine.playCrowdRoar(1.0);
        this.notify('critical', `WINNER BY PINFALL: ${winner.name}!`);
      }
    }
  }

  /**
   * Ground Submissions (Ankle Lock, Sharpshooter, Camel Clutch)
   */
  private initiateSubmission(attacker: WrestlerFighter, defender: WrestlerFighter) {
    this.isSubmissionActive = true;
    this.submissionMeter = 15;
    this.pinnerIndex = attacker.playerIndex;
    this.victimIndex = defender.playerIndex;
    this.submissionHoldName = 'Ankle Lock Submission';

    attacker.state = 'ground_submission';
    defender.state = 'submission_struggle';

    this.notify('smack', `${attacker.name} locks in ${this.submissionHoldName}! TAP OUT METER ACTIVE!`);
  }

  private updateSubmission(delta: number, p1Input: InputState, p2Input: InputState) {
    const attackerInput = this.pinnerIndex === 1 ? p1Input : p2Input;
    const defenderInput = this.victimIndex === 1 ? p1Input : p2Input;
    const defender = this.victimIndex === 1 ? this.p1 : this.p2;

    // Attacker pushes submission pressure
    if (attackerInput.strikePressed || attackerInput.grapplePressed) {
      this.submissionMeter += 5;
    }
    // Defender struggles to reach ropes or break hold
    if (defenderInput.strikePressed || defenderInput.grapplePressed) {
      this.submissionMeter -= 6;
      haptics.submissionStruggle(this.victimIndex - 1);
    }

    // CPU adjustment
    if (defender.isCpu) {
      this.submissionMeter -= delta * 18;
    }

    // Check Tap Out (win) or Break (escape)
    if (this.submissionMeter >= 100) {
      this.isSubmissionActive = false;
      this.matchWinner = this.pinnerIndex;
      this.winMethod = 'submission';
      const winner = this.pinnerIndex === 1 ? this.p1 : this.p2;
      audioEngine.playRingBell();
      audioEngine.playCrowdRoar(1.0);
      this.notify('critical', `${defender.name} TAPS OUT! WINNER: ${winner.name}!`);
    } else if (this.submissionMeter <= 0) {
      this.isSubmissionActive = false;
      defender.state = 'idle';
      const attacker = this.pinnerIndex === 1 ? this.p1 : this.p2;
      attacker.state = 'hit_stagger';
      attacker.stateTimer = 0.8;
      this.notify('smack', `${defender.name} REACHED THE ROPES / BROKE THE HOLD!`);
    }
  }

  /**
   * Applies localized body damage & blood tracking
   */
  private applyDamage(fighter: WrestlerFighter, amount: number, part: BodyPart) {
    // Balanced health damage curve: Matches now feature sustained drama, kickouts and authentic back-and-forth action
    fighter.health = Math.max(0, fighter.health - amount * 0.28);
    fighter.bodyDamage[part] = Math.min(100, fighter.bodyDamage[part] + amount * 0.75);

    // Blood check for head damage > 75
    if (fighter.bodyDamage.head >= 75 && !fighter.isBleeding && this.settings.bloodEnabled) {
      fighter.isBleeding = true;
      this.notify('critical', `FIRST BLOOD! ${fighter.name} IS BUSTED WIDE OPEN!`);
      if (this.scene) {
        this.scene.addBloodDecal(new THREE.Vector3(fighter.position.x, 1.0, fighter.position.z));
      }
    }
  }

  /**
   * Momentum & Red Smackdown token accumulation
   */
  private addMomentum(fighter: WrestlerFighter, amount: number) {
    fighter.momentum = Math.min(100, fighter.momentum + amount);
    if (fighter.momentum >= 100) {
      fighter.momentum = 0;
      if (fighter.redSmackTokens < 3) {
        fighter.redSmackTokens++;
        this.notify('smack', `${fighter.name}: RED SMACKDOWN STORED! (Press Finisher)`);
        this.triggerCrowdChant('lets_go', fighter.name);
      }
    }
  }

  private onFighterStateEnd(f: WrestlerFighter, opp: WrestlerFighter) {
    if (['strike_light', 'strike_heavy', 'running_attack', 'chair_swing', 'taunt', 'counter_parry'].includes(f.state)) {
      f.state = 'idle';
    } else if (['grapple_performing', 'special_finisher_executing'].includes(f.state)) {
      f.state = 'idle';
      opp.state = 'ground_down';
      opp.stateTimer = 3.0;
    } else if (['grapple_receiving', 'special_finisher_victim', 'hit_knockdown'].includes(f.state)) {
      f.state = 'ground_down';
      f.stateTimer = 2.5;
    } else if (f.state === 'hit_stagger') {
      f.state = 'idle';
    } else if (f.state === 'ground_down') {
      f.state = 'idle';
    } else if (f.state === 'top_rope_perched') {
      f.state = 'idle';
    } else if (f.state === 'irish_whip_rebound') {
      f.state = 'idle';
    }
  }

  /**
   * Advanced Adaptive AI computation
   */
  private processCpuAI(cpu: WrestlerFighter, player: WrestlerFighter, delta: number): InputState {
    return this.aiEngine.computeDecision(cpu, player, this.settings, delta);
  }

  private notify(type: GameEventNotification['type'], title: string) {
    if (this.onNotification) {
      this.onNotification({
        id: Math.random().toString(36).substring(2, 9),
        title,
        type,
        timestamp: Date.now(),
      });
    }
  }

  private getDistance(a: WrestlerFighter, b: WrestlerFighter): number {
    return Math.hypot(a.position.x - b.position.x, a.position.z - b.position.z);
  }

  private getNearestCornerDistance(pos: { x: number; z: number }): number {
    const corners = [
      { x: -3.8, z: -3.8 },
      { x: 3.8, z: -3.8 },
      { x: 3.8, z: 3.8 },
      { x: -3.8, z: 3.8 },
    ];
    let minD = 999;
    corners.forEach(c => {
      const d = Math.hypot(pos.x - c.x, pos.z - c.z);
      if (d < minD) minD = d;
    });
    return minD;
  }

  private faceEachOther(a: WrestlerFighter, b: WrestlerFighter) {
    const angleA = Math.atan2(b.position.x - a.position.x, b.position.z - a.position.z);
    a.rotationY = angleA;
    b.rotationY = angleA + Math.PI;
  }

  /**
   * Dynamic crowd audio chant trigger with visual HUD banner state
   */
  public triggerCrowdChant(
    type: 'lets_go' | 'holy_shit' | 'this_is_awesome' | 'you_suck' | 'kickout_gasp' | 'boo_heel',
    wrestlerName?: string
  ) {
    if (this.chantTimer > 1.5 && type === 'lets_go') return; // Don't interrupt high-energy chants
    this.chantTimer = 4.2;

    const cleanName = wrestlerName ? wrestlerName.replace(/^The\s+/i, '').toUpperCase() : 'CHAMPION';
    if (type === 'lets_go') {
      this.activeCrowdChant = `🗣️ "LET'S GO ${cleanName}!" 👏 👏 👏👏👏`;
    } else if (type === 'holy_shit') {
      this.activeCrowdChant = `🔥 "HO-LY SH*T! HO-LY SH*T!" 🗣️`;
    } else if (type === 'this_is_awesome') {
      this.activeCrowdChant = `⭐ "THIS IS AWESOME!" 👏 👏 👏👏👏`;
    } else if (type === 'you_suck') {
      this.activeCrowdChant = `🎺 "YOU SUCK! YOU SUCK!" 📢`;
    } else if (type === 'kickout_gasp') {
      this.activeCrowdChant = `😱 *CROWD GASPS AT 2.9 COUNT!*`;
    } else if (type === 'boo_heel') {
      this.activeCrowdChant = `👎 "BOOOOOOO!"`;
    }

    audioEngine.playCrowdChant(type, wrestlerName);
  }
}

