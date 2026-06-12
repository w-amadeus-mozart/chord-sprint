// UI rendering, screen management.
// Imports: state, chords (for ROOTS/DIFFICULTY_POOLS), piano (for updatePianoColors).
// Does NOT import audio or midi — callers supply data, UI only renders.

import { state, SPRINT_DURATION } from './state.js';
import { ChordEngine } from './chords.js';
import { updatePianoColors } from './piano.js';

export function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
}

export const UI = {
  renderChord() {
    document.getElementById('chord-display').textContent = state.currentChord?.symbol ?? '—';
    UI.renderNoteIndicators(new Set(), state.currentChord?.pitchClasses ?? new Set());
  },

  renderHUD() {
    // Reset labels to Sprint defaults (in case we came from Survival)
    document.getElementById('hud-label-score').textContent = 'Score';
    document.getElementById('hud-label-timer').textContent = 'Time';
    document.getElementById('hud-label-chords').textContent = 'Chords';
    document.getElementById('nightmare-badge').style.display = 'none';

    document.getElementById('hud-score').textContent = state.score.toLocaleString();
    document.getElementById('hud-streak').textContent = state.streak;
    document.getElementById('hud-mult').textContent =
      '×' + (state.multiplier % 1 === 0 ? state.multiplier : state.multiplier.toFixed(1));
    document.getElementById('hud-chords').textContent = state.chordsCompleted;
    UI.renderStreakFire();
  },

  renderSurvivalHUD() {
    const sv = state.survival;
    document.getElementById('hud-score').textContent = sv.chordsSurvived;
    document.getElementById('hud-streak').textContent = state.streak;
    document.getElementById('hud-mult').textContent =
      '×' + (state.multiplier % 1 === 0 ? state.multiplier : state.multiplier.toFixed(1));
    document.getElementById('hud-chords').textContent = state.score.toLocaleString();
    UI.renderStreakFire();
  },

  renderTimer() {
    const t = state.timeLeft;
    const el = document.getElementById('hud-timer');
    const bar = document.getElementById('timer-bar');
    el.textContent = Math.ceil(t);
    const pct = (t / SPRINT_DURATION) * 100;
    bar.style.width = pct + '%';
    const cls = t > 20 ? 'green' : t > 8 ? 'amber' : 'red';
    bar.className = 'timer-bar ' + (cls !== 'green' ? cls : '');
    el.className = 'hud-val timer-val' + (cls !== 'green' ? ' ' + cls : '');
  },

  renderSurvivalTimer() {
    const sv = state.survival;
    const bar = document.getElementById('timer-bar');
    const timerEl = document.getElementById('hud-timer');
    const arena = document.getElementById('chord-arena');

    let pct, cls, displayText;

    if (state.waitingForRelease) {
      // Window hasn't started; show full bar and upcoming window duration
      pct = 100;
      cls = 'green';
      displayText = sv.windowSec.toFixed(1) + 's';
    } else {
      const remaining = Math.max(0, (sv.windowDeadline - performance.now()) / 1000);
      pct = sv.windowSec > 0 ? Math.max(0, (remaining / sv.windowSec) * 100) : 0;
      cls = pct > 50 ? 'green' : pct > 25 ? 'amber' : 'red';
      displayText = remaining.toFixed(1) + 's';
    }

    bar.style.width = pct + '%';
    bar.className = 'timer-bar' + (cls !== 'green' ? ' ' + cls : '');

    timerEl.textContent = displayText;
    timerEl.className = 'hud-val timer-val' + (cls !== 'green' ? ' ' + cls : '');

    // Pulse the chord arena when in the red zone — tension is the point
    arena.classList.toggle('survival-red', cls === 'red' && !state.waitingForRelease);
  },

  renderNoteIndicators(heldPCs, targetPCs) {
    const container = document.getElementById('note-indicators');
    container.innerHTML = '';
    for (const pc of targetPCs) {
      const pip = document.createElement('div');
      pip.className = 'note-pip';
      pip.textContent = ChordEngine.ROOTS[pc];
      if (heldPCs.has(pc)) pip.classList.add('held');
      container.appendChild(pip);
    }
    // Show wrong notes
    for (const pc of heldPCs) {
      if (!targetPCs.has(pc)) {
        const pip = document.createElement('div');
        pip.className = 'note-pip wrong';
        pip.textContent = ChordEngine.ROOTS[pc] + '✗';
        container.appendChild(pip);
      }
    }
    updatePianoColors(heldPCs, targetPCs);
  },

  // During release gate: show held keys in neutral grey — honest but non-distracting
  renderNoteIndicatorsReleasing(heldPCs) {
    const container = document.getElementById('note-indicators');
    container.innerHTML = '';
    for (const pc of heldPCs) {
      const pip = document.createElement('div');
      pip.className = 'note-pip releasing';
      pip.textContent = ChordEngine.ROOTS[pc];
      container.appendChild(pip);
    }
    document.querySelectorAll('.white-key, .black-key').forEach(k => {
      const pc = parseInt(k.dataset.note) % 12;
      k.classList.toggle('releasing', heldPCs.has(pc));
      k.classList.remove('active', 'wrong-active');
    });
  },

  renderStreakFire() {
    const el = document.getElementById('streak-fire');
    if (state.streak >= 20)      el.textContent = '🔥🔥🔥 ×3 INFERNO!';
    else if (state.streak >= 10) el.textContent = '🔥🔥 ×2 ON FIRE!';
    else if (state.streak >= 5)  el.textContent = '🔥 ×1.5 Streak!';
    else                          el.textContent = '';
  },

  // Visual-only match flash — caller is responsible for playing the audio chime
  flashMatch(points) {
    const disp = document.getElementById('chord-display');
    disp.classList.remove('match');
    void disp.offsetWidth; // reflow to restart animation
    disp.classList.add('match');
    setTimeout(() => disp.classList.remove('match'), 400);

    const arena = document.getElementById('chord-arena');
    const pop = document.createElement('div');
    pop.className = 'score-pop';
    pop.textContent = '+' + points;
    arena.appendChild(pop);
    setTimeout(() => pop.remove(), 700);
  },

  // modeConfig = null → Sprint; { variant, chordsSurvived, deathReason } → Survival
  renderResults(modeConfig = null) {
    const { attempts, difficulty } = state;

    // Shared stats computation
    const totalAttempts = attempts.length;
    const cleanCount = attempts.filter(a => a.clean).length;
    const accuracy = totalAttempts > 0 ? Math.round((cleanCount / totalAttempts) * 100) : 0;
    const avgResponse = totalAttempts > 0
      ? (attempts.reduce((s, a) => s + a.responseMs, 0) / totalAttempts / 1000).toFixed(2)
      : '—';
    let bestStreak = 0, run = 0;
    for (const a of attempts) { run = a.clean ? run + 1 : 0; bestStreak = Math.max(bestStreak, run); }

    const slowest = [...attempts].sort((a, b) => b.responseMs - a.responseMs)[0];
    const wsEl = document.getElementById('weak-spot');
    if (slowest) {
      wsEl.style.display = 'block';
      wsEl.innerHTML = `Your weak spot: <span>${slowest.symbol}</span> — ${(slowest.responseMs / 1000).toFixed(1)}s response`;
    } else {
      wsEl.style.display = 'none';
    }

    if (modeConfig) {
      // ── Survival results ──────────────────────────────────────────────
      const { variant, chordsSurvived, deathReason } = modeConfig;
      const diffLabel = ChordEngine.DIFFICULTY_POOLS[difficulty].label;
      const variantLabel = variant === 'nm' ? 'Nightmare' : 'Standard';

      document.getElementById('results-headline').textContent =
        `You survived ${chordsSurvived} chord${chordsSurvived !== 1 ? 's' : ''}`;

      const hsKey = `chordSprint_survival_${variant}_hs_${difficulty}`;
      const prevHS = parseInt(localStorage.getItem(hsKey) || '0', 10);
      const newHS = chordsSurvived > prevHS;
      if (newHS) localStorage.setItem(hsKey, chordsSurvived);
      document.getElementById('new-hs-badge').style.display = newHS ? 'inline-block' : 'none';

      // Subheader: variant/difficulty + death reason
      const subEl = document.getElementById('results-subheader');
      subEl.style.display = 'block';
      let deathMsg = '';
      if (deathReason) {
        deathMsg = deathReason.type === 'expiry'
          ? `Window expired on <strong>${deathReason.chord}</strong>`
          : `Wrong note on <strong>${deathReason.chord}</strong> — you played <strong>${deathReason.pitchClassName}</strong>`;
      }
      subEl.innerHTML =
        `<span class="mode-tag">${variantLabel} · ${diffLabel}</span>` +
        (deathMsg ? `<div class="death-reason">${deathMsg}</div>` : '');

      // Stats grid
      document.getElementById('stats-grid').innerHTML = [
        ['Survived',     chordsSurvived + ' chord' + (chordsSurvived !== 1 ? 's' : '')],
        ['Score',        state.score.toLocaleString()],
        ['Accuracy',     accuracy + '%'],
        ['Avg Response', avgResponse + 's'],
        ['Best Streak',  bestStreak],
        ['High Score',   Math.max(chordsSurvived, prevHS) + ' chords'],
      ].map(([l, v]) =>
        `<div class="stat-card"><div class="sc-label">${l}</div><div class="sc-val">${v}</div></div>`
      ).join('');

      // Per-chord table — 5 columns including Window
      document.querySelector('.per-chord-table thead tr').innerHTML =
        '<th>Chord</th><th>Response</th><th>Window</th><th>Quality</th><th>Points</th>';
      document.getElementById('per-chord-tbody').innerHTML = attempts.map(a => {
        const isSlowest = a === slowest;
        return `<tr${isSlowest ? ' class="slowest"' : ''}>
          <td><strong>${a.symbol}</strong></td>
          <td>${(a.responseMs / 1000).toFixed(2)}s</td>
          <td>${a.windowSec != null ? a.windowSec.toFixed(1) + 's' : '—'}</td>
          <td>${a.clean ? '<span class="clean-badge">✓ Clean</span>' : '<span class="dirty-badge">~ Corrected</span>'}</td>
          <td>+${a.points}</td>
        </tr>`;
      }).join('');

    } else {
      // ── Sprint results ────────────────────────────────────────────────
      const { score, chordsCompleted } = state;

      document.getElementById('results-headline').textContent = 'Round Over';
      document.getElementById('results-subheader').style.display = 'none';

      const hsKey = 'chordSprint_hs_' + difficulty;
      const prevHS = parseInt(localStorage.getItem(hsKey) || '0', 10);
      const newHS = score > prevHS;
      if (newHS) localStorage.setItem(hsKey, score);
      document.getElementById('new-hs-badge').style.display = newHS ? 'inline-block' : 'none';

      document.getElementById('stats-grid').innerHTML = [
        ['Final Score',  score.toLocaleString()],
        ['Chords Hit',   chordsCompleted],
        ['Accuracy',     accuracy + '%'],
        ['Avg Response', avgResponse + 's'],
        ['Best Streak',  bestStreak],
        ['High Score',   Math.max(score, prevHS).toLocaleString()],
      ].map(([l, v]) =>
        `<div class="stat-card"><div class="sc-label">${l}</div><div class="sc-val">${v}</div></div>`
      ).join('');

      // Per-chord table — 4 columns (Sprint standard)
      document.querySelector('.per-chord-table thead tr').innerHTML =
        '<th>Chord</th><th>Response</th><th>Quality</th><th>Points</th>';
      document.getElementById('per-chord-tbody').innerHTML = attempts.map(a => {
        const isSlowest = a === slowest;
        return `<tr${isSlowest ? ' class="slowest"' : ''}>
          <td><strong>${a.symbol}</strong></td>
          <td>${(a.responseMs / 1000).toFixed(2)}s</td>
          <td>${a.clean ? '<span class="clean-badge">✓ Clean</span>' : '<span class="dirty-badge">~ Corrected</span>'}</td>
          <td>+${a.points}</td>
        </tr>`;
      }).join('');
    }
  },

  renderHSPanel() {
    const hsList = document.getElementById('hs-list');
    if (state.mode === 'survival') {
      const variant = state.selectedVariant;
      hsList.innerHTML = ChordEngine.DIFFICULTY_POOLS.map((d, i) => {
        const hs = localStorage.getItem(`chordSprint_survival_${variant}_hs_${i}`);
        return `<div class="hs-row"><span>${d.label}</span><span class="hs-val">${hs ? hs + ' chords' : '—'}</span></div>`;
      }).join('');
    } else {
      hsList.innerHTML = ChordEngine.DIFFICULTY_POOLS.map((d, i) => {
        const hs = localStorage.getItem('chordSprint_hs_' + i);
        return `<div class="hs-row"><span>${d.label}</span><span class="hs-val">${hs ? parseInt(hs).toLocaleString() : '—'}</span></div>`;
      }).join('');
    }
  },

  renderMenu() {
    const grid = document.getElementById('difficulty-grid');
    grid.innerHTML = ChordEngine.DIFFICULTY_POOLS.map((d, i) =>
      `<button class="diff-btn${state.difficulty === i ? ' selected' : ''}" data-diff="${i}">
        <span class="diff-num">${i + 1}</span>
        <div class="diff-name">${d.label}</div>
        <div class="diff-desc">${d.desc}</div>
      </button>`
    ).join('');
    grid.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.difficulty = parseInt(btn.dataset.diff);
        grid.querySelectorAll('.diff-btn').forEach(b => b.classList.toggle('selected', b === btn));
        UI.renderHSPanel();
      });
    });

    // Sync mode/variant button selected state and variant selector visibility
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.mode === state.mode);
    });
    document.querySelectorAll('.variant-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.variant === state.selectedVariant);
    });
    document.getElementById('variant-selector').style.display =
      state.mode === 'survival' ? 'flex' : 'none';

    UI.renderHSPanel();
  },
};
