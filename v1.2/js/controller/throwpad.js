// Gzowo Bowling — throw screen: top-down mini lane with aim drag, spin dial, flick-to-throw zone, mulligan and skip.
import { TIMING, PHYSICS } from "../config.js";
import { t } from "../i18n.js";
import * as net from "../net.js";
import { el, sfx, vib, popNode, ballDiscUrl } from "./ui.js";

const PIN_LAYOUT = [
  [0, 0.22], [-0.22, 0.17], [0.22, 0.17],
  [-0.44, 0.12], [0, 0.12], [0.44, 0.12],
  [-0.66, 0.07], [-0.22, 0.07], [0.22, 0.07], [0.66, 0.07],
];

function throttled(fn, ms) {
  let last = 0;
  let timer = null;
  let pending = null;
  return (...args) => {
    pending = args;
    const now = Date.now();
    const run = () => {
      last = Date.now();
      timer = null;
      fn(...pending);
    };
    if (now - last >= ms) run();
    else if (!timer) timer = setTimeout(run, ms - (now - last));
  };
}

export function initThrowPad(rootEl) {
  const state = {
    aim: { x: 0, forward: 0 },
    spin: 0,
    active: false,
    paused: false,
    sent: false,
    narrow: false,
    mulligan: false,
    mulliganSpent: false,
  };

  rootEl.style.display = "flex";
  rootEl.style.flexDirection = "column";
  rootEl.style.gap = "10px";
  rootEl.style.flex = "1";
  rootEl.style.minHeight = "0";

  const lane = el("div", "minilane");
  const narrowChip = el("div", "chip chip-warn narrow-chip hidden", "⚠️ " + t("banner.narrowLane"));
  const surface = el("div", "lane-surface");
  const markings = el("div", "lane-markings");
  markings.append(el("span", null, "▲"), el("span", null, "▲"), el("span", null, "▲"));
  const pinDots = PIN_LAYOUT.map(() => el("div", "pin-dot"));
  const limitLine = el("div", "limit-line");
  limitLine.style.top = "60%";
  const arrowSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  arrowSvg.setAttribute("class", "aim-arrow");
  const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrowSvg.append(arrowPath);
  const puck = el("div", "puck");
  lane.append(narrowChip, surface, markings, ...pinDots, limitLine, arrowSvg, puck);

  const dialWrap = el("div", "spin-dial-wrap");
  const dialLabels = el("div", "spin-dial-labels");
  const spinLabel = el("span", "label label-upper");
  spinLabel.setAttribute("data-i18n", "pad.spinLabel");
  spinLabel.textContent = t("pad.spinLabel");
  const spinValue = el("span", "chip chip-soft spin-value", "0.0");
  dialLabels.append(spinLabel, spinValue);
  const track = el("div", "dial-track");
  const knob = el("div", "dial-knob", "↺↻");
  track.append(knob);
  dialWrap.append(dialLabels, track);

  const flickZone = el("div", "flick-zone");
  const chevrons = el("div", "chevrons");
  chevrons.append(el("span", null, "︿"), el("span", null, "︿"), el("span", null, "︿"));
  const flickHint = el("div", "flick-hint");
  flickHint.setAttribute("data-i18n", "pad.throwHint");
  flickHint.textContent = t("pad.throwHint");
  const powerBar = el("div", "power-bar");
  const powerFill = el("div", "power-fill");
  powerBar.append(powerFill);
  const rolling = el("div", "rolling-state hidden");
  const rollingBall = el("div", "rolling-ball", "🎳");
  const rollingText = el("div");
  rollingText.setAttribute("data-i18n", "pad.rolling");
  rollingText.textContent = t("pad.rolling");
  rolling.append(rollingBall, rollingText);
  flickZone.append(chevrons, flickHint, powerBar, rolling);

  const actions = el("div", "action-row");
  const skipBtn = el("button", "btn btn-ghost", "⏭ " + t("pad.skipTurn"));
  const spacer = el("div", "spacer");
  const mulliganBtn = el("button", "btn btn-3d btn-warn btn-pill hidden", "✨ " + t("pad.mulligan"));
  const mulliganToast = el("span", "chip chip-soft hidden", t("pad.mulliganGone"));
  actions.append(skipBtn, spacer, mulliganToast, mulliganBtn);

  rootEl.append(lane, dialWrap, flickZone, actions);

  const writeAim = throttled((aim) => {
    const id = net.myPlayerId();
    if (id) net.write("input/" + id + "/aim", { x: aim.x, forward: aim.forward });
  }, TIMING.AIM_THROTTLE_MS);

  const writeSpin = throttled((v) => {
    const id = net.myPlayerId();
    if (id) net.write("input/" + id + "/spin", v);
  }, TIMING.AIM_THROTTLE_MS);

  function laneGeom() {
    const r = lane.getBoundingClientRect();
    const leftPct = state.narrow ? 27 : 18;
    const rightPct = 100 - leftPct;
    return {
      rect: r,
      centerX: r.width * 0.5,
      halfW: r.width * ((rightPct - leftPct) / 200),
      baseY: r.height * 0.84,
      minY: r.height * 0.62,
    };
  }

  function layoutPins() {
    const g = laneGeom();
    PIN_LAYOUT.forEach(([nx, ny], i) => {
      pinDots[i].style.left = (50 + nx * (g.halfW / g.rect.width) * 100) + "%";
      pinDots[i].style.top = (ny * 100) + "%";
    });
  }

  function puckPos() {
    const g = laneGeom();
    const margin = 34;
    const x = g.centerX + state.aim.x * Math.max(10, g.halfW - margin);
    const y = g.baseY - state.aim.forward * (g.baseY - g.minY);
    return { x, y, g };
  }

  function layout() {
    const { x, y, g } = puckPos();
    puck.style.left = (x / g.rect.width * 100) + "%";
    puck.style.top = (y / g.rect.height * 100) + "%";
    arrowSvg.setAttribute("viewBox", "0 0 " + Math.max(1, Math.round(g.rect.width)) + " " + Math.max(1, Math.round(g.rect.height)));
    const endY = g.rect.height * 0.24;
    const drift = state.spin * g.halfW * 0.55;
    const bow = -state.spin * g.halfW * 0.5;
    const endX = Math.max(g.centerX - g.halfW, Math.min(g.centerX + g.halfW, x + drift));
    const cpX = x + bow;
    const cpY = (y + endY) / 2;
    arrowPath.setAttribute("d", "M " + x + " " + (y - 32) + " Q " + cpX + " " + cpY + " " + endX + " " + endY);
    layoutPins();
  }

  function updateSpinUi(snap) {
    spinValue.textContent = (state.spin >= 0 ? "+" : "") + state.spin.toFixed(1);
    requestAnimationFrame(() => {
      const w = track.clientWidth;
      knob.classList.toggle("snap", !!snap);
      knob.style.left = ((state.spin + 1) / 2 * Math.max(0, w - 64)) + "px";
    });
  }

  function canInteract() {
    return state.active && !state.paused && !state.sent;
  }

  let puckDrag = false;
  let lastVibNotch = 0;
  puck.addEventListener("pointerdown", (ev) => {
    if (!canInteract()) return;
    puckDrag = true;
    puck.classList.add("drag");
    try { puck.setPointerCapture(ev.pointerId); } catch (e) {}
  });
  puck.addEventListener("pointermove", (ev) => {
    if (!puckDrag || !canInteract()) return;
    const g = laneGeom();
    const px = ev.clientX - g.rect.left;
    const py = ev.clientY - g.rect.top;
    state.aim.x = Math.max(-1, Math.min(1, (px - g.centerX) / Math.max(10, g.halfW - 34)));
    state.aim.forward = Math.max(0, Math.min(1, (g.baseY - py) / (g.baseY - g.minY)));
    const notch = Math.round((state.aim.x + 1) * 5);
    if (notch !== lastVibNotch) {
      lastVibNotch = notch;
      vib(10);
    }
    layout();
    writeAim({ ...state.aim });
  });
  const puckUp = () => {
    puckDrag = false;
    puck.classList.remove("drag");
  };
  puck.addEventListener("pointerup", puckUp);
  puck.addEventListener("pointercancel", puckUp);

  let dialDrag = false;
  const setSpinFrom = (clientX) => {
    const r = track.getBoundingClientRect();
    state.spin = Math.max(-1, Math.min(1, ((clientX - r.left) / Math.max(1, r.width)) * 2 - 1));
    updateSpinUi(false);
    layout();
    writeSpin(state.spin);
  };
  track.addEventListener("pointerdown", (ev) => {
    if (!canInteract()) return;
    dialDrag = true;
    try { track.setPointerCapture(ev.pointerId); } catch (e) {}
    setSpinFrom(ev.clientX);
  });
  track.addEventListener("pointermove", (ev) => {
    if (dialDrag && canInteract()) setSpinFrom(ev.clientX);
  });
  const dialUp = () => {
    if (!dialDrag) return;
    dialDrag = false;
    if (Math.abs(state.spin) < 0.12) {
      state.spin = 0;
      updateSpinUi(true);
      layout();
      writeSpin(0);
      sfx("ui");
      vib(10);
    }
  };
  track.addEventListener("pointerup", dialUp);
  track.addEventListener("pointercancel", dialUp);

  let flickSamples = [];
  let flickTracking = false;
  const trail = el("div", "flick-trail hidden");
  flickZone.append(trail);

  function flickSpeed() {
    if (flickSamples.length < 2) return 0;
    const now = performance.now();
    const recent = flickSamples.filter((s) => now - s.t < 140);
    const pts = recent.length >= 2 ? recent : flickSamples.slice(-2);
    const a = pts[0];
    const b = pts[pts.length - 1];
    return (a.y - b.y) / Math.max(1, b.t - a.t);
  }

  flickZone.addEventListener("pointerdown", (ev) => {
    if (!canInteract()) return;
    flickTracking = true;
    flickSamples = [{ x: ev.clientX, y: ev.clientY, t: performance.now() }];
    try { flickZone.setPointerCapture(ev.pointerId); } catch (e) {}
    trail.classList.remove("hidden");
  });
  flickZone.addEventListener("pointermove", (ev) => {
    if (!flickTracking) return;
    flickSamples.push({ x: ev.clientX, y: ev.clientY, t: performance.now() });
    if (flickSamples.length > 24) flickSamples.shift();
    const zr = flickZone.getBoundingClientRect();
    trail.style.left = (ev.clientX - zr.left) + "px";
    trail.style.top = (ev.clientY - zr.top) + "px";
    const live = Math.max(0, Math.min(1, (flickSpeed() - 0.15) / 2.0));
    powerFill.style.height = (live * 100) + "%";
  });
  const flickEnd = (ev) => {
    if (!flickTracking) return;
    flickTracking = false;
    trail.classList.add("hidden");
    if (!canInteract()) {
      powerFill.style.height = "0%";
      return;
    }
    const first = flickSamples[0];
    const dy = first ? first.y - ev.clientY : 0;
    const dx = first ? ev.clientX - first.x : 0;
    const speed = flickSpeed();
    if (dy < 36 || speed < 0.22) {
      powerFill.style.height = "0%";
      return;
    }
    const zoneH = Math.max(60, flickZone.getBoundingClientRect().height);
    const lenNorm = Math.min(1, dy / (zoneH * 0.95));
    const speedNorm = Math.max(0, Math.min(1, (speed - 0.2) / 2.0));
    const power = Math.max(0, Math.min(1, speedNorm * 0.75 + lenNorm * 0.35));
    const angle = Math.max(-PHYSICS.ANGLE_MAX, Math.min(PHYSICS.ANGLE_MAX, (dx / Math.max(60, dy)) * PHYSICS.ANGLE_MAX * 1.6));
    state.sent = true;
    powerFill.style.height = (power * 100) + "%";
    const id = net.myPlayerId();
    if (id) net.write("input/" + id + "/throw", { power, angle, ts: Date.now() });
    vib(30);
    sfx("roll");
    showRolling(true);
  };
  flickZone.addEventListener("pointerup", flickEnd);
  flickZone.addEventListener("pointercancel", flickEnd);

  function showRolling(on) {
    rolling.classList.toggle("hidden", !on);
    flickHint.classList.toggle("hidden", on);
    chevrons.classList.toggle("hidden", on);
  }

  skipBtn.addEventListener("click", () => {
    if (!state.active || state.paused) return;
    sfx("ui");
    vib(10);
    popNode(skipBtn);
    net.sendCommand("skipTurn", null);
  });

  mulliganBtn.addEventListener("click", () => {
    if (state.paused || state.mulliganSpent || !state.mulligan) return;
    state.mulliganSpent = true;
    const id = net.myPlayerId();
    if (id) net.write("input/" + id + "/mulligan", { ts: Date.now() });
    sfx("ding");
    vib(30);
    mulliganBtn.classList.add("hidden");
    mulliganToast.classList.remove("hidden");
    setTimeout(() => mulliganToast.classList.add("hidden"), 2600);
  });

  function refreshDisabled() {
    const off = state.paused || (!state.active && !state.sent);
    for (const node of [lane, dialWrap, flickZone]) node.classList.toggle("inputs-disabled", off);
    skipBtn.disabled = !state.active || state.paused || state.sent;
  }

  window.addEventListener("resize", layout);
  requestAnimationFrame(() => {
    layout();
    updateSpinUi(false);
  });

  return {
    setActive(isMyTurn) {
      const was = state.active;
      state.active = !!isMyTurn;
      if (state.active && !was) {
        state.sent = false;
        showRolling(false);
        powerFill.style.height = "0%";
      }
      if (!state.active) puckDrag = dialDrag = flickTracking = false;
      refreshDisabled();
      layout();
    },
    setMulligan(available) {
      const show = !!available && !state.mulliganSpent;
      if (show && mulliganBtn.classList.contains("hidden")) {
        mulliganBtn.classList.remove("hidden");
        mulliganBtn.classList.add("spring-in");
        sfx("ding");
        vib(20);
      } else if (!show) {
        mulliganBtn.classList.add("hidden");
      }
      state.mulligan = show;
    },
    setPaused(paused) {
      state.paused = !!paused;
      refreshDisabled();
    },
    reset() {
      state.aim = { x: 0, forward: 0 };
      state.spin = 0;
      state.sent = false;
      showRolling(false);
      powerFill.style.height = "0%";
      updateSpinUi(true);
      layout();
      if (state.active) {
        writeAim({ x: 0, forward: 0 });
        writeSpin(0);
      }
      refreshDisabled();
    },
    setNarrow(on) {
      state.narrow = !!on;
      lane.classList.toggle("narrow", state.narrow);
      narrowChip.classList.toggle("hidden", !state.narrow);
      layout();
    },
    setBall(color, pattern) {
      const url = ballDiscUrl(color, pattern, 112);
      if (url) {
        puck.style.backgroundImage = "url(" + url + ")";
        puck.style.backgroundSize = "cover";
      } else {
        puck.style.setProperty("--bc", color || "#FF6B6B");
      }
    },
    setPlayerColor(color) {
      lane.style.setProperty("--pc", color || "#FF6B6B");
      arrowSvg.style.setProperty("--pc", color || "#FF6B6B");
    },
    setPins(mask) {
      const m = typeof mask === "number" ? mask : 0x3FF;
      pinDots.forEach((d, i) => d.classList.toggle("down", !((m >> i) & 1)));
    },
    setMulliganSpent(spent) {
      state.mulliganSpent = !!spent;
      if (spent) mulliganBtn.classList.add("hidden");
    },
    isThrowSent() {
      return state.sent;
    },
  };
}
