(function () {
  "use strict";

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Reproduz um tom suave de conclusão usando a Web Audio API */
  function playCompletionSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0, now + i * 0.1);
        gain.gain.linearRampToValueAtTime(0.08, now + i * 0.1 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
      });
    } catch (e) {}
  }

  /** Pede ao background o secUid (lido no mundo MAIN da página com múltiplos fallbacks). */
  function getSecUidAsync() {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({ action: "getSecUid" }, function (response) {
        resolve(response && response.secUid ? response.secUid : null);
      });
    });
  }

  /** Busca a lista de vídeos de acordo com o tipo (reposts, likes, favorites) */
  async function fetchItems(targetType, cursor, secUid) {
    if (!secUid) return null;

    let url;
    if (targetType === "likes") {
      const params = new URLSearchParams({
        aid: "1988",
        count: "30",
        coverFormat: "2",
        cursor: String(cursor),
        secUid,
      });
      url = `https://www.tiktok.com/api/favorite/item_list/?${params.toString()}`;
    } else if (targetType === "favorites") {
      const params = new URLSearchParams({
        aid: "1988",
        count: "30",
        coverFormat: "2",
        cursor: String(cursor),
        secUid,
      });
      url = `https://www.tiktok.com/api/user/collect/item_list/?${params.toString()}`;
    } else {
      // Default: reposts
      const params = new URLSearchParams({
        aid: "1988",
        count: "30",
        coverFormat: "2",
        cursor: String(cursor),
        needPinnedItemIds: "true",
        post_item_list_request_type: "0",
        secUid,
      });
      url = `https://www.tiktok.com/api/repost/item_list/?${params.toString()}`;
    }

    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "*/*" },
      credentials: "include",
    });

    const raw = await res.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      console.error("TikTok Cleaner - Resposta não é JSON:", e, raw.slice(0, 200));
      return null;
    }

    if (json.status_code !== 0) {
      console.error("TikTok Cleaner - fetchItems erro:", json);
      return null;
    }

    const itemList = json.itemList || json.items || [];
    const items = itemList.map((e) => ({
      id: e.id || e.aweme_id,
      authorName: `@${e.author?.uniqueId || e.author?.unique_id || ""}`,
      desc: e.desc || "",
      url: `https://www.tiktok.com/@${e.author?.uniqueId || e.author?.unique_id || ""}/video/${e.id || e.aweme_id}`,
    }));

    return {
      hasMore: !!json.hasMore,
      nextCursor: json.cursor != null ? String(json.cursor) : null,
      items,
    };
  }

  /** Remove/desfaz a ação do item de acordo com o tipo */
  async function removeItem(targetType, itemId, retries = 2) {
    let url;
    if (targetType === "likes") {
      const params = new URLSearchParams({
        aid: "1988",
        aweme_id: String(itemId),
        item_id: String(itemId),
        type: "0", // 0 = unlike
      });
      url = `https://www.tiktok.com/api/commit/item/digg/?${params.toString()}`;
    } else if (targetType === "favorites") {
      const params = new URLSearchParams({
        aid: "1988",
        item_id: String(itemId),
        action: "0", // 0 = uncollect / remove from favorites
      });
      url = `https://www.tiktok.com/api/user/collect/item/action/?${params.toString()}`;
    } else {
      // Default: reposts
      const params = new URLSearchParams({
        aid: "1988",
        item_id: String(itemId),
      });
      url = `https://www.tiktok.com/tiktok/v1/upvote/delete?${params.toString()}`;
    }

    let lastErr;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          credentials: "include",
          body: "",
        });

        if (res.status === 429) {
          throw new Error("HTTP 429: Rate limited");
        }

        const raw = await res.text();
        let json;
        try {
          json = JSON.parse(raw);
        } catch (e) {
          throw new Error("Resposta não é JSON: " + raw.slice(0, 100));
        }

        if (json.status_code !== 0 && json.status_code !== 200) {
          throw new Error("removeItem status_code: " + json.status_code + " - " + (json.status_msg || JSON.stringify(json)));
        }

        return true;
      } catch (e) {
        lastErr = e;
        if (attempt < retries) await sleep(2000);
      }
    }
    throw lastErr;
  }

  function parseList(str) {
    if (!str || !String(str).trim()) return [];
    return String(str)
      .split(",")
      .map((s) => s.trim().replace(/^@/, ""))
      .filter(Boolean)
      .map((s) => s.toLowerCase());
  }

  function matchesKeywords(desc, keywordList) {
    if (keywordList.length === 0) return true;
    const text = (desc || "").toLowerCase();
    return keywordList.some((k) => text.includes(k));
  }

  function matchesCreator(authorName, creatorList, mode) {
    if (creatorList.length === 0) return true;
    const cleanAuthor = (authorName || "").replace(/^@/, "").toLowerCase();
    const isIncluded = creatorList.includes(cleanAuthor);
    return mode === "exclude" ? !isIncluded : isIncluded;
  }

  function randomDelayMs(config) {
    if (config.requestIntervalMode === "set") {
      const arr = config.requestIntervalSet || [1, 3, 5];
      const v = arr[Math.floor(Math.random() * arr.length)] ?? 1;
      return Math.max(0, v) * 1000;
    }
    const { min = 1, max = 3 } = config.requestIntervalRange || {};
    const a = Math.max(0, min);
    const b = Math.max(a, max);
    const sec = a + Math.random() * (b - a);
    return sec * 1000;
  }

  function formatEta(seconds) {
    if (!seconds || seconds <= 0 || !isFinite(seconds)) return "--";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 60) {
      const h = Math.floor(m / 60);
      return `~${h}h ${m % 60}m`;
    }
    return m > 0 ? `~${m}m ${s}s` : `~${s}s`;
  }

  function substitutePlaceholders(str, vals) {
    if (!str || !vals) return str || "";
    let s = str;
    vals.forEach((v, i) => {
      s = s.replace(new RegExp("\\$" + (i + 1) + "\\$", "g"), String(v));
    });
    return s;
  }

  function createInPagePanel(i18n, isDryRun, targetType) {
    const t = i18n || {};
    const id = "tiktok-reposts-remover-panel";
    let existing = document.getElementById(id);
    if (existing) existing.remove();

    let targetLabel = "Reposts";
    if (targetType === "likes") targetLabel = "Likes";
    else if (targetType === "favorites") targetLabel = "Favorites";

    const panel = document.createElement("div");
    panel.id = id;
    panel.innerHTML = `
      <div class="trr-header">
        <div class="trr-title-group">
          <span class="trr-title">${t.panelTitle || "TikTok Cleaner"} [${targetLabel}]</span>
          ${isDryRun ? `<span class="trr-badge-dry">${t.dryRunBadge || "SIMULATION"}</span>` : ""}
        </div>
        <div class="trr-header-actions">
          <button type="button" class="trr-btn-icon" id="trr-min-btn" title="${t.panelMinimize || "Minimize"}">_</button>
          <button type="button" class="trr-btn-icon trr-close" id="trr-close-btn" title="${t.panelClose || "Close"}">×</button>
        </div>
      </div>
      <div class="trr-body" id="trr-body">
        <div class="trr-progress-container">
          <div class="trr-progress-bar">
            <div class="trr-progress-fill" id="trr-progress-fill"></div>
          </div>
        </div>
        <div class="trr-status" id="trr-status">${t.statusPreparing || "Preparing…"}</div>
        <div class="trr-current-card" id="trr-current-card" style="display: none;">
          <div class="trr-current-author" id="trr-current-author"></div>
          <div class="trr-current-desc" id="trr-current-desc"></div>
        </div>
        <div class="trr-stats-grid" id="trr-stats-grid">
          <div class="trr-stat-pill"><span class="trr-stat-label">${t.statsPages || "Pages"}:</span> <span id="trr-stat-pages" class="trr-stat-val">0</span></div>
          <div class="trr-stat-pill trr-pill-accent"><span class="trr-stat-label">${isDryRun ? (t.statsListed || "Listed") : (t.statsRemoved || "Processed")}:</span> <span id="trr-stat-removed" class="trr-stat-val">0</span></div>
          <div class="trr-stat-pill"><span class="trr-stat-label">${t.statsSkipped || "Skipped"}:</span> <span id="trr-stat-skipped" class="trr-stat-val">0</span></div>
          <div class="trr-stat-pill trr-pill-warn"><span class="trr-stat-label">${t.statsFailed || "Failed"}:</span> <span id="trr-stat-failed" class="trr-stat-val">0</span></div>
          <div class="trr-stat-pill trr-pill-eta"><span class="trr-stat-label">${t.statsEta || "ETA"}:</span> <span id="trr-stat-eta" class="trr-stat-val">--</span></div>
        </div>
        <div class="trr-actions">
          <button type="button" class="trr-btn trr-pause" id="trr-pause-btn">${t.btnPause || "Pause"}</button>
          <button type="button" class="trr-btn trr-download" id="trr-download-btn" disabled>${t.btnDownloadReport || "Download report"}</button>
        </div>
      </div>
      <div class="trr-minimized" id="trr-minimized" style="display: none;">
        <span class="trr-min-text" id="trr-min-text">🧹 TRR: 0 / 0</span>
        <button type="button" class="trr-btn-icon" id="trr-expand-btn" title="${t.panelExpand || "Expand"}">↕</button>
      </div>
    `;

    Object.assign(panel.style, {
      position: "fixed",
      top: "16px",
      right: "16px",
      width: "340px",
      maxWidth: "calc(100vw - 32px)",
      background: "rgba(13, 13, 13, 0.95)",
      backdropFilter: "blur(12px)",
      webkitBackdropFilter: "blur(12px)",
      border: "1px solid #2a2a2a",
      borderRadius: "14px",
      boxShadow: "0 16px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)",
      zIndex: "2147483647",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "13px",
      color: "#f2f2f2",
      overflow: "hidden",
      animation: "trr-slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    });

    const sheet = document.createElement("style");
    sheet.textContent = `
      @keyframes trr-slideIn {
        from { opacity: 0; transform: translateY(-12px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      #tiktok-reposts-remover-panel {
        border-top: 3px solid #00f2ea;
      }
      .trr-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        background: #161616;
        border-bottom: 1px solid #262626;
        cursor: move;
        user-select: none;
      }
      .trr-title-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .trr-title {
        font-weight: 600;
        font-size: 12.5px;
        color: #00f2ea;
        letter-spacing: -0.01em;
      }
      .trr-badge-dry {
        font-size: 9.5px;
        font-weight: 700;
        padding: 2px 6px;
        background: #ffaa00;
        color: #000;
        border-radius: 4px;
        letter-spacing: 0.05em;
      }
      .trr-header-actions {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .trr-btn-icon {
        background: none;
        border: none;
        color: #888;
        cursor: pointer;
        font-size: 15px;
        line-height: 1;
        padding: 4px 6px;
        border-radius: 4px;
        transition: color 0.15s, background 0.15s;
      }
      .trr-btn-icon:hover {
        color: #fff;
        background: #252525;
      }
      .trr-progress-container {
        padding: 10px 14px 0;
      }
      .trr-progress-bar {
        height: 5px;
        background: #222;
        border-radius: 3px;
        overflow: hidden;
      }
      .trr-progress-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #ff0050, #00f2ea);
        border-radius: 3px;
        transition: width 0.3s ease;
      }
      .trr-status {
        padding: 10px 14px;
        min-height: 20px;
        font-size: 12.5px;
        line-height: 1.4;
        color: #e6e6e6;
        word-break: break-word;
      }
      .trr-current-card {
        margin: 0 14px 10px;
        padding: 8px 10px;
        background: #181818;
        border: 1px solid #282828;
        border-radius: 8px;
        font-size: 11.5px;
      }
      .trr-current-author {
        font-weight: 600;
        color: #00f2ea;
        margin-bottom: 2px;
      }
      .trr-current-desc {
        color: #aaa;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .trr-stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 6px;
        padding: 0 14px 10px;
      }
      .trr-stat-pill {
        background: #181818;
        border: 1px solid #252525;
        border-radius: 6px;
        padding: 4px 6px;
        font-size: 11px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .trr-pill-accent { border-color: rgba(0, 242, 234, 0.3); }
      .trr-pill-accent .trr-stat-val { color: #00f2ea; font-weight: 600; }
      .trr-pill-warn { border-color: rgba(255, 0, 80, 0.3); }
      .trr-pill-warn .trr-stat-val { color: #ff0050; font-weight: 600; }
      .trr-stat-label { color: #888; font-size: 10px; }
      .trr-stat-val { font-weight: 500; }
      .trr-actions {
        display: flex;
        gap: 8px;
        padding: 10px 14px;
        border-top: 1px solid #242424;
      }
      .trr-btn {
        flex: 1;
        padding: 8px 12px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 12.5px;
        font-weight: 600;
        transition: opacity 0.15s, background 0.15s;
      }
      .trr-pause {
        background: #ff0050;
        color: #fff;
      }
      .trr-pause:hover { background: #ff1a5c; }
      .trr-pause.resumed {
        background: #00f2ea;
        color: #0d0d0d;
      }
      .trr-pause.resumed:hover { background: #33f5ed; }
      .trr-download {
        background: #1f1f1f;
        color: #f2f2f2;
        border: 1px solid #2d2d2d;
      }
      .trr-download:hover:not(:disabled) { background: #2a2a2a; color: #fff; }
      .trr-download:disabled { opacity: 0.45; cursor: not-allowed; }
      .trr-minimized {
        padding: 8px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        cursor: pointer;
      }
      .trr-min-text {
        font-size: 12px;
        font-weight: 600;
        color: #00f2ea;
      }
    `;
    (document.head || document.documentElement).appendChild(sheet);

    var root = document.documentElement || document.body;
    if (root) root.appendChild(panel);

    // Drag
    const header = panel.querySelector(".trr-header");
    if (header) {
      let startX = 0, startY = 0, startTop = 0, startLeft = 0;
      header.onmousedown = (e) => {
        if (e.target.closest("button")) return;
        e.preventDefault();
        const rect = panel.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startTop = rect.top + window.scrollY;
        startLeft = rect.left + window.scrollX;

        panel.style.top = startTop + "px";
        panel.style.left = startLeft + "px";
        panel.style.right = "auto";

        const onMouseMove = (ev) => {
          ev.preventDefault();
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          panel.style.top = Math.max(0, startTop + dy) + "px";
          panel.style.left = Math.max(0, startLeft + dx) + "px";
        };

        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      };
    }

    // Minimize / Expand
    const bodyEl = panel.querySelector("#trr-body");
    const minEl = panel.querySelector("#trr-minimized");
    const minBtn = panel.querySelector("#trr-min-btn");
    const expBtn = panel.querySelector("#trr-expand-btn");

    const toggleMin = (minimize) => {
      if (minimize) {
        bodyEl.style.display = "none";
        minEl.style.display = "flex";
        panel.style.width = "auto";
      } else {
        bodyEl.style.display = "block";
        minEl.style.display = "none";
        panel.style.width = "340px";
      }
    };

    if (minBtn) minBtn.onclick = () => toggleMin(true);
    if (expBtn) expBtn.onclick = () => toggleMin(false);
    if (minEl) minEl.ondblclick = () => toggleMin(false);

    return panel;
  }

  function updatePanel(panel, state, i18n) {
    const t = i18n || {};
    const statusEl = panel.querySelector("#trr-status");
    const pagesEl = panel.querySelector("#trr-stat-pages");
    const removedEl = panel.querySelector("#trr-stat-removed");
    const skippedEl = panel.querySelector("#trr-stat-skipped");
    const failedEl = panel.querySelector("#trr-stat-failed");
    const etaEl = panel.querySelector("#trr-stat-eta");
    const progressFill = panel.querySelector("#trr-progress-fill");
    const pauseBtn = panel.querySelector("#trr-pause-btn");
    const downloadBtn = panel.querySelector("#trr-download-btn");
    const minText = panel.querySelector("#trr-min-text");

    const currentCard = panel.querySelector("#trr-current-card");
    const currentAuthor = panel.querySelector("#trr-current-author");
    const currentDesc = panel.querySelector("#trr-current-desc");

    if (statusEl) statusEl.textContent = state.status || "—";
    if (pagesEl) pagesEl.textContent = state.pages || 0;
    if (removedEl) removedEl.textContent = state.removed || 0;
    if (skippedEl) skippedEl.textContent = state.skipped || 0;
    if (failedEl) failedEl.textContent = state.failed || 0;
    if (etaEl) etaEl.textContent = state.eta || "--";

    if (minText) {
      minText.textContent = `🧹 TRR: ${state.removed || 0} proc · ${state.eta || "--"}`;
    }

    if (progressFill && state.totalCandidates > 0) {
      const pct = Math.min(100, Math.round(((state.removed + state.failed) / state.totalCandidates) * 100));
      progressFill.style.width = `${pct}%`;
    }

    if (currentCard && currentAuthor && currentDesc) {
      if (state.currentItem) {
        currentCard.style.display = "block";
        currentAuthor.textContent = state.currentItem.authorName || "";
        currentDesc.textContent = state.currentItem.desc || "(sin descripción)";
      } else {
        currentCard.style.display = "none";
      }
    }

    if (pauseBtn) {
      pauseBtn.textContent = state.paused ? (t.btnResume || "Resume") : (t.btnPause || "Pause");
      pauseBtn.classList.toggle("resumed", !!state.paused);
      pauseBtn.disabled = !!state.disablePause;
    }

    if (downloadBtn) {
      downloadBtn.disabled = !state.reportReady;
      const baseLabel = t.btnDownloadReport || "Download report";
      const total = (state.removed || 0) + (state.failed || 0) + (state.skipped || 0);
      downloadBtn.textContent = state.reportReady && total > 0
        ? `${baseLabel} (${state.removed || 0}${state.failed > 0 ? `, ${state.failed} err` : ""})`
        : baseLabel;
    }
  }

  function buildReport(removedItems, failedItems, skippedItems, format, targetType) {
    const removed = removedItems || [];
    const failed = failedItems || [];
    const skipped = skippedItems || [];

    if (format === "csv") {
      const headers = ["id", "authorName", "desc", "url", "type", "status", "timestamp"];
      const now = new Date().toISOString();
      const row = (i, status) => [
        i.id,
        i.authorName,
        (i.desc || "").replace(/\s+/g, " ").replace(/"/g, '""'),
        i.url,
        targetType || "item",
        status,
        now,
      ];
      const rows = removed.map((i) => row(i, "removed"))
        .concat(failed.map((i) => row(i, "failed")))
        .concat(skipped.map((i) => row(i, "skipped_filter")));

      return headers.join(",") + "\n" + rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    }

    return JSON.stringify({ type: targetType, removed, failed, skipped }, null, 2);
  }

  function downloadReport(content, format, targetType) {
    const ext = format === "csv" ? "csv" : "json";
    const mime = format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tiktok-${targetType || "cleaner"}-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const MAX_CONSECUTIVE_FAILURES = 5;
  const COOLDOWN_SECONDS = 35;
  const MAX_COOLDOWNS = 3;

  let panelState = {
    status: "Preparando...",
    pages: 0,
    removed: 0,
    skipped: 0,
    failed: 0,
    totalListed: 0,
    totalCandidates: 0,
    paused: false,
    disablePause: false,
    reportReady: false,
    reportItems: [],
    reportFailedItems: [],
    reportSkippedItems: [],
    reportFormat: "json",
    currentItem: null,
    eta: "--",
  };

  async function runRemoval(config) {
    config = config || {};
    const isDryRun = !!config.dryRun;
    const targetType = config.targetType || "reposts";
    const t = config.i18n || {};

    const panel = createInPagePanel(t, isDryRun, targetType);
    if (!panel || !panel.parentNode) {
      console.error("TikTok Cleaner: não foi possível criar o painel.");
      return;
    }

    const keywordList = parseList(config.keywordsFilter || "");
    const creatorList = parseList(config.creatorsFilter || "");
    const creatorMode = config.creatorMode || "only";
    const maxLimit = config.maxRemovals || 0;

    panelState.reportFormat = config.exportFileType || "json";
    panelState.reportItems = [];
    panelState.reportFailedItems = [];
    panelState.reportSkippedItems = [];
    panelState.removed = 0;
    panelState.skipped = 0;
    panelState.failed = 0;
    panelState.disablePause = false;
    panelState.pages = 0;
    panelState.totalListed = 0;
    panelState.totalCandidates = 0;
    panelState.paused = false;
    panelState.reportReady = false;
    panelState.currentItem = null;
    panelState.eta = "--";

    const pauseBtn = panel.querySelector("#trr-pause-btn");
    const downloadBtn = panel.querySelector("#trr-download-btn");
    const closeBtn = panel.querySelector("#trr-close-btn");

    pauseBtn.onclick = () => {
      panelState.paused = !panelState.paused;
      panelState.status = panelState.paused ? (t.statusPaused || "Paused") : (t.statusResuming || "Resuming…");
      updatePanel(panel, panelState, t);
    };

    downloadBtn.onclick = () => {
      const content = buildReport(
        panelState.reportItems,
        panelState.reportFailedItems,
        panelState.reportSkippedItems,
        panelState.reportFormat,
        targetType
      );
      downloadReport(content, panelState.reportFormat, targetType);
    };

    closeBtn.onclick = () => panel.remove();

    const setStatus = (s) => {
      panelState.status = s;
      updatePanel(panel, panelState, t);
    };

    try {
      if (config.notLoggedInRedirect) {
        panelState.paused = true;
        panelState.disablePause = true;
        setStatus(t.statusErrorRedirectedForyou || "Please log in to TikTok first.");
        updatePanel(panel, panelState, t);
        return;
      }

      setStatus(t.statusWaiting || "Identificando sua conta…");
      let secUid = await getSecUidAsync();
      if (!secUid) {
        for (let i = 0; i < 12; i++) {
          await sleep(1500);
          secUid = await getSecUidAsync();
          if (secUid) break;
        }
      }

      if (!secUid) {
        const onForyou = /\/foryou(\?|$)/i.test(window.location.href);
        const msg = onForyou
          ? (t.statusErrorRedirectedForyou || "Please log in to TikTok.")
          : (t.statusErrorNoAccount || "Could not identify your account.");
        panelState.paused = true;
        panelState.disablePause = true;
        setStatus(msg);
        updatePanel(panel, panelState, t);
        return;
      }

      let cursor = "0";
      let page = 1;
      const pagePauseMs = Math.max(0, (config.pagePauseSeconds ?? 5)) * 1000;
      let consecutiveFailures = 0;
      let cooldownCount = 0;
      let startTime = Date.now();
      let processedCount = 0;

      setStatus(t.statusListing || "Listing items…");

      while (true) {
        while (panelState.paused) await sleep(500);

        if (isDryRun) {
          setStatus(substitutePlaceholders(t.statusDryRunListing, [page, panelState.totalListed]) || `Scanning page ${page}...`);
        }

        const result = await fetchItems(targetType, cursor, secUid);
        if (!result || !result.items || result.items.length === 0) {
          const finalMsg = isDryRun
            ? (substitutePlaceholders(t.statusDryRunDone, [panelState.totalListed]) || "Simulation complete!")
            : (t.statusDone || "Done! All items processed.");
          setStatus(finalMsg);
          panelState.reportReady = true;
          panelState.currentItem = null;
          panelState.eta = "0s";
          updatePanel(panel, panelState, t);
          playCompletionSound();
          chrome.runtime.sendMessage({
            action: "notifyFinished",
            payload: {
              title: t.panelTitle || "TikTok Cleaner",
              message: substitutePlaceholders(t.notificationFinished, [panelState.removed || panelState.totalListed]),
            },
          }).catch(() => {});
          break;
        }

        panelState.pages = page;
        panelState.totalListed += result.items.length;

        // Filtrar itens
        const candidates = [];
        for (const item of result.items) {
          const matchKw = matchesKeywords(item.desc, keywordList);
          const matchCr = matchesCreator(item.authorName, creatorList, creatorMode);
          if (matchKw && matchCr) {
            candidates.push(item);
          } else {
            panelState.skipped++;
            panelState.reportSkippedItems.push(item);
          }
        }

        panelState.totalCandidates += candidates.length;

        if (isDryRun) {
          for (const item of candidates) {
            panelState.removed++;
            panelState.reportItems.push(item);
          }
          panelState.reportReady = true;
          updatePanel(panel, panelState, t);
          await sleep(1000);
        } else {
          const statusMsg = substitutePlaceholders(t.statusPageRemoving, [page, candidates.length, result.items.length])
            || `Page ${page}: processing ${candidates.length} items…`;
          setStatus(statusMsg);

          let stoppedDueToFailures = false;

          for (const item of candidates) {
            while (panelState.paused) await sleep(500);

            if (maxLimit > 0 && panelState.removed >= maxLimit) {
              const limitMsg = substitutePlaceholders(t.statusLimitReached, [maxLimit]) || `Reached limit of ${maxLimit}.`;
              setStatus(limitMsg);
              panelState.reportReady = true;
              panelState.currentItem = null;
              updatePanel(panel, panelState, t);
              playCompletionSound();
              chrome.runtime.sendMessage({
                action: "notifyFinished",
                payload: {
                  title: t.panelTitle || "TikTok Cleaner",
                  message: substitutePlaceholders(t.notificationLimit, [maxLimit]),
                },
              }).catch(() => {});
              return;
            }

            panelState.currentItem = item;
            updatePanel(panel, panelState, t);

            try {
              await removeItem(targetType, item.id);
              consecutiveFailures = 0;
              panelState.removed++;
              processedCount++;
              panelState.reportItems.push(item);
              panelState.reportReady = true;

              const elapsedSec = (Date.now() - startTime) / 1000;
              const avgPerItem = elapsedSec / Math.max(1, processedCount);
              const remainingItems = maxLimit > 0
                ? Math.max(0, maxLimit - panelState.removed)
                : Math.max(1, candidates.length - candidates.indexOf(item));
              panelState.eta = formatEta(remainingItems * avgPerItem);

              updatePanel(panel, panelState, t);
            } catch (e) {
              console.error("TikTok Cleaner - Erro ao remover:", item.id, e);
              consecutiveFailures++;
              panelState.failed++;
              panelState.reportFailedItems.push(item);
              panelState.reportReady = true;

              setStatus(substitutePlaceholders(t.statusErrorRemove, [item.authorName]) || `Error removing ${item.authorName}`);
              updatePanel(panel, panelState, t);

              if (consecutiveFailures >= 3 && cooldownCount < MAX_COOLDOWNS) {
                cooldownCount++;
                for (let cd = COOLDOWN_SECONDS; cd > 0; cd--) {
                  while (panelState.paused) await sleep(500);
                  setStatus(substitutePlaceholders(t.statusCooldown, [cd]) || `Cooldown: ${cd}s...`);
                  await sleep(1000);
                }
                consecutiveFailures = 0;
              } else if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                panelState.paused = true;
                panelState.disablePause = true;
                setStatus(substitutePlaceholders(t.statusStoppedFailures, [MAX_CONSECUTIVE_FAILURES])
                  || `Stopped after ${MAX_CONSECUTIVE_FAILURES} consecutive failures.`);
                updatePanel(panel, panelState, t);
                stoppedDueToFailures = true;
                break;
              }
            }

            const delay = randomDelayMs(config);
            await sleep(delay);
          }

          if (stoppedDueToFailures) {
            panelState.paused = true;
            panelState.disablePause = true;
            updatePanel(panel, panelState, t);
            break;
          }
        }

        if (!result.hasMore || !result.nextCursor) {
          const finalMsg = isDryRun
            ? (substitutePlaceholders(t.statusDryRunDone, [panelState.totalListed]) || "Simulation complete!")
            : (t.statusDone || "Done! All items processed.");
          setStatus(finalMsg);
          panelState.reportReady = true;
          panelState.currentItem = null;
          panelState.eta = "0s";
          updatePanel(panel, panelState, t);
          playCompletionSound();
          chrome.runtime.sendMessage({
            action: "notifyFinished",
            payload: {
              title: t.panelTitle || "TikTok Cleaner",
              message: substitutePlaceholders(t.notificationFinished, [panelState.removed || panelState.totalListed]),
            },
          }).catch(() => {});
          break;
        }

        cursor = result.nextCursor;
        page++;
        panelState.currentItem = null;
        setStatus((t.statusBetweenPages || "Pause before next page…") + " (" + page + ")");
        updatePanel(panel, panelState, t);
        await sleep(pagePauseMs);
      }
    } catch (err) {
      console.error("TikTok Cleaner:", err);
      if (panel && panel.querySelector("#trr-status")) {
        panel.querySelector("#trr-status").textContent = "Erro: " + (err.message || String(err));
      }
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === "startRemovingReposts") {
      try {
        runRemoval(msg.config);
        sendResponse({ ok: true });
      } catch (e) {
        console.error("TikTok Cleaner:", e);
        sendResponse({ ok: false, error: String(e) });
      }
    }
    return true;
  });
})();
