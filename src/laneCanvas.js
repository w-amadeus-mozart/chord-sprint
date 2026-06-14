// Canvas renderer for Falling Chords mode.
// Driven by requestAnimationFrame from fallingChords.js.

const APPROACH_MS = 2200;       // ms for a tile to travel from canvas top to hit zone
const HIT_ZONE_BOTTOM = 70;     // px from canvas bottom to hit-zone line center
const TILE_H = 54;
const TILE_PAD_X = 14;          // horizontal padding inside canvas edges
const FLASH_DURATION_MS = 380;

// Per-type accent colors (match CSS design palette)
const TYPE_COLORS = {
  'Major':            '#7c6fff',
  'Minor':            '#ff6f91',
  'Diminished':       '#94a3b8',
  'Augmented':        '#22d3ee',
  'Dominant 7th':     '#fbbf24',
  'Major 7th':        '#4ade80',
  'Minor 7th':        '#c084fc',
  'Half-dim (m7b5)':  '#64748b',
  'Diminished 7th':   '#475569',
  'Sus2':             '#fb923c',
  'Sus4':             '#f472b6',
};

const RATING_COLORS = {
  perfect: '#4ade80',
  good:    '#fbbf24',
  ok:      '#fb923c',
  miss:    '#f87171',
};

let _canvas = null;
let _ctx    = null;
let _dpr    = 1;
let _w      = 0; // logical width
let _h      = 0; // logical height
let _flashes = [];  // { centerY, color, label, startMs }
let _missFlashes = []; // { startMs }

export const LaneCanvas = {
  init(canvasEl) {
    _canvas  = canvasEl;
    _ctx     = canvasEl.getContext('2d');
    _flashes = [];
    _missFlashes = [];
    LaneCanvas.resize();
  },

  resize() {
    if (!_canvas) return;
    _dpr = window.devicePixelRatio || 1;
    const rect = _canvas.getBoundingClientRect();
    _w = rect.width;
    _h = rect.height;
    _canvas.width  = Math.round(_w * _dpr);
    _canvas.height = Math.round(_h * _dpr);
    _ctx.setTransform(1, 0, 0, 1, 0, 0);
    _ctx.scale(_dpr, _dpr);
  },

  flashHit(centerY, typeName, result) {
    _flashes.push({
      centerY,
      color: RATING_COLORS[result] || RATING_COLORS.perfect,
      label: result.toUpperCase(),
      startMs: performance.now(),
    });
  },

  flashMiss() {
    _missFlashes.push({ startMs: performance.now() });
  },

  // tiles: array of tile objects from fallingChords.js
  // songElapsedMs: performance.now() − songStartTime  (negative during count-in)
  render(tiles, songElapsedMs) {
    if (!_canvas || !_ctx) return;
    const w = _w;
    const h = _h;
    const hitZoneY = h - HIT_ZONE_BOTTOM;
    const now = performance.now();

    // ── Background ──────────────────────────────────────────────────────────
    _ctx.clearRect(0, 0, w, h);
    _ctx.fillStyle = '#16161f';
    _ctx.fillRect(0, 0, w, h);

    // Subtle horizontal beat-grid lines
    _ctx.strokeStyle = 'rgba(42,42,61,0.8)';
    _ctx.lineWidth = 1;
    const gridStep = 64;
    // Shift grid with song time so lines move downward (visual rhythm cue)
    const gridOffset = ((songElapsedMs / APPROACH_MS) * hitZoneY) % gridStep;
    for (let y = ((hitZoneY % gridStep) + gridStep - gridOffset) % gridStep; y < h; y += gridStep) {
      _ctx.beginPath();
      _ctx.moveTo(0, y);
      _ctx.lineTo(w, y);
      _ctx.stroke();
    }

    // ── Tiles ────────────────────────────────────────────────────────────────
    for (const tile of tiles) {
      const msUntilTarget = tile.targetMs - songElapsedMs;
      const progress = 1 - msUntilTarget / APPROACH_MS; // 0=top, 1=hitzone

      const centerY = progress * hitZoneY;
      const tileTop = centerY - TILE_H / 2;

      // Cache center for flash positioning (even if not drawn this frame)
      tile._lastCenterY = centerY;

      // Only draw tiles that are on-screen (with generous buffer)
      if (tileTop > h + 4 || tileTop + TILE_H < -4) continue;

      // Skip already-hit tiles (just the flash remains)
      if (tile.hit) continue;

      const color = TYPE_COLORS[tile.typeName] || '#7c6fff';
      const x     = TILE_PAD_X;
      const tw    = w - TILE_PAD_X * 2;

      _ctx.save();

      if (tile.missed) {
        // Missed tile: red tint, fading as it falls further
        const fallExtra = Math.max(0, -msUntilTarget - 0); // ms past hit zone
        _ctx.globalAlpha = Math.max(0, 0.45 - fallExtra / 600);
        _roundRect(_ctx, x, tileTop, tw, TILE_H, 10);
        _ctx.fillStyle = 'rgba(248,113,113,0.18)';
        _ctx.fill();
        _ctx.strokeStyle = '#f87171';
        _ctx.lineWidth = 1.5;
        _ctx.stroke();
        _ctx.fillStyle = '#f87171';
      } else {
        // Normal tile — fade in at the very top
        const fadeIn = Math.min(1, (APPROACH_MS - msUntilTarget) / 200);
        _ctx.globalAlpha = Math.max(0, fadeIn);

        _roundRect(_ctx, x, tileTop, tw, TILE_H, 10);
        _ctx.fillStyle = color + '1a'; // ~10% alpha fill
        _ctx.fill();
        _ctx.strokeStyle = color;
        _ctx.lineWidth = 2;
        _ctx.stroke();
        _ctx.fillStyle = '#e8e8f0';
      }

      // Chord label
      _ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
      _ctx.textAlign = 'center';
      _ctx.textBaseline = 'middle';
      _ctx.fillText(tile.symbol, x + tw / 2, tileTop + TILE_H / 2);

      _ctx.restore();
    }

    // ── Hit zone line ────────────────────────────────────────────────────────
    _ctx.save();
    const grad = _ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0,    'transparent');
    grad.addColorStop(0.1,  '#7c6fff');
    grad.addColorStop(0.9,  '#7c6fff');
    grad.addColorStop(1,    'transparent');
    _ctx.strokeStyle   = grad;
    _ctx.lineWidth     = 3;
    _ctx.shadowColor   = '#7c6fff';
    _ctx.shadowBlur    = 16;
    _ctx.beginPath();
    _ctx.moveTo(0, hitZoneY);
    _ctx.lineTo(w, hitZoneY);
    _ctx.stroke();
    _ctx.restore();

    // ── Count-in overlay ─────────────────────────────────────────────────────
    if (songElapsedMs < 0) {
      const secsLeft = -songElapsedMs / 1000;
      const num      = Math.ceil(secsLeft);
      if (num >= 1) {
        // Pulse: scale 1.2→1 each second
        const frac  = secsLeft - Math.floor(secsLeft); // 1 at start, 0 at next tick
        const scale = 1 + frac * 0.25;
        const alpha = Math.min(1, secsLeft < 0.4 ? secsLeft / 0.4 : 0.92);

        _ctx.save();
        _ctx.globalAlpha = alpha;
        _ctx.translate(w / 2, hitZoneY - 32);
        _ctx.scale(scale, scale);
        _ctx.fillStyle     = '#7c6fff';
        _ctx.font          = 'bold 56px "Segoe UI", system-ui, sans-serif';
        _ctx.textAlign     = 'center';
        _ctx.textBaseline  = 'middle';
        _ctx.shadowColor   = '#7c6fff';
        _ctx.shadowBlur    = 20;
        _ctx.fillText(String(num), 0, 0);
        _ctx.restore();
      }
    }

    // ── Hit flashes (rating text rises from hit zone) ─────────────────────
    _flashes = _flashes.filter(f => now - f.startMs < FLASH_DURATION_MS);
    for (const f of _flashes) {
      const t     = (now - f.startMs) / FLASH_DURATION_MS; // 0→1
      const alpha = 1 - t;
      const y     = f.centerY - t * 44; // rises upward
      _ctx.save();
      _ctx.globalAlpha   = alpha;
      _ctx.fillStyle     = f.color;
      _ctx.font          = `bold ${Math.round(22 - t * 4)}px "Segoe UI", system-ui, sans-serif`;
      _ctx.textAlign     = 'center';
      _ctx.textBaseline  = 'middle';
      _ctx.shadowColor   = f.color;
      _ctx.shadowBlur    = 8;
      _ctx.fillText(f.label, w / 2, y);
      _ctx.restore();
    }

    // ── Miss flash (red "MISS" near hit zone) ────────────────────────────
    _missFlashes = _missFlashes.filter(f => now - f.startMs < FLASH_DURATION_MS);
    for (const f of _missFlashes) {
      const t     = (now - f.startMs) / FLASH_DURATION_MS;
      const alpha = 1 - t;
      _ctx.save();
      _ctx.globalAlpha   = alpha;
      _ctx.fillStyle     = '#f87171';
      _ctx.font          = 'bold 22px "Segoe UI", system-ui, sans-serif';
      _ctx.textAlign     = 'center';
      _ctx.textBaseline  = 'middle';
      _ctx.shadowColor   = '#f87171';
      _ctx.shadowBlur    = 8;
      _ctx.fillText('MISS', w / 2, hitZoneY - t * 44);
      _ctx.restore();
    }
  },

  cleanup() {
    _canvas      = null;
    _ctx         = null;
    _flashes     = [];
    _missFlashes = [];
  },
};

function _roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x,     y,     x + r, y);
  ctx.closePath();
}
