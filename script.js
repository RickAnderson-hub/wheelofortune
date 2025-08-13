(function() {
  const wrap = document.getElementById('handleWrap');
  if (!wrap) return;
  wrap.setAttribute('role', 'button');
  wrap.setAttribute('tabindex', '0');
  let busy = false;
  function trigger() {
    if (busy) return;
    busy = true;
    wrap.classList.add('down');
    setTimeout(() => {
      wrap.classList.remove('down');
      setTimeout(() => { busy = false; }, 220);
    }, 1000);
  }
  wrap.addEventListener('click', trigger);
  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      trigger();
    }
  });
})();
