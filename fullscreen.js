(function(){
'use strict';
const CU = window.CU = window.CU || {};

CU.Fullscreen = {
  toggle(){
    const el = document.documentElement;
    const isFs = document.fullscreenElement || document.webkitFullscreenElement;
    if (!isFs){
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) req.call(el).catch(()=>{});
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document);
    }
  }
};

CU.Vibrate = {
  buzz(ms){
    const s = CU.Save.getSettings();
    if (!s.vibration) return;
    if (navigator.vibrate) try { navigator.vibrate(ms || 30); } catch(e){}
  }
};

})();