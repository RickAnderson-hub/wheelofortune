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

  // Initialize from storage or defaults
  (function initFromStorage(){
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
      winnerIndex = anim.targetIndex;
      const label = labels[winnerIndex];
      document.getElementById('result').textContent = `Result: ${label}`;
      anim = null;
      // Remove the winning slice and keep rotation congruent
      labels.splice(winnerIndex, 1);
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

  window.addEventListener('beforeunload', saveState);
  spinBtn.addEventListener('click', spin);
  resetBtn.addEventListener('click', reset);

  draw();
})();
