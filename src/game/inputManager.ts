/**
 * Modern Gamepad & Keyboard Input Manager
 * Features Universal Reversal triggering (R2 / RT / Space), dedicated Sprint trigger,
 * Right Stick flick shortcuts (Taunt / Pin / Whip), and on-screen Virtual Action dispatch.
 */

export interface InputState {
  moveX: number; // -1 to 1
  moveZ: number; // -1 to 1
  isRunning: boolean;
  strike: boolean;
  strikePressed: boolean; // single-frame edge trigger
  grapple: boolean;
  grapplePressed: boolean;
  whipPinWeapon: boolean;
  whipPinWeaponPressed: boolean;
  redSmack: boolean;
  redSmackPressed: boolean;
  turnbucklePickup: boolean;
  turnbucklePickupPressed: boolean;
  taunt: boolean;
  tauntPressed: boolean;
  counterStrike: boolean;
  counterGrapple: boolean;
  universalCounter: boolean; // Universal reversal for strikes & grapples!
  block: boolean; // Dedicated Block / Guard stance
  blockPressed: boolean;
  pausePressed: boolean;
}

export type ControllerType = 'xbox' | 'playstation' | 'switch' | 'keyboard' | 'generic';

export interface ConnectedGamepadInfo {
  index: number;
  id: string;
  type: ControllerType;
  hasVibration: boolean;
}

class InputManager {
  private keyState: Record<string, boolean> = {};
  private prevKeyState: Record<string, boolean> = {};
  private prevGamepadButtons: Record<number, boolean[]> = {};
  private connectedGamepads: ConnectedGamepadInfo[] = [];

  // Virtual inputs triggered via on-screen buttons
  private virtualActionQueue: string[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
          e.preventDefault();
        }
        this.keyState[e.code] = true;
        this.keyState[e.key.toLowerCase()] = true;
      });

      window.addEventListener('keyup', (e) => {
        this.keyState[e.code] = false;
        this.keyState[e.key.toLowerCase()] = false;
      });

      window.addEventListener('gamepadconnected', () => {
        this.updateConnectedGamepads();
      });

      window.addEventListener('gamepaddisconnected', () => {
        this.updateConnectedGamepads();
      });

      this.updateConnectedGamepads();
    }
  }

  public updateConnectedGamepads() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const gps = navigator.getGamepads();
    const list: ConnectedGamepadInfo[] = [];

    for (let i = 0; i < gps.length; i++) {
      const gp = gps[i];
      if (!gp) continue;
      const idLower = (gp.id || '').toLowerCase();
      let type: ControllerType = 'xbox';

      if (idLower.includes('dual') || idLower.includes('playstation') || idLower.includes('ps4') || idLower.includes('ps5') || idLower.includes('sony')) {
        type = 'playstation';
      } else if (idLower.includes('nintendo') || idLower.includes('switch') || idLower.includes('joy-con')) {
        type = 'switch';
      } else if (idLower.includes('xbox') || idLower.includes('x-box') || idLower.includes('microsoft')) {
        type = 'xbox';
      } else {
        type = 'generic';
      }

      const hasVibration = !!((gp as unknown as { vibrationActuator?: unknown }).vibrationActuator);

      list.push({
        index: i,
        id: gp.id,
        type,
        hasVibration,
      });
    }

    this.connectedGamepads = list;
  }

  public getConnectedGamepads(): ConnectedGamepadInfo[] {
    return this.connectedGamepads;
  }

  public getPrimaryControllerType(): ControllerType {
    if (this.connectedGamepads.length > 0) {
      return this.connectedGamepads[0].type;
    }
    return 'keyboard';
  }

  /**
   * Triggers an on-screen virtual button action (Touch / Click)
   */
  public triggerVirtualAction(action: string) {
    this.virtualActionQueue.push(action);
  }

  /**
   * Reads input for player 1 or player 2
   */
  public poll(playerIndex: 1 | 2 = 1, forceKeyboardOnly: boolean = false): InputState {
    const state: InputState = {
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

    const targetGamepadIndex = playerIndex === 1 ? 0 : 1;
    let gp: Gamepad | null = null;

    if (!forceKeyboardOnly && typeof navigator !== 'undefined' && navigator.getGamepads) {
      const gps = navigator.getGamepads();
      if (gps && gps[targetGamepadIndex]) {
        gp = gps[targetGamepadIndex];
      }
    }

    // 1. Gamepad Input
    if (gp && gp.connected) {
      const deadzone = 0.18;
      let stickX = gp.axes[0] || 0;
      let stickZ = gp.axes[1] || 0;

      if (Math.abs(stickX) < deadzone) stickX = 0;
      if (Math.abs(stickZ) < deadzone) stickZ = 0;

      // D-Pad fallback
      if (gp.buttons[14]?.pressed) stickX = -1;
      if (gp.buttons[15]?.pressed) stickX = 1;
      if (gp.buttons[12]?.pressed) stickZ = -1;
      if (gp.buttons[13]?.pressed) stickZ = 1;

      state.moveX = stickX;
      state.moveZ = stickZ;

      // Sprint: Holding LT (button 6) or L3 (button 10) or pushing stick hard
      state.isRunning = !!gp.buttons[6]?.pressed || !!gp.buttons[10]?.pressed || Math.hypot(stickX, stickZ) > 0.85;

      const prevBtns = this.prevGamepadButtons[targetGamepadIndex] || [];
      const currentBtns = gp.buttons.map(b => b.pressed);
      const isPressedNow = (btnIdx: number) => currentBtns[btnIdx] && !prevBtns[btnIdx];

      // Standard Gamepad Map:
      // 0: A / Cross -> Strike
      // 1: B / Circle -> Whip / Pin / Weapon
      // 2: X / Square -> Grapple
      // 3: Y / Triangle -> Red Smackdown Finisher
      // 4: LB / L1 -> Climb / Pick Up
      // 5: RB / R1 -> Taunt
      // 6: LT / L2 -> Run / Legacy Strike Counter
      // 7: RT / R2 -> Universal Counter / Reversal!
      // 8: Back / Share
      // 9: Start / Options
      state.strike = !!gp.buttons[0]?.pressed;
      state.strikePressed = isPressedNow(0);

      state.whipPinWeapon = !!gp.buttons[1]?.pressed;
      state.whipPinWeaponPressed = isPressedNow(1);

      state.grapple = !!gp.buttons[2]?.pressed;
      state.grapplePressed = isPressedNow(2);

      state.redSmack = !!gp.buttons[3]?.pressed;
      state.redSmackPressed = isPressedNow(3);

      state.turnbucklePickup = !!gp.buttons[4]?.pressed;
      state.turnbucklePickupPressed = isPressedNow(4);

      state.taunt = !!gp.buttons[5]?.pressed;
      state.tauntPressed = isPressedNow(5);

      // Universal Reversal & Block / Guard (RT / R2 or LT / L2)
      state.counterStrike = !!gp.buttons[6]?.pressed || !!gp.buttons[7]?.pressed;
      state.counterGrapple = !!gp.buttons[7]?.pressed || !!gp.buttons[6]?.pressed;
      state.universalCounter = !!gp.buttons[7]?.pressed || isPressedNow(7) || !!gp.buttons[6]?.pressed;
      state.block = !!gp.buttons[7]?.pressed || !!gp.buttons[6]?.pressed;
      state.blockPressed = isPressedNow(7) || isPressedNow(6);

      // Right Stick quick flick actions
      const rightStickY = gp.axes[3] || 0;
      if (rightStickY < -0.7) {
        state.tauntPressed = true; // Flick Up -> Taunt
      } else if (rightStickY > 0.7) {
        state.whipPinWeaponPressed = true; // Flick Down -> Pin!
      }

      state.pausePressed = isPressedNow(9) || isPressedNow(8);
      this.prevGamepadButtons[targetGamepadIndex] = currentBtns;
    }

    // 2. Keyboard Input
    const isKeyDown = (code: string) => !!this.keyState[code] || !!this.keyState[code.toLowerCase()];
    const isKeyPressedNow = (code: string) => {
      const cur = isKeyDown(code);
      const prev = !!this.prevKeyState[code] || !!this.prevKeyState[code.toLowerCase()];
      return cur && !prev;
    };

    if (playerIndex === 1) {
      let kx = 0;
      let kz = 0;
      if (isKeyDown('KeyA') || isKeyDown('a') || isKeyDown('ArrowLeft')) kx -= 1;
      if (isKeyDown('KeyD') || isKeyDown('d') || isKeyDown('ArrowRight')) kx += 1;
      if (isKeyDown('KeyW') || isKeyDown('w') || isKeyDown('ArrowUp')) kz -= 1;
      if (isKeyDown('KeyS') || isKeyDown('s') || isKeyDown('ArrowDown')) kz += 1;

      if (kx !== 0 || kz !== 0) {
        state.moveX = kx;
        state.moveZ = kz;
      }

      // Run / Sprint: Shift or CapsLock
      if (isKeyDown('ShiftLeft') || isKeyDown('ShiftRight') || isKeyDown('CapsLock')) {
        state.isRunning = true;
      }

      // Strike: J OR Z OR Numpad1
      if (isKeyDown('KeyJ') || isKeyDown('j') || isKeyDown('KeyZ') || isKeyDown('z') || isKeyDown('Numpad1')) {
        state.strike = true;
      }
      if (isKeyPressedNow('KeyJ') || isKeyPressedNow('j') || isKeyPressedNow('KeyZ') || isKeyPressedNow('z') || isKeyPressedNow('Numpad1')) {
        state.strikePressed = true;
      }

      // Grapple: K OR X OR Numpad2
      if (isKeyDown('KeyK') || isKeyDown('k') || isKeyDown('KeyX') || isKeyDown('x') || isKeyDown('Numpad2')) {
        state.grapple = true;
      }
      if (isKeyPressedNow('KeyK') || isKeyPressedNow('k') || isKeyPressedNow('KeyX') || isKeyPressedNow('x') || isKeyPressedNow('Numpad2')) {
        state.grapplePressed = true;
      }

      // Irish Whip / Pin / Chair Weapon: L OR C OR Numpad3
      if (isKeyDown('KeyL') || isKeyDown('l') || isKeyDown('KeyC') || isKeyDown('c') || isKeyDown('Numpad3')) {
        state.whipPinWeapon = true;
      }
      if (isKeyPressedNow('KeyL') || isKeyPressedNow('l') || isKeyPressedNow('KeyC') || isKeyPressedNow('c') || isKeyPressedNow('Numpad3')) {
        state.whipPinWeaponPressed = true;
      }

      // Red Smackdown Finisher: I OR V OR Numpad0
      if (isKeyDown('KeyI') || isKeyDown('i') || isKeyDown('KeyV') || isKeyDown('v') || isKeyDown('Numpad0')) {
        state.redSmack = true;
      }
      if (isKeyPressedNow('KeyI') || isKeyPressedNow('i') || isKeyPressedNow('KeyV') || isKeyPressedNow('v') || isKeyPressedNow('Numpad0')) {
        state.redSmackPressed = true;
      }

      // Climb Turnbuckle / Top-Rope Dive: U OR F
      if (isKeyDown('KeyU') || isKeyDown('u') || isKeyDown('KeyF') || isKeyDown('f')) {
        state.turnbucklePickup = true;
      }
      if (isKeyPressedNow('KeyU') || isKeyPressedNow('u') || isKeyPressedNow('KeyF') || isKeyPressedNow('f')) {
        state.turnbucklePickupPressed = true;
      }

      // Taunt: O OR T OR Numpad5
      if (isKeyDown('KeyO') || isKeyDown('o') || isKeyDown('KeyT') || isKeyDown('t') || isKeyDown('Numpad5')) {
        state.taunt = true;
      }
      if (isKeyPressedNow('KeyO') || isKeyPressedNow('o') || isKeyPressedNow('KeyT') || isKeyPressedNow('t') || isKeyPressedNow('Numpad5')) {
        state.tauntPressed = true;
      }

      // Universal Reversal / Block / Guard: B OR Space OR E OR Q OR R
      const isDefending = isKeyDown('KeyB') || isKeyDown('b') || isKeyDown('Space') || isKeyDown('KeyE') || isKeyDown('e') || isKeyDown('KeyQ') || isKeyDown('q') || isKeyDown('KeyR') || isKeyDown('r');
      if (isDefending) {
        state.universalCounter = true;
        state.counterStrike = true;
        state.counterGrapple = true;
        state.block = true;
      }
      if (isKeyPressedNow('KeyB') || isKeyPressedNow('b') || isKeyPressedNow('Space') || isKeyPressedNow('KeyE') || isKeyPressedNow('e') || isKeyPressedNow('KeyQ') || isKeyPressedNow('q') || isKeyPressedNow('KeyR') || isKeyPressedNow('r')) {
        state.blockPressed = true;
      }

      if (isKeyPressedNow('Escape') || isKeyPressedNow('KeyP') || isKeyPressedNow('p')) {
        state.pausePressed = true;
      }
    }

    // 3. Process Virtual Actions (from On-Screen Buttons)
    while (this.virtualActionQueue.length > 0) {
      const vAction = this.virtualActionQueue.shift();
      if (vAction === 'strike') {
        state.strike = true;
        state.strikePressed = true;
      } else if (vAction === 'grapple') {
        state.grapple = true;
        state.grapplePressed = true;
      } else if (vAction === 'whipPin') {
        state.whipPinWeapon = true;
        state.whipPinWeaponPressed = true;
      } else if (vAction === 'redSmack') {
        state.redSmack = true;
        state.redSmackPressed = true;
      } else if (vAction === 'counter' || vAction === 'block') {
        state.universalCounter = true;
        state.counterStrike = true;
        state.counterGrapple = true;
        state.block = true;
        state.blockPressed = true;
      } else if (vAction === 'taunt') {
        state.taunt = true;
        state.tauntPressed = true;
      } else if (vAction === 'climb') {
        state.turnbucklePickup = true;
        state.turnbucklePickupPressed = true;
      }
    }

    this.prevKeyState = { ...this.keyState };
    return state;
  }

  public getButtonPrompt(action: string, type: ControllerType): { label: string; key: string } {
    switch (type) {
      case 'playstation':
        switch (action) {
          case 'strike': return { label: 'Strike (3-Hit Combo)', key: '✕' };
          case 'grapple': return { label: 'Grapple / Tie-Up', key: '□' };
          case 'whipPin': return { label: 'Irish Whip / Pin / Chair', key: '○' };
          case 'redSmack': return { label: 'RED SMACKDOWN FINISHER', key: '△' };
          case 'turnbuckle': return { label: 'Climb / Pick Up', key: 'L1' };
          case 'taunt': return { label: 'Taunt (Momentum)', key: 'R1' };
          case 'counter': return { label: 'Universal Reversal', key: 'R2' };
          case 'run': return { label: 'Sprint', key: 'L2' };
          default: return { label: action, key: '✕' };
        }
      case 'xbox':
      case 'generic':
        switch (action) {
          case 'strike': return { label: 'Strike (3-Hit Combo)', key: 'A' };
          case 'grapple': return { label: 'Grapple / Tie-Up', key: 'X' };
          case 'whipPin': return { label: 'Irish Whip / Pin / Chair', key: 'B' };
          case 'redSmack': return { label: 'RED SMACKDOWN FINISHER', key: 'Y' };
          case 'turnbuckle': return { label: 'Climb / Pick Up', key: 'LB' };
          case 'taunt': return { label: 'Taunt (Momentum)', key: 'RB' };
          case 'counter':
          case 'block': return { label: 'Block / Parry / Reversal', key: 'RT / LT' };
          case 'run': return { label: 'Sprint', key: 'LT' };
          default: return { label: action, key: 'A' };
        }
      case 'switch':
        switch (action) {
          case 'strike': return { label: 'Strike (3-Hit Combo)', key: 'B' };
          case 'grapple': return { label: 'Grapple / Tie-Up', key: 'Y' };
          case 'whipPin': return { label: 'Irish Whip / Pin / Chair', key: 'A' };
          case 'redSmack': return { label: 'RED SMACKDOWN FINISHER', key: 'X' };
          case 'turnbuckle': return { label: 'Climb / Pick Up', key: 'L' };
          case 'taunt': return { label: 'Taunt (Momentum)', key: 'R' };
          case 'counter':
          case 'block': return { label: 'Block / Parry / Reversal', key: 'ZR / ZL' };
          case 'run': return { label: 'Sprint', key: 'ZL' };
          default: return { label: action, key: 'B' };
        }
      case 'keyboard':
      default:
        switch (action) {
          case 'strike': return { label: 'Strike (3-Hit Combo)', key: 'J / Z' };
          case 'grapple': return { label: 'Grapple / Tie-Up', key: 'K / X' };
          case 'whipPin': return { label: 'Irish Whip / Pin / Chair', key: 'L / C' };
          case 'redSmack': return { label: 'RED SMACKDOWN FINISHER', key: 'I / V' };
          case 'turnbuckle': return { label: 'Climb / Pick Up', key: 'U / F' };
          case 'taunt': return { label: 'Taunt (Momentum)', key: 'O / T' };
          case 'counter':
          case 'block': return { label: 'Block / Guard / Reversal', key: 'B / Space / E' };
          case 'run': return { label: 'Sprint', key: 'Shift' };
          default: return { label: action, key: 'J / Z' };
        }
    }
  }
}

export const inputManager = new InputManager();
