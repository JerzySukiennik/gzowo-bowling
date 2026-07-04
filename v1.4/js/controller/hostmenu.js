// Gzowo Bowling — host hamburger menu: game commands, per-player bumpers, music controls, share on finish.
import { t } from "../i18n.js";
import * as net from "../net.js";
import { el, clear, sfx, vib, popNode, getShareCard, shareCard, downloadCard } from "./ui.js";

export function initHostMenu(rootEl, ctx) {
  if (!ctx || !ctx.isHost) {
    return { setState() {} };
  }

  let meta = null;
  let players = null;
  let game = null;
  let overlay = null;
  let modal = null;
  let sliderActive = false;

  const burger = el("button", "btn btn-icon", "☰");
  burger.setAttribute("aria-label", t("host.menu"));
  burger.addEventListener("click", () => {
    sfx("ui");
    vib(10);
    openSheet();
  });
  rootEl.append(burger);

  function closeSheet() {
    if (overlay) overlay.remove();
    overlay = null;
    modal = null;
  }

  function tile(icon, label, onTap, danger) {
    const b = el("button", "host-tile" + (danger ? " danger" : ""));
    b.append(el("span", "tile-icon", icon), el("span", null, label));
    b.addEventListener("click", () => {
      sfx("ui");
      vib(10);
      popNode(b);
      onTap();
    });
    return b;
  }

  function buildContent() {
    if (!modal) return;
    clear(modal);
    modal.append(el("div", "sheet-handle"));
    modal.append(el("h2", null, t("host.menu")));
    const state = meta ? meta.state : "lobby";

    if (state === "finished" && meta && meta.result) {
      const shareWrap = el("div", "share-block");
      const shareBtn = el("button", "btn btn-3d btn-primary btn-pill btn-big", "📤 " + t("winner.share"));
      shareBtn.addEventListener("click", async () => {
        sfx("ui");
        vib(10);
        shareBtn.disabled = true;
        const url = await getShareCard(meta.result);
        if (url) await shareCard(url);
        shareBtn.disabled = false;
      });
      const dlBtn = el("button", "btn btn-ghost", "⬇️ " + t("winner.download"));
      dlBtn.addEventListener("click", async () => {
        sfx("ui");
        const url = await getShareCard(meta.result);
        if (url) downloadCard(url);
      });
      shareWrap.append(shareBtn, dlBtn);
      modal.append(shareWrap, el("div", "sheet-section-title", ""));
    }

    const grid = el("div", "host-grid");
    const paused = state === "paused";
    grid.append(
      tile(paused ? "▶" : "⏸", paused ? t("host.resume") : t("host.pause"), () => {
        net.sendCommand(paused ? "resume" : "pause", null);
      }),
      tile("⏭", t("host.skipTurn"), () => net.sendCommand("skipTurn", null)),
      tile("↩", t("host.undo"), () => net.sendCommand("undo", null)),
      tile("🎬", t("host.replay"), () => net.sendCommand("replay", null)),
      tile("🔄", t("host.newGame"), () => {
        net.sendCommand("newGame", null);
        closeSheet();
      }),
      tile("🚪", t("host.quitGame"), () => {
        showQuitConfirm();
      }, true)
    );
    modal.append(grid);

    modal.append(el("div", "sheet-section-title", t("host.bumpers")));
    const plist = players ? Object.entries(players).sort((a, b) => (a[1].order || 0) - (b[1].order || 0)) : [];
    for (const [pid, p] of plist) {
      const row = el("div", "player-toggle-row");
      row.append(el("span", "setting-label", t("host.bumperFor", { name: p.nick || "?" })));
      const tog = el("button", "toggle" + (p.bumperOn ? " on" : ""));
      tog.addEventListener("click", () => {
        sfx("ui");
        vib(10);
        const on = !tog.classList.contains("on");
        tog.classList.toggle("on", on);
        if (state === "lobby") net.write("players/" + pid + "/bumperOn", on);
        else net.sendCommand("bumper", { playerId: pid, on });
      });
      row.append(tog);
      modal.append(row);
    }

    modal.append(el("div", "sheet-section-title", t("host.music")));
    const music = (meta && meta.music) || { playing: false, volume: 0.6, track: 0 };
    const musicRow = el("div", "music-row");
    const playBtn = el("button", "btn btn-icon", music.playing ? "⏸" : "▶");
    playBtn.setAttribute("aria-label", music.playing ? t("host.musicPause") : t("host.musicPlay"));
    playBtn.addEventListener("click", () => {
      sfx("ui");
      vib(10);
      popNode(playBtn);
      net.sendCommand("music", { action: music.playing ? "pause" : "play" });
    });
    const skipBtn = el("button", "btn btn-icon", "⏭");
    skipBtn.setAttribute("aria-label", t("host.musicSkip"));
    skipBtn.addEventListener("click", () => {
      sfx("ui");
      vib(10);
      popNode(skipBtn);
      net.sendCommand("music", { action: "skip" });
    });
    const vol = el("input", "slider");
    vol.type = "range";
    vol.min = "0";
    vol.max = "100";
    vol.value = String(Math.round((typeof music.volume === "number" ? music.volume : 0.6) * 100));
    vol.setAttribute("aria-label", t("host.musicVolume"));
    vol.addEventListener("pointerdown", () => { sliderActive = true; });
    vol.addEventListener("pointerup", () => { sliderActive = false; });
    vol.addEventListener("pointercancel", () => { sliderActive = false; });
    vol.addEventListener("change", () => {
      sliderActive = false;
      sfx("ui");
      net.sendCommand("music", { action: "volume", value: Number(vol.value) / 100 });
    });
    musicRow.append(playBtn, skipBtn, vol);
    modal.append(musicRow);

    const closeBtn = el("button", "btn btn-ghost btn-big", t("common.close"));
    closeBtn.style.marginTop = "16px";
    closeBtn.addEventListener("click", () => {
      sfx("ui");
      closeSheet();
    });
    modal.append(closeBtn);
  }

  function showQuitConfirm() {
    if (!modal) return;
    clear(modal);
    modal.append(el("div", "sheet-handle"));
    const box = el("div", "quit-confirm");
    box.append(
      el("div", "canceled-icon", "🛑"),
      el("h2", null, t("host.quitConfirmTitle")),
      el("p", "muted", t("host.quitConfirmBody"))
    );
    const yes = el("button", "btn btn-3d btn-primary btn-pill btn-big btn-danger", t("host.quitConfirmYes"));
    yes.addEventListener("click", () => {
      sfx("ui");
      vib([20, 30]);
      net.sendCommand("quit", null);
      closeSheet();
    });
    const no = el("button", "btn btn-ghost btn-big", t("host.quitConfirmNo"));
    no.addEventListener("click", () => {
      sfx("ui");
      vib(10);
      buildContent();
    });
    box.append(yes, no);
    modal.append(box);
  }

  function openSheet() {
    closeSheet();
    overlay = el("div", "overlay");
    modal = el("div", "modal");
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) closeSheet();
    });
    overlay.append(modal);
    document.body.append(overlay);
    buildContent();
  }

  return {
    setState(m, p, g) {
      meta = m;
      players = p;
      game = g;
      if (modal && !sliderActive) buildContent();
    },
  };
}
