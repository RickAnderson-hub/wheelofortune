(function(){
  const TAU = Math.PI * 2;
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W/2, cy = H/2 - 10;
  const outerR = 220;
  const innerR = 40;
  const colors = ['#ff4d4d','#29cc7a','#4d7dff','#ffd233'];

  // Buttons
  const spinBtn = document.getElementById('spinBtn');
  const resetBtn = document.getElementById('resetBtn');

  // State (persisted)
  const defaultLabels = Array.from({length: 12}, (_, i) => `S${i+1}`);
  let labels;            // array of strings
  let rotation;          // radians
  let anim = null;       // { t0, d, start, end }
  let winnerIndex = null;

  function sanitizeLabels(arr){
    if (!Array.isArray(arr)) return null;
    const out = [];
    for (const v of arr) {
      if (typeof v !== 'string') continue;
      const t = v.trim();
      if (t.length === 0) continue;
      out.push(t);
      if (out.length >= 64) break;
    }
    return out;
  }

  function parseQueryLabels(){
    try {
      const params = new URLSearchParams(location.search);
      if (!params.has('labels') && !params.has('reset')) return null;
      if (params.has('labels')) {
        const raw = params.get('labels');
        let arr;
        // Support JSON array or comma-separated
        if (raw && raw.trim().startsWith('[')) {
          arr = JSON.parse(raw);
        } else {
          arr = (raw || '').split(',');
        }
        const cleaned = sanitizeLabels(arr);
        return { labels: cleaned ?? [] , rotation: 0 };
      }
      // reset present without labels => force defaults
      return { labels: defaultLabels.slice(), rotation: 0 };
    } catch { return null; }
  }

  function loadState(){
    try {
      const raw = localStorage.getItem('wof.state');
      if (!raw) return null;
      const obj = JSON.parse(raw);
      const arr = Array.isArray(obj.labels) ? obj.labels.filter(v => typeof v === 'string').slice(0, 64) : null;
      const rot = typeof obj.rotation === 'number' && isFinite(obj.rotation) ? obj.rotation : 0;
      if (!arr || arr.length === 0) return null;
      return { labels: arr, rotation: rot };
    } catch { return null; }
  }

  function saveState(){
    try { localStorage.setItem('wof.state', JSON.stringify({ labels, rotation })); } catch {}
  }

  // Initialize from query, then storage, then defaults
  (function initState(){
    const fromQuery = parseQueryLabels();
    if (fromQuery) {
      labels = fromQuery.labels;
      rotation = fromQuery.rotation;
      // If query provided labels but empty, allow empty and disable spin
      saveState();
      return;
    }
    const restored = loadState();
    labels = restored ? restored.labels : defaultLabels.slice();
    rotation = restored ? restored.rotation : 0;
  })();

  function updateControls(){
    spinBtn.disabled = !!anim || labels.length === 0;
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    const n = labels.length;
    const segAngle = TAU / Math.max(1, n);

    // Rim
    ctx.beginPath();
    ctx.arc(0,0, outerR+8, 0, TAU);
    ctx.fillStyle = '#caa96c'; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#7b6331'; ctx.stroke();

    for (let i=0;i<n;i++){
      const a0 = i * segAngle - TAU/4;
      const a1 = (i+1) * segAngle - TAU/4;

      // wedge
      ctx.beginPath();
      ctx.arc(0,0, innerR, a0, a1);
      ctx.arc(0,0, outerR, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length]; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();

      // label
      const mid = (a0 + a1)/2;
      const rx = Math.cos(mid) * (innerR + outerR)/2;
      const ry = Math.sin(mid) * (innerR + outerR)/2;
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(mid + Math.PI/2);
      ctx.fillStyle = '#111';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], 0, 0);
      ctx.restore();
    }

    // Hub
    ctx.beginPath();
    ctx.arc(0,0, innerR-8, 0, TAU);
    ctx.fillStyle = '#e74c3c'; ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = '#a22619'; ctx.stroke();

    ctx.restore();

    // Pointer (fixed at top)
    ctx.beginPath();
    const tipX = cx, tipY = cy - outerR - 6;
    ctx.moveTo(tipX - 18, tipY - 24);
    ctx.lineTo(tipX + 18, tipY - 24);
    ctx.lineTo(tipX, tipY);
    ctx.closePath();
    ctx.fillStyle = '#ffd233'; ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#7b6331'; ctx.stroke();

    // Plaque text
    const resEl = document.getElementById('result');
    if (winnerIndex == null) resEl.textContent = 'Result: —';
    updateControls();
  }

  function easeOutQuint(t){ return 1 - Math.pow(1-t, 5); }

  function normalize(a){
    a = (a % TAU + TAU) % TAU; // 0..TAU
    return a; // always forward
  }

  function modTau(a){ return (a % TAU + TAU) % TAU; }

  // Index of the wedge currently under the top pointer given rotation
  function indexAtPointer(count, rot){
    if (count <= 0) return -1;
    const segAngle = TAU / count;
    // Pointer at top has angle -TAU/4; with our segment definition a0 starts at -TAU/4,
    // so shifting by +TAU/4 reduces to simply -rot (mod TAU).
    const ang = modTau(-rot);
    return Math.floor((ang + 1e-9) / segAngle) % count;
  }

  function spin(){
    if (anim || labels.length === 0) return;
    const n = labels.length;
    const segAngle = TAU / n;
    // random winner among remaining labels
    const targetIndex = Math.floor(Math.random() * n);
    const centerAngle = -TAU/4 + (targetIndex + 0.5) * segAngle; // wheel-local
    const desiredMod = -centerAngle; // rotation so mid sits under pointer
    const extraTurns = 4 + Math.random()*2; // 4..6 turns
    const baseEnd = rotation + extraTurns * TAU;
    const delta = normalize(desiredMod - baseEnd);
    const end = baseEnd + delta;

    const d = 4200; // ms
    const t0 = performance.now();
    const start = rotation;
    winnerIndex = null;
    anim = { t0, d, start, end, targetIndex };

    updateControls();
    requestAnimationFrame(step);
  }

  function step(now){
    if (!anim) return;
    const t = Math.min(1, (now - anim.t0) / anim.d);
    const k = easeOutQuint(t);
    rotation = anim.start + (anim.end - anim.start) * k;
    draw();
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      // settle
      rotation = anim.end;
      // Determine winner by what is under the pointer
      const winIdx = indexAtPointer(labels.length, rotation);
      winnerIndex = winIdx;
      const label = labels[winIdx];
      document.getElementById('result').textContent = `Result: ${label}`;
      anim = null;
      // Remove the winning slice and keep rotation congruent
      if (winIdx >= 0) labels.splice(winIdx, 1);
      // Normalize rotation to [0, TAU)
      rotation = ((rotation % TAU) + TAU) % TAU;
      saveState();
      draw();
    }
  }

  function reset(){
    labels = defaultLabels.slice();
    rotation = 0;
    winnerIndex = null;
    anim = null;
    saveState();
    draw();
  }

  function setLabels(newLabels){
    if (anim) return false;
    const cleaned = sanitizeLabels(newLabels);
    if (!cleaned) return false;
    labels = cleaned;
    winnerIndex = null;
    // keep current rotation so wheel orientation feels continuous
    saveState();
    draw();
    return true;
  }

  // Simple API surface and postMessage bridge
  window.wheelAPI = {
    setLabels,
    getLabels: () => labels.slice(),
    reset,
    spin,
    getRotation: () => rotation,
    setRotation: (r) => { if (!anim && typeof r === 'number' && isFinite(r)) { rotation = r; saveState(); draw(); return true; } return false; },
    clearState: () => { try { localStorage.removeItem('wof.state'); } catch {} }
  };

  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    let reply = null;
    switch (d.type) {
      case 'setLabels':
        reply = { ok: setLabels(d.labels) };
        break;
      case 'reset':
        if (!anim) { reset(); reply = { ok: true }; } else reply = { ok: false };
        break;
      case 'spin':
        if (!anim) { spin(); reply = { ok: true }; } else reply = { ok: false };
        break;
      case 'getState':
        reply = { labels: labels.slice(), rotation };
        break;
      default:
        return;
    }
    try { e.source && e.source.postMessage({ type: d.type + 'Result', ...reply }, '*'); } catch {}
  });

  window.addEventListener('beforeunload', saveState);
  spinBtn.addEventListener('click', spin);
  resetBtn.addEventListener('click', reset);

  draw();
})();
