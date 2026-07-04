// Gzowo Bowling — emote bar: 8 emoji buttons, fly-up feedback, animated cooldown ring, sends emote events.
import { EMOTES, TIMING } from "../config.js";
import * as net from "../net.js";
import { el, sfx, vib, popNode, shakeNode } from "./ui.js";

export function initEmotes(rootEl) {
  const bar = el("div", "emote-bar");
  let cooling = false;
  let coolRaf = 0;

  function startCooldown() {
    cooling = true;
    bar.classList.add("cooling");
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / TIMING.EMOTE_COOLDOWN_MS);
      bar.style.setProperty("--cd", String(Math.round(p * 100)));
      if (p < 1) {
        coolRaf = requestAnimationFrame(tick);
      } else {
        cooling = false;
        bar.classList.remove("cooling");
        bar.style.setProperty("--cd", "0");
        sfx("ui");
        for (const b of bar.querySelectorAll(".emote-btn")) popNode(b);
      }
    };
    cancelAnimationFrame(coolRaf);
    coolRaf = requestAnimationFrame(tick);
  }

  for (const emote of EMOTES) {
    const btn = el("button", "emote-btn", emote.char);
    btn.addEventListener("click", () => {
      if (cooling) return;
      popNode(btn);
      sfx(emote.sfx || "emote");
      vib(10);
      const fly = el("span", "emote-fly", emote.char);
      fly.style.left = btn.offsetLeft + 8 + "px";
      fly.style.top = btn.offsetTop + "px";
      bar.append(fly);
      setTimeout(() => fly.remove(), 1000);
      net.sendEmote(emote.id);
      startCooldown();
    });
    bar.append(btn);
  }

  bar.addEventListener("click", (ev) => {
    if (cooling && !ev.target.closest(".emote-btn")) shakeNode(bar);
  });

  rootEl.append(bar);
}
