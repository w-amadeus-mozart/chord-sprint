// Falling Chords game mode — rhythm/timing mode.
// Chord tiles fall from the top of a canvas lane; the player must play each
// chord when it crosses the hit-zone line. Timing determines the rating.
//
// Implements the GameMode interface used by main.js:
//   start(chartId), onNotesChanged(), end()
// (No onTick / onChordMatched — the rAF loop drives everything.)

import { state } from '../state.js';
import { ChordEngine } from '../chords.js';
import { MidiInput } from '../midi.js';
import { GameAudio } from '../audio.js';
import { UI, showScreen } from '../ui.js';
import { LaneCanvas } from '../laneCanvas.js';
import { CHARTS } from '../charts.js';

// ── Timing constants ─────────────────────────────────────────────────────────
const APPROACH_MS   = 2200;  // must match laneCanvas.js
const PRE_ROLL_MS   = APPROACH_MS + 800; // 3 s: gives a clean 3-2-1 count-in
const HIT_PERFECT   = 80;    // ±ms for perfect
const HIT_GOOD      = 160;   // ±ms for good
const HIT_OK        = 300;   // ±ms for ok (outer window; beyond = miss)
const MISS_AFTER_MS = 300;   // ms past targetMs before a tile is marked missed

const SCORES = { perfect: 300, good: 150, ok: 50, miss: 0 };

// ── Module-level state ───────────────────────────────────────────────────────
let _rafId       = null;
let _songStart   = 0;   // performance.now() value that equals beat-1 target
let _tiles       = [];
let _chart       = null;
let _endQueued   = false;
let _resizeObs   = null;
let _hiddenAt    = 0;   // for page-visibility pause

// ── Page-visibility pause ────────────────────────────────────────────────────
function _onVisibilityChange() {
  if (state.screen !== 'game' || state.mode !== 'falling') return;
  if (document.hidden) {
    _hiddenAt = performance.now();
  } else if (_hiddenAt > 0) {
    // Shift song clock forward so elapsed time doesn't jump
    _songStart += performance.now() - _hiddenAt;
    _hiddenAt = 0;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function _elapsed() { return performance.now() - _songStart; }

function _beatMs(chart) { return 60000 / chart.bpm; }

function _buildTiles(chart) {
  const bms   = _beatMs(chart);
  const tiles = [];
  for (let i = 0; i < chart.events.length; i++) {
    const ev   = chart.events[i];
    const type = ChordEngine.CHORD_TYPES.find(t => t.name === ev.typeName);
    if (!type) continue;
    const pitchClasses = new Set(type.intervals.map(iv => (ev.rootPc + iv) % 12));
    tiles.push({
      id:           i,
      beat:         ev.beat,
      targetMs:     (ev.beat - 1) * bms,
      rootPc:       ev.rootPc,
      typeName:     ev.typeName,
      symbol:       ChordEngine.ROOTS[ev.rootPc] + type.symbol,
      pitchClasses,
      hit:          false,
      missed:       false,
      hitResult:    null,
      _lastCenterY: 0, // written by LaneCanvas.render each frame
    });
  }
  return tiles;
}

function _ratingFor(elapsed, tile) {
  const diff = Math.abs(elapsed - tile.targetMs);
  if (diff <= HIT_PERFECT) return 'perfect';
  if (diff <= HIT_GOOD)    return 'good';
  if (diff <= HIT_OK)      return 'ok';
  return null;
}

// Find the closest un-hit tile within the ok window
function _candidateTile(elapsed) {
  let best     = null;
  let bestDiff = Infinity;
  for (const tile of _tiles) {
    if (tile.hit || tile.missed) continue;
    const diff = Math.abs(elapsed - tile.targetMs);
    if (diff <= HIT_OK && diff < bestDiff) { best = tile; bestDiff = diff; }
  }
  return best;
}

function _checkMisses(elapsed) {
  for (const tile of _tiles) {
    if (tile.hit || tile.missed) continue;
    if (elapsed <= tile.targetMs + MISS_AFTER_MS) continue;

    tile.missed = true;
    state.streak         = 0;
    state.multiplier     = 1;
    state.falling.misses++;
    state.falling.results.push({ symbol: tile.symbol, result: 'miss', points: 0 });
    LaneCanvas.flashMiss();
    UI.renderFallingHUD();
  }
}

// ── rAF loop ─────────────────────────────────────────────────────────────────
function _animate() {
  if (state.screen !== 'game' || state.mode !== 'falling') return;

  const elapsed = _elapsed();

  _checkMisses(elapsed);

  // Detect song end: all tiles settled + past the last tile's deadline
  if (!_endQueued && _tiles.length > 0) {
    const allSettled  = _tiles.every(t => t.hit || t.missed);
    const lastTarget  = _tiles[_tiles.length - 1].targetMs;
    if (allSettled && elapsed > lastTarget + MISS_AFTER_MS + 600) {
      _endQueued = true;
      setTimeout(() => FallingChordsMode.end(), 600);
    }
  }

  // Song-progress bar (timer-bar repurposed)
  const songDurationMs = (_chart.totalBeats - 1) * _beatMs(_chart);
  const progress       = Math.min(1, Math.max(0, elapsed / songDurationMs));
  document.getElementById('timer-bar').style.width = (progress * 100) + '%';

  LaneCanvas.render(_tiles, elapsed);

  _rafId = requestAnimationFrame(_animate);
}

// ── Public API ───────────────────────────────────────────────────────────────
export const FallingChordsMode = {
  start(chartId) {
    // Reset all shared state
    state.mode            = 'falling';
    state.screen          = 'game';
    state.score           = 0;
    state.streak          = 0;
    state.multiplier      = 1;
    state.chordsCompleted = 0;
    state.waitingForRelease = false;
    state.attempts        = [];
    state.falling = {
      chartId,
      results:  [],
      perfects: 0,
      goods:    0,
      oks:      0,
      misses:   0,
      maxCombo: 0,
    };

    _chart     = CHARTS.find(c => c.id === chartId);
    _tiles     = _buildTiles(_chart);
    _endQueued = false;

    // Swap game-screen panels: hide chord-arena, show lane canvas
    document.getElementById('chord-arena').style.display   = 'none';
    const canvas = document.getElementById('lane-canvas');
    canvas.style.display = 'block';
    LaneCanvas.init(canvas);

    // Watch for element resize (window resize, orientation change)
    if (_resizeObs) _resizeObs.disconnect();
    _resizeObs = new ResizeObserver(() => LaneCanvas.resize());
    _resizeObs.observe(canvas);

    // Configure HUD labels for rhythm mode
    document.getElementById('hud-label-score').textContent  = 'Score';
    document.getElementById('hud-label-timer').textContent  = 'Combo';
    document.getElementById('hud-label-chords').textContent = 'Acc.';
    document.getElementById('nightmare-badge').style.display = 'none';
    // Timer bar → progress, always green
    document.getElementById('timer-bar').className    = 'timer-bar';
    document.getElementById('timer-bar').style.width  = '0%';

    // Repurpose hud-timer to show combo, hud-chords to show accuracy
    document.getElementById('hud-timer').textContent  = '0';
    document.getElementById('hud-timer').className    = 'hud-val timer-val';
    document.getElementById('hud-streak').textContent = '0';
    document.getElementById('hud-mult').textContent   = '×1';
    document.getElementById('hud-chords').textContent = '—';
    document.getElementById('hud-score').textContent  = '0';

    showScreen('game');

    // Kick off rAF; songStart is set PRE_ROLL_MS in the future so beat-1 fires
    // exactly PRE_ROLL_MS after the rAF begins (providing the count-in)
    _hiddenAt  = 0;
    _songStart = performance.now() + PRE_ROLL_MS;
    document.addEventListener('visibilitychange', _onVisibilityChange);
    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(_animate);
  },

  onNotesChanged() {
    if (state.screen !== 'game' || state.mode !== 'falling') return;

    const held    = MidiInput.getHeld();
    const heldPCs = ChordEngine.toPitchClasses(held);
    if (heldPCs.size === 0) return;

    const elapsed   = _elapsed();
    const candidate = _candidateTile(elapsed);
    if (!candidate) return;

    if (!ChordEngine.isMatch(heldPCs, candidate.pitchClasses)) return;

    const rating = _ratingFor(elapsed, candidate);
    if (!rating) return; // shouldn't happen

    // Register hit
    candidate.hit       = true;
    candidate.hitResult = rating;

    const points = Math.round(SCORES[rating] * state.multiplier);
    state.score           += points;
    state.streak++;
    state.chordsCompleted++;
    if (state.streak >= 20)      state.multiplier = 3;
    else if (state.streak >= 10) state.multiplier = 2;
    else if (state.streak >= 5)  state.multiplier = 1.5;
    else                          state.multiplier = 1;

    state.falling.maxCombo = Math.max(state.falling.maxCombo, state.streak);
    if (rating === 'perfect')      state.falling.perfects++;
    else if (rating === 'good')    state.falling.goods++;
    else                           state.falling.oks++;
    state.falling.results.push({ symbol: candidate.symbol, result: rating, points });

    LaneCanvas.flashHit(candidate._lastCenterY, candidate.typeName, rating);
    GameAudio.playSuccessChime(candidate.pitchClasses);

    UI.renderFallingHUD();
  },

  end() {
    if (_rafId) { cancelAnimationFrame(_rafId); _rafId = null; }
    if (_resizeObs) { _resizeObs.disconnect(); _resizeObs = null; }
    document.removeEventListener('visibilitychange', _onVisibilityChange);

    // Restore normal game-screen layout
    document.getElementById('chord-arena').style.display = '';
    document.getElementById('lane-canvas').style.display = 'none';
    LaneCanvas.cleanup();

    state.screen = 'results';
    UI.renderFallingResults(_chart);
    showScreen('results');
  },
};
