(function(){
'use strict';
const CU = window.CU;

window.addEventListener('error', e => {
  console.error('[Cricket Universe] runtime error', e.error || e.message);
});

document.addEventListener('DOMContentLoaded', () => {
  try {
    const ui = new CU.UI();
    CU.ui = ui;
    ui.show('menu');
    // Prevent scroll bounce on iOS
    document.body.addEventListener('touchmove', e => {
      if (e.target.closest('.screen')) return;
      e.preventDefault();
    }, {passive:false});
    console.log('Cricket Universe ready.');
  } catch(e){
    console.error(e);
    alert('Failed to start: ' + e.message);
  }
});

})();

(function(){
'use strict';
const CU = window.CU;

window.addEventListener('error', e => {
  console.error('[Cricket Universe] runtime error', e.error || e.message);
});

window.addEventListener('unhandledrejection', e => {
  console.warn('[Cricket Universe] promise rejected', e.reason);
});

document.addEventListener('DOMContentLoaded', () => {
  try {
    const ui = new CU.UI();
    CU.ui = ui;
    ui.show('menu');

    // Init extended modules
    if (CU.DRS) CU.DRS.init();
    if (CU.Gestures) CU.Gestures.init(document.getElementById('field'), ui);
    if (CU.Voice) CU.Voice.init();

    // Wire DRS buttons
    const drsAccept = document.getElementById('drs-accept');
    const drsDecline = document.getElementById('drs-decline');
    if (drsAccept) drsAccept.onclick = () => CU.DRS.decide(true);
    if (drsDecline) drsDecline.onclick = () => CU.DRS.decide(false);

    // Wire fullscreen
    document.querySelectorAll('[data-action="fullscreen"]').forEach(b => {
      b.onclick = () => CU.Fullscreen.toggle();
    });

    // Prevent iOS scroll bounce
    document.body.addEventListener('touchmove', e => {
      if (e.target.closest('.screen, .overlay')) return;
      e.preventDefault();
    }, {passive:false});

    // Register service worker (offline)
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')){
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('SW registration failed', err);
      });
    }

    // Refresh voice when settings change
    const origSet = CU.Save.set;
    CU.Save.set = function(path, val){
      origSet.call(this, path, val);
      if (path.startsWith('settings.')) {
        if (CU.Voice) CU.Voice.refresh();
      }
    };

    console.log('🏏 Cricket Universe ready (extended v1.1).');
  } catch(e){
    console.error(e);
    alert('Failed to start: ' + e.message);
  }
});

})();