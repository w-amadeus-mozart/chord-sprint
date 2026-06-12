// Single authoritative game state — imported by all modules that need it.
// Only main.js and mode modules should mutate this object.

export const SPRINT_DURATION = 60; // seconds — change here for 30/90/120s variants

export const state = {
  screen: 'menu',         // 'menu' | 'game' | 'results'
  difficulty: 0,          // 0–5
  mode: 'sprint',         // 'sprint' | 'survival'
  selectedVariant: 'std', // 'std' | 'nm' — chosen on menu for survival
  // sprint/survival shared runtime
  score: 0,
  timeLeft: SPRINT_DURATION,
  streak: 0,
  multiplier: 1,
  chordsCompleted: 0,
  currentChord: null,
  pool: [],
  waitingForRelease: false, // gate: must release all notes before next chord
  attemptDirty: false,      // was any wrong pitch class pressed this attempt?
  attemptStart: 0,          // performance.now() when current chord was displayed
  timerInterval: null,
  timerStart: 0,
  pausedAt: 0,
  // per-round history
  attempts: [],             // { symbol, responseMs, clean, points } (+ windowSec for survival)
  // survival-specific runtime
  survival: {
    variant: 'std',
    windowDeadline: 0,    // performance.now() timestamp when current window expires
    windowSec: 0,         // duration of current chord's window
    chordsSurvived: 0,
    deathReason: null,    // { type: 'expiry'|'wrongNote', chord, pitchClassName? }
  },
};
