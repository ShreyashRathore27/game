/**
 * Responsive Haptic Feedback Engine
 * Leverages the modern Gamepad API (dual-rumble actuator) and Navigator Vibration
 * to give visceral physical feedback on every punch, slam, chair clang, and Red Smackdown finisher.
 */

class HapticsEngine {
  private enabled: boolean = true;

  public setEnabled(val: boolean) {
    this.enabled = val;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Triggers dual-rumble on any connected gamepad with vibration support
   */
  private triggerRumble(
    durationMs: number,
    weakMagnitude: number,
    strongMagnitude: number,
    targetGamepadIndex: number = -1
  ) {
    if (!this.enabled) return;

    try {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      if (!gamepads) return;

      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (!gp) continue;
        if (targetGamepadIndex !== -1 && i !== targetGamepadIndex) continue;

        // Modern Chrome/Edge/Firefox vibration actuator
        const actuator = (gp as unknown as {
          vibrationActuator?: {
            playEffect: (
              type: string,
              params: {
                startDelay?: number;
                duration: number;
                weakMagnitude: number;
                strongMagnitude: number;
              }
            ) => Promise<string>;
          };
        }).vibrationActuator;

        if (actuator && typeof actuator.playEffect === 'function') {
          actuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: durationMs,
            weakMagnitude: Math.min(1, Math.max(0, weakMagnitude)),
            strongMagnitude: Math.min(1, Math.max(0, strongMagnitude)),
          }).catch(() => {
            // Actuator playEffect may be rejected if overlapping, safely ignore
          });
        }
      }
    } catch {
      // Gamepad rumble API not accessible in this context
    }

    // Touch / Mobile Fallback
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(Math.min(400, durationMs));
      }
    } catch {
      // ignore
    }
  }

  /**
   * Quick jab / light kick impact
   */
  public strikeLight(gamepadIndex?: number) {
    this.triggerRumble(80, 0.35, 0.15, gamepadIndex);
  }

  /**
   * Heavy punch / dropkick / running clothesline
   */
  public strikeHeavy(gamepadIndex?: number) {
    this.triggerRumble(160, 0.6, 0.45, gamepadIndex);
  }

  /**
   * Ring mat body slam / regular suplex
   */
  public matSlam(gamepadIndex?: number) {
    this.triggerRumble(280, 0.5, 0.85, gamepadIndex);
  }

  /**
   * Heavy powerbomb / chokeslam / top-rope frog splash
   */
  public massiveSlam(gamepadIndex?: number) {
    this.triggerRumble(400, 0.7, 1.0, gamepadIndex);
  }

  /**
   * Steel chair head shot - sharp, high intensity buzz
   */
  public chairShot(gamepadIndex?: number) {
    this.triggerRumble(240, 0.95, 0.7, gamepadIndex);
  }

  /**
   * RED SMACKDOWN FINISHER - maximum sensory surge
   */
  public redSmackFinisher(gamepadIndex?: number) {
    this.triggerRumble(600, 1.0, 1.0, gamepadIndex);
  }

  /**
   * Irish whip rope bounce
   */
  public ropeBounce(gamepadIndex?: number) {
    this.triggerRumble(110, 0.4, 0.2, gamepadIndex);
  }

  /**
   * Counter / Reversal parry pulse
   */
  public counterParry(gamepadIndex?: number) {
    this.triggerRumble(100, 0.75, 0.2, gamepadIndex);
  }

  /**
   * Pinfall referee count heartbeat
   */
  public pinCountPulse(gamepadIndex?: number) {
    this.triggerRumble(120, 0.25, 0.7, gamepadIndex);
  }

  /**
   * Submission struggle tension
   */
  public submissionStruggle(gamepadIndex?: number) {
    this.triggerRumble(90, 0.5, 0.4, gamepadIndex);
  }

  /**
   * Test rumble for controller configuration screen
   */
  public testRumble(gamepadIndex: number = 0) {
    this.triggerRumble(300, 0.8, 0.8, gamepadIndex);
  }
}

export const haptics = new HapticsEngine();
