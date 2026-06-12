// Survival game mode — "how long can you last?"
// Each chord has its own countdown window that shrinks as you survive longer.
// Implements the GameMode interface: start(), onTick(), onNotesChanged(), onChordMatched(), end()

import { state } from '../state.js';
import { ChordEngine } from '../chords.js';
import { MidiInput } from '../midi.js';
import { GameAudio } from '../audio.js';
import { UI, showScreen } from '../ui.js';

export const WINDOW_START     = 8.0;  // seconds for the very first chord
export const WINDOW_DECAY     = 0.15; // seconds shorter per chord
export const WINDOW_FLOOR_STD = 2.0;  // minimum window in Standard
export const WINDOW_FLOOR_NM  = 2.5;  // minimum window in Nightmare (more generous floor since wrong notes already kill)

function calcWindow(chordsSurvived, variant) {
  const floor = variant === 'nm' ? WINDOW_FLOOR_NM : WINDOW_FLOOR_STD;
  // N = 1-indexed chord number; chordsSurvived is count of already-matched chords
  const N = chordsSurvived + 1;
  return Math.max(floor, WINDOW_START - (N - 1) * WINDOW_DECAY);
}

export const SurvivalMode = {
  start(difficultyIndex, variant) {
    state.mode = 'survival';
    state.screen = 'game';
    state.difficulty = difficultyIndex;
    state.score = 0;
    state.streak = 0;
    state.multiplier = 1;
    state.chordsCompleted = 0;
    state.waitingForRelease = false;
    state.attemptDirty = false;
    state.attempts = [];
    state.pool = ChordEngine.buildPool(difficultyIndex);
    state.currentChord = ChordEngine.pickChord(state.pool, null);
    state.attemptStart = performance.now();
    state.timerStart = Date.now(); // kept for visibility-handler compatibility

    // First chord window starts immediately (no prior release gate)
    const windowSec = calcWindow(0, variant);
    state.survival = {
      variant,
      windowDeadline: performance.now() + windowSec * 1000,
      windowSec,
      chordsSurvived: 0,
      deathReason: null,
    };

    showScreen('game');

    // Update HUD labels for survival
    document.getElementById('hud-label-score').textContent = 'Survived';
    document.getElementById('hud-label-timer').textContent = 'Window';
    document.getElementById('hud-label-chords').textContent = 'Score';
    document.getElementById('nightmare-badge').style.display =
      variant === 'nm' ? 'block' : 'none';

    UI.renderChord();
    UI.renderSurvivalHUD();
    UI.renderSurvivalTimer();

    state.timerInterval = setInterval(SurvivalMode.onTick, 250);
  },

  onTick() {
    if (document.hidden) return;

    // During release gate the window hasn't started yet — just keep bar at full
    if (state.waitingForRelease) {
      UI.renderSurvivalTimer();
      return;
    }

    const now = performance.now();
    if (now >= state.survival.windowDeadline) {
      SurvivalMode.end({ type: 'expiry', chord: state.currentChord.symbol });
      return;
    }

    UI.renderSurvivalTimer();
    UI.renderSurvivalHUD();
  },

  onNotesChanged() {
    if (state.screen !== 'game') return;
    const held = MidiInput.getHeld();
    const heldPCs = ChordEngine.toPitchClasses(held);

    // Release gate: show held keys in neutral, wait for all-released
    if (state.waitingForRelease) {
      UI.renderNoteIndicatorsReleasing(heldPCs);
      if (MidiInput.allReleased()) {
        state.waitingForRelease = false;
        state.attemptDirty = false;
        // Window timer starts NOW — gate has cleared
        state.survival.windowDeadline = performance.now() + state.survival.windowSec * 1000;
        UI.renderNoteIndicators(new Set(), state.currentChord.pitchClasses);
        UI.renderSurvivalTimer();
      }
      return;
    }

    // Exact expiry check — a match arriving after the deadline doesn't count
    const now = performance.now();
    if (now >= state.survival.windowDeadline) {
      SurvivalMode.end({ type: 'expiry', chord: state.currentChord.symbol });
      return;
    }

    const target = state.currentChord.pitchClasses;

    // Nightmare: any wrong pitch class after the gate clears → instant death
    // (Notes held from the previous chord during the gate phase are excluded above via early return)
    if (state.survival.variant === 'nm') {
      for (const pc of heldPCs) {
        if (!target.has(pc)) {
          SurvivalMode.end({
            type: 'wrongNote',
            chord: state.currentChord.symbol,
            pitchClassName: ChordEngine.ROOTS[pc],
          });
          return;
        }
      }
    }

    // Standard: mark attempt dirty if any wrong pitch class pressed
    if (!state.attemptDirty) {
      for (const pc of heldPCs) {
        if (!target.has(pc)) { state.attemptDirty = true; break; }
      }
    }

    UI.renderNoteIndicators(heldPCs, target);

    if (ChordEngine.isMatch(heldPCs, target)) {
      // Re-check deadline at the exact moment of match (microsecond precision)
      if (performance.now() >= state.survival.windowDeadline) {
        SurvivalMode.end({ type: 'expiry', chord: state.currentChord.symbol });
        return;
      }
      SurvivalMode.onChordMatched();
    }
  },

  onChordMatched() {
    const now = performance.now();
    const responseMs = now - state.attemptStart;
    const clean = !state.attemptDirty;

    // Streak & multiplier — same rules as Sprint
    if (clean) {
      state.streak++;
      if (state.streak >= 20)      state.multiplier = 3;
      else if (state.streak >= 10) state.multiplier = 2;
      else if (state.streak >= 5)  state.multiplier = 1.5;
      else                          state.multiplier = 1;
    } else {
      state.streak = 0;
      state.multiplier = 1;
    }

    // Speed bonus scaled to current window: measures time used after gate cleared
    // windowUsedSec = windowSec - remaining, where remaining = (deadline - now) / 1000
    const windowUsedSec = state.survival.windowSec -
      Math.max(0, (state.survival.windowDeadline - now) / 1000);
    const speedRatio = windowUsedSec / state.survival.windowSec;
    const speedBonus = speedRatio < 0.25
      ? 100
      : Math.max(0, Math.round(100 * (1 - speedRatio) / 0.75));
    const points = Math.round((100 + speedBonus) * state.multiplier);

    state.score += points;
    state.survival.chordsSurvived++;

    state.attempts.push({
      symbol: state.currentChord.symbol,
      responseMs,
      clean,
      points,
      windowSec: state.survival.windowSec,
    });

    UI.flashMatch(points);
    GameAudio.playSuccessChime(state.currentChord.pitchClasses);

    // Queue next chord — set attemptStart NOW so reading time during release is counted
    const prev = state.currentChord.symbol;
    state.currentChord = ChordEngine.pickChord(state.pool, prev);
    state.attemptStart = performance.now();

    // Calculate window for next chord (N = chordsSurvived + 1 after increment)
    state.survival.windowSec = calcWindow(state.survival.chordsSurvived, state.survival.variant);
    // windowDeadline will be set precisely when the release gate clears

    state.waitingForRelease = true;
    state.attemptDirty = false;

    UI.renderChord();
    UI.renderSurvivalHUD();
    UI.renderSurvivalTimer(); // reset bar to full while gate is active
  },

  end(deathReason) {
    clearInterval(state.timerInterval);
    state.survival.deathReason = deathReason;
    state.screen = 'results';
    document.getElementById('chord-arena').classList.remove('survival-red');
    GameAudio.playDeathSound();
    UI.renderResults({
      variant: state.survival.variant,
      chordsSurvived: state.survival.chordsSurvived,
      deathReason,
    });
    showScreen('results');
  },
};
