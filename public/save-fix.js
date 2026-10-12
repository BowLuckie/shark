/*
 * Keeps the ad fix and a usable mouse sensitivity on every save.
 *
 * Saves live in localStorage under "savesData" (the game reaches it through
 * the SDK stub's getStorage()) and "yg_saves". Rather than only fixing what is
 * already stored, this wraps Storage.prototype.setItem so brand-new saves are
 * patched the instant the game (or the save manager) writes them.
 */
(function () {
  var BIG = 1000000000; // ad-free window; refreshed on every write
  var SENS = 1;         // fallback mouse sensitivity (0 freezes the camera)

  function apply(o) {
    if (!o || typeof o !== "object") return o;
    o.ADS_OFF = true;
    o.OFF_ADS_TIME = BIG;
    var s = o.SettingSave;
    if (!s || typeof s !== "object") {
      s = {Sound: true, Music: true};
      o.SettingSave = s;
    }
    if (!(+s.MouseSensivity > 0)) s.MouseSensivity = SENS;
    return o;
  }

  function applyString(str) {
    try {return JSON.stringify(apply(JSON.parse(str)));} catch (e) {return str;}
  }

  function applyYg(str) {
    try {
      var y = JSON.parse(str);
      if (y && Object.prototype.toString.call(y.saves) === "[object Array]") {
        y.saves = y.saves.map(function (x) {return applyString(x);});
        return JSON.stringify(y);
      }
    } catch (e) { }
    return str;
  }

  function patchKey(key, value) {
    if (typeof value !== "string") return value;
    if (key === "savesData") return applyString(value);
    if (key === "yg_saves") return applyYg(value);
    return value;
  }

  // Intercept writes so a new save never lands without the fix.
  var rawSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    var patched = value;
    try {patched = patchKey(key, value);} catch (e) { }
    return rawSet.call(this, key, patched);
  };

  // Also clean up whatever is already stored.
  try {
    var cur = localStorage.getItem("savesData");
    if (cur) rawSet.call(localStorage, "savesData", applyString(cur));
    var yg = localStorage.getItem("yg_saves");
    if (yg) rawSet.call(localStorage, "yg_saves", applyYg(yg));
  } catch (e) { }

  window.saveFix = {apply: apply, BIG: BIG, SENS: SENS};
})();
