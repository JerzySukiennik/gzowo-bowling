// Gzowo Bowling — pad "My Balls" manager + turn-start ball picker.
import { el, clear, sfx, vib, popNode, shakeNode, paintBallDisc } from "./ui.js";
import { BALL_COLORS, BALL_PATTERNS, BALL_WEIGHT_RANGE } from "../config.js";
import { t } from "../i18n.js";

const MAX_BALLS = 3;

function normColor(c) {
  return String(c || "").trim().toLowerCase();
}

function defaultBall(existing) {
  const used = new Set((existing || []).map((b) => normColor(b && b.color)));
  const color = BALL_COLORS.find((c) => !used.has(normColor(c))) || BALL_COLORS[0];
  return {
    color,
    pattern: "solid",
    patternColor: BALL_COLORS[BALL_COLORS.length - 1],
    weight: BALL_WEIGHT_RANGE.DEFAULT,
  };
}

function sanitizeBall(b) {
  const src = b || {};
  const color = BALL_COLORS.includes(src.color) ? src.color : BALL_COLORS[0];
  const pattern = BALL_PATTERNS.includes(src.pattern) ? src.pattern : "solid";
  const patternColor = BALL_COLORS.includes(src.patternColor)
    ? src.patternColor
    : BALL_COLORS[BALL_COLORS.length - 1];
  let weight = Math.round(Number(src.weight));
  if (!Number.isFinite(weight)) weight = BALL_WEIGHT_RANGE.DEFAULT;
  weight = Math.min(BALL_WEIGHT_RANGE.MAX, Math.max(BALL_WEIGHT_RANGE.MIN, weight));
  return { color, pattern, patternColor, weight };
}

function sanitizeList(balls) {
  const arr = Array.isArray(balls) && balls.length ? balls : [defaultBall([])];
  return arr.slice(0, MAX_BALLS).map(sanitizeBall);
}

function colorClashes(balls, candidateColor, skipIdx) {
  const c = normColor(candidateColor);
  return balls.some((b, i) => i !== skipIdx && normColor(b.color) === c);
}

function paintDisc(canvas, size, ball) {
  paintBallDisc(canvas, size, ball.color, ball.pattern, ball.weight, ball.patternColor);
}

function discCanvas(ball, px) {
  const c = el("canvas", "ball-disc-canvas");
  c.style.width = px + "px";
  c.style.height = px + "px";
  paintDisc(c, px * 2, ball);
  return c;
}

export function showMyBalls(rootEl, balls, opts) {
  const options = opts || {};
  let list = sanitizeList(balls);

  function commit() {
    if (typeof options.onSave === "function") options.onSave(list.map(sanitizeBall));
  }

  function renderList() {
    clear(rootEl);
    const screen = el("div", "screen");
    const topbar = el("div", "topbar");
    topbar.append(el("div", "logo-small", "GZOWO BOWLING 🎳"));
    screen.append(topbar);

    const card = el("div", "card myballs-card spring-in");
    card.append(el("h1", null, t("myballs.title")));
    card.append(el("div", "subtitle", t("myballs.subtitle")));

    const rows = el("div", "ball-rows");
    list.forEach((ball, i) => rows.append(ballRow(ball, i)));
    card.append(rows);

    const addBtn = el("button", "btn btn-3d btn-pill btn-add-ball", t("myballs.addBall"));
    if (list.length >= MAX_BALLS) {
      addBtn.disabled = true;
      addBtn.classList.add("is-disabled");
    }
    addBtn.addEventListener("click", () => {
      if (list.length >= MAX_BALLS) {
        shakeNode(addBtn);
        vib([30, 30]);
        return;
      }
      sfx("ui");
      vib(10);
      popNode(addBtn);
      renderEditor(defaultBall(list), -1);
    });
    card.append(addBtn);
    if (list.length >= MAX_BALLS) card.append(el("div", "field-hint", t("myballs.max")));

    const dock = el("div", "cta-dock");
    const done = el("button", "btn btn-3d btn-pill btn-big btn-success", t("myballs.done"));
    done.addEventListener("click", () => {
      sfx("ui");
      vib(20);
      popNode(done);
      commit();
      if (typeof options.onClose === "function") options.onClose();
    });
    dock.append(done);
    card.append(dock);

    screen.append(card);
    rootEl.append(screen);
  }

  function ballRow(ball, i) {
    const row = el("div", "ball-row");
    row.append(discCanvas(ball, 48));

    const meta = el("div", "ball-row-meta");
    meta.append(el("div", "ball-row-weight", ball.weight + " " + t("join.weightUnit")));
    meta.append(el("div", "ball-row-pattern", t("join.pattern." + ball.pattern)));
    row.append(meta);

    const actions = el("div", "ball-row-actions");
    const edit = el("button", "btn btn-3d btn-round btn-row-edit", "✏️");
    edit.setAttribute("aria-label", t("myballs.edit"));
    edit.addEventListener("click", () => {
      sfx("ui");
      vib(10);
      popNode(edit);
      renderEditor({ ...ball }, i);
    });
    actions.append(edit);

    const del = el("button", "btn btn-3d btn-round btn-row-del", "🗑️");
    del.setAttribute("aria-label", t("myballs.delete"));
    del.addEventListener("click", () => {
      if (list.length <= 1) {
        shakeNode(row);
        vib([30, 30]);
        const hint = el("div", "field-error", t("myballs.deleteLast"));
        row.append(hint);
        setTimeout(() => { try { hint.remove(); } catch (e) {} }, 1800);
        return;
      }
      sfx("ui");
      vib(20);
      list.splice(i, 1);
      commit();
      renderList();
    });
    actions.append(del);

    row.append(actions);
    return row;
  }

  function renderEditor(draftBall, idx) {
    const isNew = idx < 0;
    const draft = sanitizeBall(draftBall);

    clear(rootEl);
    const screen = el("div", "screen");
    const topbar = el("div", "topbar");
    topbar.append(el("div", "logo-small", "GZOWO BOWLING 🎳"));
    screen.append(topbar);

    const card = el("div", "card myballs-editor spring-in");

    const head = el("div", "editor-head");
    const back = el("button", "btn btn-ghost", "← " + t("common.back"));
    back.addEventListener("click", () => {
      sfx("ui");
      vib(10);
      renderList();
    });
    const title = isNew
      ? t("myballs.newTitle")
      : t("myballs.editTitle").replace("{n}", String(idx + 1));
    head.append(back, el("h1", null, title));
    card.append(head);

    const previewWrap = el("div", "editor-preview");
    const preview = el("canvas", "editor-preview-disc");
    preview.style.width = "120px";
    preview.style.height = "120px";
    previewWrap.append(preview);
    card.append(previewWrap);

    const dupErr = el("div", "field-error", "");

    function repaintPreview() {
      paintDisc(preview, 240, draft);
    }

    const colorLabel = el("div", "label label-upper", t("join.ballColor"));
    const swatchRow = el("div", "swatch-row");
    const swatches = new Map();
    for (const c of BALL_COLORS) {
      const s = el("button", "swatch" + (c === draft.color ? " selected" : ""));
      s.style.background = c;
      if (colorClashes(list, c, idx)) s.classList.add("swatch-taken");
      s.addEventListener("click", () => {
        if (colorClashes(list, c, idx)) {
          shakeNode(s);
          vib([30, 30]);
          dupErr.textContent = t("myballs.dupColor");
          return;
        }
        draft.color = c;
        dupErr.textContent = "";
        for (const [cc, node] of swatches) node.classList.toggle("selected", cc === c);
        repaintChips();
        repaintPreview();
        repaintPatternSwatches();
        sfx("ui");
        vib(10);
        popNode(s);
      });
      swatches.set(c, s);
      swatchRow.append(s);
    }

    const patternLabel = el("div", "label label-upper", t("join.ballPattern"));
    const patternGrid = el("div", "pattern-grid");
    const chips = new Map();
    const chipCanvases = new Map();
    for (const p of BALL_PATTERNS) {
      const chip = el("button", "pattern-chip" + (p === draft.pattern ? " selected" : ""));
      const mini = el("canvas", "pattern-mini");
      mini.style.width = "36px";
      mini.style.height = "36px";
      chip.append(mini, el("span", null, t("join.pattern." + p)));
      chip.addEventListener("click", () => {
        draft.pattern = p;
        for (const [pp, node] of chips) node.classList.toggle("selected", pp === p);
        updatePatternColorVisibility();
        repaintPreview();
        sfx("ui");
        vib(10);
        popNode(chip);
      });
      chips.set(p, chip);
      chipCanvases.set(p, mini);
      patternGrid.append(chip);
    }
    function repaintChips() {
      for (const [p, mini] of chipCanvases) {
        paintBallDisc(mini, 72, draft.color, p, draft.weight, draft.patternColor);
      }
    }

    const patternColorLabel = el("div", "label label-upper", t("myballs.patternColor"));
    const patternColorRow = el("div", "swatch-row swatch-row-pattern");
    const patternSwatches = new Map();
    for (const c of BALL_COLORS) {
      const s = el("button", "swatch" + (c === draft.patternColor ? " selected" : ""));
      s.style.background = c;
      s.addEventListener("click", () => {
        draft.patternColor = c;
        for (const [cc, node] of patternSwatches) node.classList.toggle("selected", cc === c);
        repaintChips();
        repaintPreview();
        sfx("ui");
        vib(10);
        popNode(s);
      });
      patternSwatches.set(c, s);
      patternColorRow.append(s);
    }
    function repaintPatternSwatches() {
      for (const [cc, node] of patternSwatches) node.classList.toggle("selected", cc === draft.patternColor);
    }
    const patternColorBlock = el("div", "pattern-color-block");
    patternColorBlock.append(patternColorLabel, patternColorRow);
    function updatePatternColorVisibility() {
      patternColorBlock.style.display = draft.pattern === "solid" ? "none" : "";
    }

    const weightLabel = el("div", "label label-upper", t("join.ballWeight"));
    const weightRow = el("div", "weight-row");
    const minus = el("button", "btn btn-3d btn-round weight-step", "−");
    const plus = el("button", "btn btn-3d btn-round weight-step", "+");
    const valueWrap = el("div", "weight-value-wrap");
    const valueNum = el("div", "weight-value", String(draft.weight));
    const valueUnit = el("div", "weight-unit", t("join.weightUnit"));
    valueWrap.append(valueNum, valueUnit);
    const slider = el("input", "weight-slider");
    slider.type = "range";
    slider.min = String(BALL_WEIGHT_RANGE.MIN);
    slider.max = String(BALL_WEIGHT_RANGE.MAX);
    slider.step = "1";
    slider.value = String(draft.weight);
    function setWeight(w, bump) {
      w = Math.min(BALL_WEIGHT_RANGE.MAX, Math.max(BALL_WEIGHT_RANGE.MIN, Math.round(w)));
      if (w === draft.weight && !bump) return;
      draft.weight = w;
      valueNum.textContent = String(w);
      slider.value = String(w);
      popNode(valueNum);
      repaintChips();
      repaintPreview();
      sfx("ui");
      vib(10);
    }
    minus.addEventListener("click", () => setWeight(draft.weight - 1, true));
    plus.addEventListener("click", () => setWeight(draft.weight + 1, true));
    slider.addEventListener("input", () => setWeight(Number(slider.value)));
    weightRow.append(minus, valueWrap, plus);

    const dock = el("div", "cta-dock");
    const save = el("button", "btn btn-3d btn-pill btn-big btn-primary", t("myballs.save"));
    save.addEventListener("click", () => {
      if (colorClashes(list, draft.color, idx)) {
        shakeNode(save);
        vib([30, 30]);
        dupErr.textContent = t("myballs.dupColor");
        return;
      }
      sfx("ui");
      vib(20);
      popNode(save);
      const clean = sanitizeBall(draft);
      if (isNew) list.push(clean);
      else list[idx] = clean;
      commit();
      renderList();
    });
    dock.append(save);

    card.append(
      colorLabel, swatchRow, dupErr,
      patternLabel, patternGrid,
      patternColorBlock,
      weightLabel, weightRow, slider,
      dock
    );
    screen.append(card);
    rootEl.append(screen);

    repaintChips();
    repaintPreview();
    updatePatternColorVisibility();
  }

  renderList();
}

export function renderBallPicker(container, balls, opts) {
  const options = opts || {};
  const list = sanitizeList(balls);

  clear(container);
  const wrap = el("div", "ball-picker");
  wrap.append(el("h1", "pick-title", t("pick.title")));

  const grid = el("div", "ball-picker-grid");
  const cards = [];
  list.forEach((ball, i) => {
    const c = el("button", "ball-pick-card spring-in");
    c.style.animationDelay = (i * 70) + "ms";
    c.append(discCanvas(ball, 96));
    const meta = el("div", "ball-pick-meta");
    meta.append(el("div", "ball-pick-weight", ball.weight + " " + t("pick.weightUnit")));
    meta.append(el("div", "ball-pick-pattern", t("join.pattern." + ball.pattern)));
    c.append(meta);
    c.addEventListener("click", () => {
      for (let k = 0; k < cards.length; k++) cards[k].classList.toggle("selected", k === i);
      sfx("ui");
      vib(20);
      popNode(c);
      if (typeof options.onPick === "function") options.onPick(i);
    });
    cards.push(c);
    grid.append(c);
  });
  wrap.append(grid);
  container.append(wrap);
}
