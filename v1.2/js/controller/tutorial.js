// Gzowo Bowling — interactive 6-step pad tutorial overlay: try-it aim/spin/flick steps, hand hints, skippable.
import { EMOTES } from "../config.js";
import { t, onLangChange } from "../i18n.js";
import { el, clear, sfx, vib, popNode } from "./ui.js";

export function isTutorialDone() {
  try {
    return localStorage.getItem("gzowo.tutorialDone") === "1";
  } catch (e) {
    return false;
  }
}

function markDone() {
  try {
    localStorage.setItem("gzowo.tutorialDone", "1");
  } catch (e) {}
}

const STEPS = ["aim", "spin", "flick", "emotes", "skipTurn", "mulligan"];

export function startTutorial(rootEl, onDone) {
  let idx = 0;
  let finished = false;
  let stageCleanup = null;

  const overlay = el("div", "tutorial-overlay");
  const stage = el("div");
  stage.style.position = "fixed";
  stage.style.left = "16px";
  stage.style.right = "16px";
  stage.style.top = "12%";
  stage.style.zIndex = "202";
  const hand = el("div", "hand-hint", "👆");
  hand.style.display = "none";
  const card = el("div", "tutorial-card");
  const closeBtn = el("button", "btn btn-ghost btn-icon tutorial-close", "✕");
  closeBtn.addEventListener("click", () => end());

  const stepChip = el("div", "chip chip-soft step-chip");
  const title = el("h1");
  const body = el("p", "muted");
  const buttons = el("div", "tutorial-buttons");
  const skipBtn = el("button", "btn btn-ghost", t("tutorial.skip"));
  const nextBtn = el("button", "btn btn-3d btn-primary btn-pill", t("common.next"));
  skipBtn.addEventListener("click", () => { sfx("ui"); end(); });
  nextBtn.addEventListener("click", () => { sfx("ui"); vib(10); advance(); });
  buttons.append(skipBtn, nextBtn);
  card.append(closeBtn, stepChip, title, body, buttons);

  rootEl.append(overlay, stage, hand, card);

  function retextStep() {
    const step = STEPS[idx];
    skipBtn.textContent = t("tutorial.skip");
    stepChip.textContent = (idx + 1) + "/" + STEPS.length;
    title.textContent = t("tutorial." + step + ".title");
    body.textContent = t("tutorial." + step + ".body");
    const isLast = idx === STEPS.length - 1;
    nextBtn.textContent = isLast ? t("tutorial.done") : t("common.next");
  }

  const unsubLang = onLangChange(() => {
    if (finished) return;
    retextStep();
  });

  function end() {
    if (finished) return;
    finished = true;
    unsubLang();
    markDone();
    if (stageCleanup) stageCleanup();
    overlay.remove();
    stage.remove();
    hand.remove();
    card.remove();
    if (typeof onDone === "function") onDone();
  }

  function advance() {
    idx += 1;
    if (idx >= STEPS.length) {
      sfx("spare");
      end();
      return;
    }
    renderStep();
  }

  function succeed() {
    sfx("spare");
    vib(20);
    const check = el("div", "step-check", "✓");
    check.style.textAlign = "center";
    stage.append(check);
    popNode(check);
    setTimeout(() => { if (!finished) advance(); }, 650);
  }

  function placeHand(cls) {
    hand.className = "hand-hint " + (cls || "");
    hand.style.display = cls ? "block" : "none";
    if (!cls) return;
    requestAnimationFrame(() => {
      const r = stage.getBoundingClientRect();
      hand.style.left = (r.left + r.width / 2 - 24) + "px";
      hand.style.top = (r.top + r.height / 2 - 24) + "px";
    });
  }

  function mockLaneStep() {
    const lane = el("div", "minilane spotlit");
    lane.style.height = "220px";
    lane.append(el("div", "lane-surface"));
    const puck = el("div", "puck");
    puck.style.left = "50%";
    puck.style.top = "75%";
    puck.style.setProperty("--bc", "#FF6B6B");
    lane.append(puck);
    stage.append(lane);
    let dragging = false;
    let startX = 0;
    let travelled = 0;
    let done = false;
    const down = (ev) => {
      dragging = true;
      startX = ev.clientX;
      try { puck.setPointerCapture(ev.pointerId); } catch (e) {}
      puck.classList.add("drag");
    };
    const move = (ev) => {
      if (!dragging || done) return;
      const r = lane.getBoundingClientRect();
      const x = Math.max(r.width * 0.22, Math.min(r.width * 0.78, ev.clientX - r.left));
      puck.style.left = (x / r.width * 100) + "%";
      travelled += Math.abs(ev.clientX - startX);
      startX = ev.clientX;
      if (travelled > 120) {
        done = true;
        succeed();
      }
    };
    const up = () => {
      dragging = false;
      puck.classList.remove("drag");
    };
    puck.addEventListener("pointerdown", down);
    puck.addEventListener("pointermove", move);
    puck.addEventListener("pointerup", up);
    puck.addEventListener("pointercancel", up);
    placeHand("hand-drag");
    return () => {};
  }

  function mockDialStep() {
    const wrap = el("div", "spin-dial-wrap card spotlit");
    const labels = el("div", "spin-dial-labels");
    labels.append(el("span", "label", t("pad.spinLabel")), el("span", "chip chip-soft spin-value", "0.0"));
    const track = el("div", "dial-track");
    const knob = el("div", "dial-knob", "↺↻");
    track.append(knob);
    wrap.append(labels, track);
    stage.append(wrap);
    const valueChip = labels.querySelector(".spin-value");
    let dragging = false;
    let done = false;
    const setV = (clientX) => {
      const r = track.getBoundingClientRect();
      const v = Math.max(-1, Math.min(1, ((clientX - r.left) / r.width) * 2 - 1));
      knob.style.left = ((v + 1) / 2 * (r.width - 64)) + "px";
      valueChip.textContent = (v >= 0 ? "+" : "") + v.toFixed(1);
      if (!done && Math.abs(v) > 0.55) {
        done = true;
        succeed();
      }
    };
    const down = (ev) => {
      dragging = true;
      try { track.setPointerCapture(ev.pointerId); } catch (e) {}
      setV(ev.clientX);
    };
    const move = (ev) => { if (dragging) setV(ev.clientX); };
    const up = () => { dragging = false; };
    track.addEventListener("pointerdown", down);
    track.addEventListener("pointermove", move);
    track.addEventListener("pointerup", up);
    track.addEventListener("pointercancel", up);
    requestAnimationFrame(() => {
      const r = track.getBoundingClientRect();
      knob.style.left = ((r.width - 64) / 2) + "px";
    });
    placeHand("hand-arc");
    return () => {};
  }

  function mockFlickStep() {
    const zone = el("div", "flick-zone spotlit");
    zone.style.height = "200px";
    const chev = el("div", "chevrons");
    chev.append(el("span", null, "︿"), el("span", null, "︿"), el("span", null, "︿"));
    zone.append(chev, el("div", "flick-hint", t("pad.throwHint")));
    stage.append(zone);
    let startY = 0;
    let startT = 0;
    let tracking = false;
    let done = false;
    const down = (ev) => {
      tracking = true;
      startY = ev.clientY;
      startT = performance.now();
      try { zone.setPointerCapture(ev.pointerId); } catch (e) {}
    };
    const up = (ev) => {
      if (!tracking || done) { tracking = false; return; }
      tracking = false;
      const dy = startY - ev.clientY;
      const dt = Math.max(1, performance.now() - startT);
      if (dy > 40 && dy / dt > 0.25) {
        done = true;
        vib(30);
        succeed();
      }
    };
    zone.addEventListener("pointerdown", down);
    zone.addEventListener("pointerup", up);
    zone.addEventListener("pointercancel", () => { tracking = false; });
    placeHand("hand-flick");
    return () => {};
  }

  function mockEmotesStep() {
    const bar = el("div", "emote-bar spotlit");
    bar.style.background = "var(--card)";
    bar.style.borderRadius = "var(--r-pill)";
    bar.style.padding = "8px";
    for (const e of EMOTES) {
      const b = el("button", "emote-btn", e.char);
      b.addEventListener("click", () => {
        sfx(e.sfx);
        vib(10);
        popNode(b);
        const fly = el("span", "emote-fly", e.char);
        fly.style.left = (b.offsetLeft + 8) + "px";
        fly.style.top = "0px";
        bar.append(fly);
        setTimeout(() => fly.remove(), 1000);
      });
      bar.append(b);
    }
    stage.append(bar);
    placeHand("");
    return () => {};
  }

  function mockSkipStep() {
    const row = el("div", "action-row card spotlit");
    row.style.justifyContent = "center";
    const b = el("button", "btn btn-ghost jiggle-loop", "⏭ " + t("pad.skipTurn"));
    row.append(b);
    stage.append(row);
    placeHand("");
    return () => {};
  }

  function mockMulliganStep() {
    const row = el("div", "action-row card spotlit");
    row.style.justifyContent = "center";
    const b = el("button", "btn btn-3d btn-warn btn-pill jiggle-loop", "✨ " + t("pad.mulligan"));
    row.append(b);
    stage.append(row);
    placeHand("");
    return () => {};
  }

  function renderStep() {
    if (stageCleanup) stageCleanup();
    clear(stage);
    const step = STEPS[idx];
    stepChip.textContent = (idx + 1) + "/" + STEPS.length;
    title.textContent = t("tutorial." + step + ".title");
    body.textContent = t("tutorial." + step + ".body");
    const isLast = idx === STEPS.length - 1;
    nextBtn.textContent = isLast ? t("tutorial.done") : t("common.next");
    nextBtn.className = "btn btn-3d btn-pill " + (isLast ? "btn-success" : "btn-primary");
    const builders = {
      aim: mockLaneStep,
      spin: mockDialStep,
      flick: mockFlickStep,
      emotes: mockEmotesStep,
      skipTurn: mockSkipStep,
      mulligan: mockMulliganStep,
    };
    stageCleanup = builders[step]();
    popNode(card);
  }

  renderStep();
}
