// Gzowo Bowling — pad join flow: nick, ball customizer with live 3D preview, lane theme; returns the profile.
import { BALL_COLORS, BALL_PATTERNS, LANE_THEMES, THEME_CONFIG } from "../config.js";
import { t } from "../i18n.js";
import { el, clear, sfx, vib, popNode, shakeNode, paintBallDisc } from "./ui.js";
import { initBallPreview } from "./ballpreview.js";

const WEIGHT_ICONS = { light: "🪶", medium: "⚖️", heavy: "🏋️" };

export function showJoin(rootEl, onComplete) {
  const state = {
    nick: "",
    ballColor: BALL_COLORS[0],
    ballPattern: "solid",
    ballWeight: "medium",
    laneTheme: "classic",
  };
  let step = 1;
  let preview = null;

  function shell(cardContent) {
    clear(rootEl);
    const screen = el("div", "screen");
    const topbar = el("div", "topbar");
    topbar.append(el("div", "logo-small", "GZOWO BOWLING 🎳"));
    const dots = el("div", "progress-dots");
    for (let i = 1; i <= 3; i++) dots.append(el("div", "dot" + (i === step ? " active" : "")));
    const card = el("div", "card join-card spring-in");
    card.append(cardContent);
    screen.append(topbar, dots, card);
    rootEl.append(screen);
    return card;
  }

  function backBtn(onBack) {
    const b = el("button", "btn btn-ghost", "← " + t("common.back"));
    b.addEventListener("click", () => {
      sfx("ui");
      vib(10);
      onBack();
    });
    return b;
  }

  function ctaBtn(label, extraCls) {
    const b = el("button", "btn btn-3d btn-pill btn-big " + (extraCls || "btn-primary"), label);
    return b;
  }

  function renderStep1() {
    step = 1;
    if (preview) { preview.dispose(); preview = null; }
    const wrap = el("div");
    wrap.append(el("h1", null, t("join.enterNick")));
    const input = el("input", "input");
    input.type = "text";
    input.maxLength = 12;
    input.placeholder = t("join.nickPlaceholder");
    input.value = state.nick;
    input.autocomplete = "off";
    const counter = el("div", "char-counter", state.nick.length + "/12");
    const err = el("div", "nick-error", "");
    input.addEventListener("input", () => {
      state.nick = input.value;
      counter.textContent = input.value.length + "/12";
      err.textContent = "";
    });
    const dock = el("div", "cta-dock");
    const next = ctaBtn(t("common.next"));
    next.addEventListener("click", () => {
      sfx("ui");
      vib(10);
      const nick = input.value.trim();
      if (nick.length < 1) {
        shakeNode(input);
        err.textContent = t("join.nickTooShort");
        vib([30, 30]);
        return;
      }
      state.nick = nick;
      renderStep2();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") next.click();
    });
    dock.append(next);
    wrap.append(input, counter, err, dock);
    shell(wrap);
    setTimeout(() => { try { input.focus(); } catch (e) {} }, 350);
  }

  function renderStep2() {
    step = 2;
    const wrap = el("div");
    const head = el("div");
    head.style.display = "flex";
    head.style.alignItems = "center";
    head.style.gap = "8px";
    head.append(backBtn(renderStep1), el("h1", null, t("join.customizeBall")));
    wrap.append(head);
    const previewWrap = el("div", "ball-preview-wrap");
    const canvas = el("canvas");
    previewWrap.append(canvas);
    const hint = el("div", "rotate-hint");
    const hand = el("span", "hand", "👆 ");
    hint.append(hand, document.createTextNode(t("join.rotateHint")));
    wrap.append(previewWrap, hint);

    const colorLabel = el("div", "label label-upper", t("join.ballColor"));
    colorLabel.style.margin = "16px 0 8px";
    const swatchRow = el("div", "swatch-row");
    const swatches = new Map();
    for (const c of BALL_COLORS) {
      const s = el("button", "swatch" + (c === state.ballColor ? " selected" : ""));
      s.style.background = c;
      s.addEventListener("click", () => {
        state.ballColor = c;
        for (const [cc, node] of swatches) node.classList.toggle("selected", cc === c);
        repaintChips();
        applyBall();
        sfx("ui");
        vib(10);
        popNode(s);
      });
      swatches.set(c, s);
      swatchRow.append(s);
    }

    const patternLabel = el("div", "label label-upper", t("join.ballPattern"));
    patternLabel.style.margin = "16px 0 8px";
    const patternGrid = el("div", "pattern-grid");
    const chips = new Map();
    const chipCanvases = new Map();
    for (const p of BALL_PATTERNS) {
      const chip = el("button", "pattern-chip" + (p === state.ballPattern ? " selected" : ""));
      const mini = el("canvas", "pattern-mini");
      mini.style.width = "36px";
      mini.style.height = "36px";
      chip.append(mini, el("span", null, t("join.pattern." + p)));
      chip.addEventListener("click", () => {
        state.ballPattern = p;
        for (const [pp, node] of chips) node.classList.toggle("selected", pp === p);
        applyBall();
        sfx("ui");
        vib(10);
        popNode(chip);
      });
      chips.set(p, chip);
      chipCanvases.set(p, mini);
      patternGrid.append(chip);
    }

    function repaintChips() {
      for (const [p, mini] of chipCanvases) paintBallDisc(mini, 72, state.ballColor, p);
    }
    repaintChips();

    const weightLabel = el("div", "label label-upper", t("join.ballWeight"));
    weightLabel.style.margin = "16px 0 8px";
    const seg = el("div", "segmented");
    const segBtns = new Map();
    for (const w of ["light", "medium", "heavy"]) {
      const b = el("button", "seg" + (w === state.ballWeight ? " selected" : ""));
      b.append(el("span", null, WEIGHT_ICONS[w]), el("span", null, t("join.weight." + w)));
      b.addEventListener("click", () => {
        state.ballWeight = w;
        for (const [ww, node] of segBtns) node.classList.toggle("selected", ww === w);
        weightHint.textContent = t("join.weightHint." + w);
        popNode(weightHint);
        applyBall();
        sfx("ui");
        vib(10);
      });
      segBtns.set(w, b);
      seg.append(b);
    }
    const weightHint = el("div", "weight-hint", t("join.weightHint." + state.ballWeight));

    const dock = el("div", "cta-dock");
    const next = ctaBtn(t("common.next"));
    next.addEventListener("click", () => {
      sfx("ui");
      vib(10);
      renderStep3();
    });
    dock.append(next);
    wrap.append(colorLabel, swatchRow, patternLabel, patternGrid, weightLabel, seg, weightHint, dock);
    shell(wrap);
    if (preview) preview.dispose();
    preview = initBallPreview(canvas);
    applyBall();

    function applyBall() {
      if (preview) preview.setBall(state.ballColor, state.ballPattern, state.ballWeight);
    }
  }

  function renderStep3() {
    step = 3;
    if (preview) { preview.dispose(); preview = null; }
    const wrap = el("div");
    const head = el("div");
    head.style.display = "flex";
    head.style.alignItems = "center";
    head.style.gap = "8px";
    head.append(backBtn(renderStep2), el("h1", null, t("join.laneTheme")));
    wrap.append(head);
    const list = el("div", "theme-list");
    const cards = new Map();
    LANE_THEMES.forEach((th, i) => {
      const conf = THEME_CONFIG[th] || {};
      const card = el("button", "theme-card spring-in" + (th === state.laneTheme ? " selected" : ""));
      card.style.animationDelay = (i * 70) + "ms";
      card.style.setProperty("--tc", conf.accent || "#FF6B6B");
      card.append(
        el("span", "theme-icon", conf.icon || "🎳"),
        el("span", "theme-name", t("theme." + th)),
        el("span", "radio-dot")
      );
      card.addEventListener("click", () => {
        state.laneTheme = th;
        for (const [tt, node] of cards) node.classList.toggle("selected", tt === th);
        sfx("ui");
        vib(10);
        popNode(card);
      });
      cards.set(th, card);
      list.append(card);
    });
    const dock = el("div", "cta-dock");
    const ready = ctaBtn(t("join.ready") + " 🎳", "btn-success");
    ready.addEventListener("click", () => {
      sfx("ui");
      vib(20);
      popNode(ready);
      ready.disabled = true;
      onComplete({
        nick: state.nick,
        ballColor: state.ballColor,
        ballPattern: state.ballPattern,
        ballWeight: state.ballWeight,
        laneTheme: state.laneTheme,
        ready: true,
      });
    });
    dock.append(ready);
    wrap.append(list, dock);
    shell(wrap);
  }

  renderStep1();
}
