(function () {
  "use strict";

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Pede ao background o secUid (lido no mundo MAIN da página, sem script inline bloqueado pela CSP). */
  function getSecUidAsync() {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({ action: "getSecUid" }, function (response) {
        resolve(response && response.secUid ? response.secUid : null);
      });
    });
  }

  async function getRepostItems(cursor, secUid) {
    if (!secUid) return null;

    const params = new URLSearchParams({
      aid: "1988",
      count: "30",
      coverFormat: "2",
      cursor: String(cursor),
      needPinnedItemIds: "true",
      post_item_list_request_type: "0",
      secUid,
    });

    const url = `https://www.tiktok.com/api/repost/item_list/?${params.toString()}`;
    const res = await fetch(url, {
      method: "GET",
      headers: { accept: "*/*" },
    });

    const raw = await res.text();
    let json;
    try {
      json = JSON.parse(raw);
    } catch (e) {
      console.error("Resposta não é JSON válido:", e, raw.slice(0, 200));
      return null;
    }

    if (json.status_code !== 0) {
      console.error("getRepostItems erro:", json);
      return null;
    }

    const items = (json.itemList || []).map((e) => ({
      id: e.id,
      authorName: `@${e.author?.uniqueId ?? ""}`,
      desc: e.desc || "",
      url: `https://www.tiktok.com/@${e.author?.uniqueId ?? ""}/video/${e.id}`,
    }));

    return {
      hasMore: !!json.hasMore,
      nextCursor: json.cursor != null ? String(json.cursor) : null,
      items,
    };
  }

  async function removeRepostItem(itemId, retries = 2) {
    const params = new URLSearchParams({
      aid: "1988",
      item_id: String(itemId),
    });

    const url = `https://www.tiktok.com/tiktok/v1/upvote/delete?${params.toString()}`;
    let lastErr;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: "",
        });

        const raw = await res.text();
        let json;
        try {
          json = JSON.parse(raw);
        } catch (e) {
          throw new Error("Resposta não é JSON: " + raw.slice(0, 100));
        }

        if (json.status_code !== 0) {
          throw new Error("removeRepost erro: " + JSON.stringify(json));
        }

        return true;
      } catch (e) {
        lastErr = e;
        if (attempt < retries) await sleep(2000);
      }
    }
    throw lastErr;
  }

  function parseKeywords(str) {
    if (!str || !String(str).trim()) return [];
    return String(str)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.toLowerCase());
  }

  function matchesKeywords(desc, keywordList) {
    if (keywordList.length === 0) return true;
    const text = (desc || "").toLowerCase();
    return keywordList.some((k) => text.includes(k));
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

  function createInPagePanel(i18n) {
    const t = i18n || {};
    const id = "tiktok-reposts-remover-panel";
    if (document.getElementById(id)) return document.getElementById(id);

    const panel = document.createElement("div");
    panel.id = id;
    panel.innerHTML = `
      <div class="trr-header">
        <span class="trr-title">${t.panelTitle || "TikTok Reposts Remover"}</span>
        <button type="button" class="trr-close" aria-label="${t.panelClose || "Close"}">×</button>
      </div>
      <div class="trr-status" id="trr-status">${t.statusPreparing || "Preparing…"}</div>
      <div class="trr-stats" id="trr-stats"></div>
      <div class="trr-actions">
        <button type="button" class="trr-btn trr-pause" id="trr-pause-btn">${t.btnPause || "Pause"}</button>
        <button type="button" class="trr-btn trr-download" id="trr-download-btn" disabled>${t.btnDownloadReport || "Download report"}</button>
      </div>
    `;

    Object.assign(panel.style, {
      position: "fixed",
      top: "16px",
      right: "16px",
      width: "320px",
      maxWidth: "calc(100vw - 32px)",
      background: "#0d0d0d",
      border: "1px solid #2a2a2a",
      borderRadius: "12px",
      boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      zIndex: "2147483647",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "13px",
      color: "#f2f2f2",
      overflow: "hidden",
      animation: "trr-slideIn 0.35s ease-out",
    });

    const sheet = document.createElement("style");
    sheet.textContent = `
      @keyframes trr-slideIn {
        from { opacity: 0; transform: translateX(24px); }
        to { opacity: 1; transform: translateX(0); }
      }
      #tiktok-reposts-remover-panel {
        border-left: 3px solid #00f2ea;
      }
      .trr-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; background: #161616; border-bottom: 1px solid #2a2a2a; cursor: move; user-select: none; -webkit-user-select: none; }
      .trr-title { font-weight: 600; font-size: 13px; color: #00f2ea; letter-spacing: -0.02em; }
      .trr-close { background: none; border: none; color: #888; cursor: pointer; font-size: 20px; line-height: 1; padding: 0 2px; flex-shrink: 0; transition: color 0.2s; }
      .trr-close:hover { color: #fff; }
      .trr-status { padding: 12px 14px; min-height: 20px; font-size: 13px; line-height: 1.4; color: #e0e0e0; }
      .trr-stats { padding: 0 14px 10px; color: #888; font-size: 12px; }
      .trr-actions { display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid #2a2a2a; }
      .trr-btn { padding: 9px 14px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: opacity 0.2s, background 0.2s; }
      .trr-pause { background: #ff0050; color: #fff; }
      .trr-pause:hover { background: #ff1a5c; }
      .trr-pause.resumed { background: #00f2ea; color: #0d0d0d; }
      .trr-pause.resumed:hover { background: #33f5ed; }
      .trr-download { background: #1c1c1c; color: #f2f2f2; border: 1px solid #2a2a2a; }
      .trr-download:hover:not(:disabled) { background: #252525; }
      .trr-download:disabled { opacity: 0.5; cursor: not-allowed; }
    `;
    (document.head || document.documentElement).appendChild(sheet);

    // Anexa ao <html> para o React do TikTok não remover o painel ao re-renderizar o body
    var root = document.documentElement;
    if (!root && document.body) {
      root = document.body;
    }
    if (root) {
      root.appendChild(panel);
    }

    const drag = (el) => {
      const header = el.querySelector(".trr-header");
      if (!header) return;

      let startX = 0;
      let startY = 0;
      let startTop = 0;
      let startLeft = 0;

      header.onmousedown = (e) => {
        e.preventDefault();

        const rect = el.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startTop = rect.top + window.scrollY;
        startLeft = rect.left + window.scrollX;

        // Fixar em top/left a partir do primeiro arraste
        el.style.top = startTop + "px";
        el.style.left = startLeft + "px";
        el.style.right = "auto";

        const onMouseMove = (ev) => {
          ev.preventDefault();
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          const nextTop = Math.max(0, startTop + dy);
          const nextLeft = Math.max(0, startLeft + dx);
          el.style.top = nextTop + "px";
          el.style.left = nextLeft + "px";
        };

        const onMouseUp = () => {
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      };
    };
    drag(panel);

    return panel;
  }

  function substitutePlaceholders(str, vals) {
    if (!str || !vals) return str || "";
    let s = str;
      vals.forEach((v, i) => { s = s.replace(new RegExp("\\$" + (i + 1) + "\\$", "g"), String(v)); });
    return s;
  }

  function updatePanel(panel, state, i18n) {
    const t = i18n || {};
    const statusEl = panel.querySelector("#trr-status");
    const statsEl = panel.querySelector("#trr-stats");
    const pauseBtn = panel.querySelector("#trr-pause-btn");
    const downloadBtn = panel.querySelector("#trr-download-btn");

    if (statusEl) statusEl.textContent = state.status || "—";
    if (statsEl) {
      const parts = [];
      if (state.pages != null) parts.push(`${t.statsPages || "Pages"}: ${state.pages}`);
      if (state.removed != null) parts.push(`${t.statsRemoved || "Removed"}: ${state.removed}`);
      if (state.failed != null && state.failed > 0) parts.push(`${t.statsFailed || "Failed"}: ${state.failed}`);
      if (state.totalListed != null) parts.push(`${t.statsListed || "Listed"}: ${state.totalListed}`);
      statsEl.textContent = parts.length ? parts.join(" · ") : "";
    }
    if (pauseBtn) {
      pauseBtn.textContent = state.paused ? (t.btnResume || "Resume") : (t.btnPause || "Pause");
      pauseBtn.classList.toggle("resumed", !!state.paused);
      // Desativa o botão de pausar/continuar quando o processo não pode ser retomado (ex.: erro de login)
      pauseBtn.disabled = !!state.disablePause;
    }
    if (downloadBtn) {
      downloadBtn.disabled = !state.reportReady;
      const baseLabel = t.btnDownloadReport || "Download report";
      const total = (state.removed || 0) + (state.failed || 0);
      downloadBtn.textContent = state.reportReady && total > 0
        ? `${baseLabel} (${state.removed || 0}${state.failed > 0 ? ", " + state.failed + " failed" : ""})`
        : baseLabel;
    }
  }

  function buildReport(removedItems, failedItems, format) {
    const removed = removedItems && removedItems.length ? removedItems : [];
    const failed = failedItems && failedItems.length ? failedItems : [];
    if (format === "csv") {
      const headers = ["id", "authorName", "desc", "url", "status"];
      const row = (i, status) => [
        i.id,
        i.authorName,
        (i.desc || "").replace(/\s+/g, " ").replace(/"/g, '""'),
        i.url,
        status,
      ];
      const rows = removed.map((i) => row(i, "removed")).concat(failed.map((i) => row(i, "failed")));
      return headers.join(",") + "\n" + rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    }
    return JSON.stringify({ removed, failed }, null, 2);
  }

  function downloadReport(content, format) {
    const ext = format === "csv" ? "csv" : "json";
    const mime = format === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8";
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tiktok-reposts-removed-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const MAX_CONSECUTIVE_FAILURES = 5;

  let panelState = {
    status: "Preparando...",
    pages: 0,
    removed: 0,
    failed: 0,
    totalListed: 0,
    paused: false,
    reportReady: false,
    reportItems: [],
    reportFailedItems: [],
    reportFormat: "json",
  };

  async function runRemoval(config) {
    config = config || {};
    var panel = createInPagePanel(config.i18n);
    if (!panel || !panel.parentNode) {
      console.error("TikTok Reposts Remover: não foi possível criar o painel na página.");
      return;
    }
    const keywordList = parseKeywords(config.keywordsFilter || "");
    panelState.reportFormat = config.exportFileType || "json";
    panelState.reportItems = [];
    panelState.reportFailedItems = [];
    panelState.removed = 0;
    panelState.failed = 0;
    panelState.disablePause = false;
    panelState.pages = 0;
    panelState.totalListed = 0;
    panelState.paused = false;
    panelState.reportReady = false;

    const pauseBtn = panel.querySelector("#trr-pause-btn");
    const downloadBtn = panel.querySelector("#trr-download-btn");
    const closeBtn = panel.querySelector(".trr-close");

    const t0 = config.i18n || {};
    pauseBtn.onclick = () => {
      panelState.paused = !panelState.paused;
      panelState.status = panelState.paused ? (t0.statusPaused || "Paused") : (t0.statusResuming || "Resuming…");
      updatePanel(panel, panelState, t0);
    };

    downloadBtn.onclick = () => {
      const content = buildReport(panelState.reportItems, panelState.reportFailedItems || [], panelState.reportFormat);
      downloadReport(content, panelState.reportFormat);
    };

    closeBtn.onclick = () => panel.remove();

    const t = config.i18n || {};
    const setStatus = (s) => {
      panelState.status = s;
      updatePanel(panel, panelState, t);
    };

    try {
    if (config.notLoggedInRedirect) {
      panelState.paused = true;
      panelState.disablePause = true;
      setStatus(t.statusErrorRedirectedForyou || "You were redirected to For You because you're not logged in. Please log in, then open the extension and click Start again.");
      updatePanel(panel, panelState, t);
      return;
    }

    setStatus(t.statusWaiting || "Identificando sua conta…");
    var secUid = await getSecUidAsync();
    if (!secUid) {
      for (var i = 0; i < 12; i++) {
        await sleep(1500);
        secUid = await getSecUidAsync();
        if (secUid) break;
      }
    }
    if (!secUid) {
      var onForyou = /\/foryou(\?|$)/i.test(window.location.href);
      var msg = onForyou
        ? (t.statusErrorRedirectedForyou || "You were redirected to For You because you're not logged in. Please log in, then open the extension and click Start again.")
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

    setStatus(t.statusListing || "Listing reposts…");

    while (true) {
      while (panelState.paused) await sleep(500);

      const result = await getRepostItems(cursor, secUid);
      if (!result || !result.items || result.items.length === 0) {
        setStatus(t.statusNone || "No reposts found.");
        panelState.reportReady = true;
        updatePanel(panel, panelState, t);
        break;
      }

      panelState.pages = page;
      panelState.totalListed = (panelState.totalListed || 0) + result.items.length;
      const candidates = result.items.filter((item) => matchesKeywords(item.desc, keywordList));
      const statusMsg = substitutePlaceholders(t.statusPageRemoving, [page, candidates.length, result.items.length])
        || `Page ${page}: removing ${candidates.length} of ${result.items.length}…`;
      updatePanel(panel, { ...panelState, status: statusMsg }, t);

      let consecutiveFailures = 0;
      let stoppedDueToFailures = false;

      for (const item of candidates) {
        while (panelState.paused) await sleep(500);

        try {
          await removeRepostItem(item.id);
          consecutiveFailures = 0;
          panelState.removed = (panelState.removed || 0) + 1;
          panelState.reportItems.push(item);
          panelState.reportReady = true;
          updatePanel(panel, { ...panelState, status: `${item.authorName} – ${(item.desc || "").slice(0, 25)}…` }, t);
        } catch (e) {
          console.error("Erro removendo", item.id, e);
          consecutiveFailures++;
          panelState.failed = (panelState.failed || 0) + 1;
          panelState.reportFailedItems = panelState.reportFailedItems || [];
          panelState.reportFailedItems.push(item);
          panelState.reportReady = true;
          setStatus(substitutePlaceholders(t.statusErrorRemove, [item.id]) || `Error removing ${item.id}`);
          updatePanel(panel, panelState, t);
          if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
            panelState.paused = true;
            panelState.disablePause = true;
            setStatus(substitutePlaceholders(t.statusStoppedFailures, [MAX_CONSECUTIVE_FAILURES])
              || `Stopped: ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Download report to see which failed.`);
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

      if (!result.hasMore || !result.nextCursor) {
        setStatus(t.statusDone || "Done! All reposts processed.");
        panelState.reportReady = true;
        updatePanel(panel, panelState, t);
        break;
      }

      cursor = result.nextCursor;
      page++;
      setStatus((t.statusBetweenPages || "Pause before next page…") + " " + page);
      await sleep(pagePauseMs);
    }
  } catch (err) {
    console.error("TikTok Reposts Remover:", err);
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
        console.error("TikTok Reposts Remover:", e);
        sendResponse({ ok: false, error: String(e) });
      }
    }
    return true;
  });
})();
