(function () {
  "use strict";

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Reproduce un tono suave de finalización usando la Web Audio API */
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

  /** Reproduce un tono de aviso / llamada de atención para el Captcha */
  function playAttentionSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      [880, 659.25, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.14);
        gain.gain.setValueAtTime(0, now + i * 0.14);
        gain.gain.linearRampToValueAtTime(0.09, now + i * 0.14 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.14);
        osc.stop(now + i * 0.14 + 0.32);
      });
    } catch (e) {}
  }

  /** Pide al background el secUid (leído en el contexto MAIN con múltiples fallbacks). */
  function getSecUidAsync() {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({ action: "getSecUid" }, function (response) {
        resolve(response && response.secUid ? response.secUid : null);
      });
    });
  }

  /** Detecta si hay un desafío de Captcha / Verificación ACTIVO Y VISIBLE en la pantalla */
  function isCaptchaPresent() {
    try {
      // 1. Si TikTok añade clases de bloqueo de scroll al body o html
      if (
        document.body.classList.contains("captcha-disable-scroll") ||
        document.documentElement.classList.contains("captcha-disable-scroll")
      ) {
        return true;
      }

      // 2. Elementos o contenedores específicos de verificación / captcha
      const candidates = [
        document.querySelector("#tiktok-verify-ele"),
        document.querySelector(".secsdk-captcha-drag-wrapper"),
        document.querySelector(".secsdk_captcha_modal"),
        document.querySelector(".captcha_verify_container"),
        document.querySelector(".captcha-verify-container"),
        document.querySelector('[data-e2e="verify-captcha"]'),
        document.querySelector(".verify-wrap"),
        document.querySelector("#captcha-verify-image"),
        document.querySelector("#captcha_container"),
        document.querySelector(".secsdk_captcha_cover"),
        document.querySelector('iframe[src*="verify"]'),
        document.querySelector('iframe[src*="captcha"]'),
        document.querySelector('iframe[src*="secsdk"]'),
        document.querySelector('div[class*="captcha-drag"]'),
        document.querySelector('div[class*="captcha_drag"]'),
        document.querySelector('div[class*="verify-bar"]'),
        document.querySelector('div[class*="VerifyBar"]')
      ].filter(Boolean);

      for (const el of candidates) {
        if (!el || !el.isConnected) continue;
        const style = window.getComputedStyle(el);
        if (style && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0") {
          const rect = el.getBoundingClientRect();
          if (rect.width > 40 && rect.height > 40) {
            return true;
          }
        }
      }

      // 3. Modales flotantes que contengan palabras clave de verificación
      const modalElements = Array.from(document.querySelectorAll('div[class*="modal"], div[class*="dialog"], div[role="dialog"], div[class*="verify"], div[class*="Verify"]'));
      for (const mod of modalElements) {
        if (mod.id === "tiktok-reposts-remover-panel" || mod.closest("#tiktok-reposts-remover-panel")) continue;
        const style = window.getComputedStyle(mod);
        if (style && style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0") {
          const rect = mod.getBoundingClientRect();
          if (rect.width > 120 && rect.height > 120) {
            const text = (mod.innerText || "").toLowerCase();
            if (
              text.includes("desliza el") ||
              text.includes("arrastra el control") ||
              text.includes("arrastra para") ||
              text.includes("completa el rompecabezas") ||
              text.includes("drag the slider") ||
              text.includes("fit the puzzle") ||
              text.includes("select the 2") ||
              text.includes("verifica que eres")
            ) {
              return true;
            }
          }
        }
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  /** Remueve visualmente el elemento del video en el DOM de la página de TikTok */
  function removeVideoFromPageDom(itemId) {
    try {
      const links = document.querySelectorAll(`a[href*="${itemId}"]`);
      links.forEach((a) => {
        const card = a.closest('[data-e2e="user-post-item"]') ||
                     a.closest('[data-e2e="user-liked-item"]') ||
                     a.closest('div[class*="DivItemContainer"]') ||
                     a.parentElement;
        if (card) {
          card.style.transition = "opacity 0.4s ease, transform 0.4s ease";
          card.style.opacity = "0.15";
          card.style.transform = "scale(0.92)";
          card.style.filter = "grayscale(100%)";
          setTimeout(() => {
            if (card && card.parentNode) card.style.display = "none";
          }, 450);
        }
      });
    } catch (e) {}
  }

  /** Ejecuta la eliminación en el contexto MAIN a través de chrome.scripting en background (100% compatible con CSP) */
  function removeItemInMainWorldAsync(targetType, itemId) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage(
        {
          action: "removeItemInMainWorld",
          payload: { targetType, itemId },
        },
        function (response) {
          if (!response) {
            return reject(new Error("Sin respuesta del servicio background"));
          }
          if (!response.ok && response.error) {
            return reject(new Error(response.error));
          }
          if (response.json) {
            var json = response.json;
            var isSuccess =
              json.status_code === 0 ||
              json.status_code === 200 ||
              json.statusCode === 0 ||
              json.statusCode === 200 ||
              json.status_msg === "ok" ||
              json.message === "success" ||
              json.is_digg === 0;

            if (!isSuccess) {
              return reject(new Error("TikTok API (" + (json.status_code ?? json.statusCode ?? "error") + "): " + (json.status_msg || json.message || JSON.stringify(json))));
            }
            return resolve(json);
          }
          if (response.status === 200 || response.status === 204 || response.ok) {
            return resolve({ status_code: 0, status_msg: "ok" });
          }
          return reject(new Error("HTTP " + response.status + ": " + (response.text || "Error")));
        }
      );
    });
  }

  /** Obtiene la lista de videos de acuerdo con el tipo (reposts, likes, favorites) */
  async function fetchItems(targetType, cursor, secUid) {
    if (!secUid) {
      return { error: "No se pudo identificar el secUid de tu cuenta.", items: [], statusCode: -1 };
    }

    let url;
    if (targetType === "likes") {
      const params = new URLSearchParams({
        aid: "1988",
        count: "30",
        coverFormat: "2",
        cursor: String(cursor),
        secUid: String(secUid),
      });
      url = `https://www.tiktok.com/api/favorite/item_list/?${params.toString()}`;
    } else if (targetType === "favorites") {
      const params = new URLSearchParams({
        aid: "1988",
        count: "30",
        coverFormat: "2",
        cursor: String(cursor),
        secUid: String(secUid),
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
        secUid: String(secUid),
      });
      url = `https://www.tiktok.com/api/repost/item_list/?${params.toString()}`;
    }

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { accept: "*/*" },
        credentials: "include",
      });

      if (!res.ok) {
        return { error: `HTTP ${res.status}: ${res.statusText}`, items: [], statusCode: res.status };
      }

      const raw = await res.text();
      let json;
      try {
        json = JSON.parse(raw);
      } catch (e) {
        return { error: `La respuesta no es JSON válido (${raw.slice(0, 80)})`, items: [], statusCode: -2 };
      }

      const statusCode = json.status_code != null ? json.status_code : (json.statusCode != null ? json.statusCode : 0);
      if (statusCode !== 0 && statusCode !== 200) {
        return {
          error: `TikTok API error ${statusCode}: ${json.status_msg || json.message || "Error"}`,
          items: [],
          statusCode
        };
      }

      const rawItems = json.itemList || json.items || json.item_list || json.aweme_list || json.collectList || json.collect_item_list || [];
      const items = rawItems.map((e) => {
        const id = String(e.id || e.aweme_id || e.item_id || "");
        const authorObj = e.author || {};
        const authorName = authorObj.uniqueId || authorObj.unique_id || authorObj.nickname || authorObj.id || "";
        return {
          id,
          authorName: authorName ? `@${authorName}` : `@video_${id.slice(-6)}`,
          desc: e.desc || "",
          url: `https://www.tiktok.com/@${authorName || "video"}/video/${id}`,
        };
      }).filter((i) => Boolean(i.id));

      const hasMoreVal = json.hasMore != null ? json.hasMore : json.has_more;
      const hasMore = Boolean(hasMoreVal === true || hasMoreVal === 1 || hasMoreVal === "true" || hasMoreVal === "1");

      return {
        hasMore,
        nextCursor: json.cursor != null ? String(json.cursor) : null,
        items,
        totalRaw: rawItems.length,
        statusCode: 0,
        error: null,
      };
    } catch (err) {
      return { error: `Error de red: ${err.message || String(err)}`, items: [], statusCode: -3 };
    }
  }

  /** Elimina / Deshace la acción del video según el tipo */
  async function removeItem(targetType, itemId, retries = 3) {
    let lastErr;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await removeItemInMainWorldAsync(targetType, itemId);
        removeVideoFromPageDom(itemId);
        return res;
      } catch (e) {
        lastErr = e;
        if (attempt < retries) await sleep(1500);
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
      const arr = config.requestIntervalSet || [2, 3, 4];
      const v = arr[Math.floor(Math.random() * arr.length)] ?? 2;
      return Math.max(1.5, v) * 1000 + Math.floor(Math.random() * 300);
    }
    const { min = 2, max = 3.5 } = config.requestIntervalRange || {};
    const a = Math.max(1.5, min);
    const b = Math.max(a, max);
    const sec = a + Math.random() * (b - a);
    return sec * 1000 + Math.floor(Math.random() * 250);
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
    else if (targetType === "favorites") targetLabel = "Favoritos";

    const panel = document.createElement("div");
    panel.id = id;
    panel.innerHTML = `
      <div class="trr-header">
        <div class="trr-title-group">
          <span class="trr-title">${t.panelTitle || "TikTok Cleaner"} [${targetLabel}]</span>
          ${isDryRun ? `<span class="trr-badge-dry">${t.dryRunBadge || "SIMULACIÓN"}</span>` : ""}
        </div>
        <div class="trr-header-actions">
          <button type="button" class="trr-btn-icon" id="trr-min-btn" title="${t.panelMinimize || "Minimizar"}">_</button>
          <button type="button" class="trr-btn-icon trr-close" id="trr-close-btn" title="${t.panelClose || "Cerrar"}">×</button>
        </div>
      </div>
      <div class="trr-body" id="trr-body">
        <!-- Banner destacado de Captcha -->
        <div class="trr-captcha-banner" id="trr-captcha-banner" style="display: none;">
          <div class="trr-captcha-icon">🧩</div>
          <div class="trr-captcha-content">
            <div class="trr-captcha-title">¡CAPTCHA EN PANTALLA!</div>
            <div class="trr-captcha-desc">Por favor, completa el rompecabezas en TikTok. El limpiador continuará solo.</div>
            <button type="button" class="trr-btn-skip-captcha" id="trr-skip-captcha">Ya lo resolví / Ignorar</button>
          </div>
        </div>

        <!-- Tarjeta de Finalización Exitosa -->
        <div class="trr-completion-card" id="trr-completion-card" style="display: none;">
          <div class="trr-completion-icon">🎉</div>
          <div class="trr-completion-content">
            <div class="trr-completion-title">¡Limpieza Completada!</div>
            <div class="trr-completion-desc" id="trr-completion-desc">Todos los videos han sido procesados con éxito.</div>
          </div>
        </div>

        <div class="trr-progress-container">
          <div class="trr-progress-bar">
            <div class="trr-progress-fill" id="trr-progress-fill"></div>
          </div>
        </div>
        <div class="trr-status" id="trr-status">${t.statusPreparing || "Preparando…"}</div>
        <div class="trr-current-card" id="trr-current-card" style="display: none;">
          <div class="trr-current-author" id="trr-current-author"></div>
          <div class="trr-current-desc" id="trr-current-desc"></div>
        </div>
        <div class="trr-stats-grid" id="trr-stats-grid">
          <div class="trr-stat-pill"><span class="trr-stat-label">${t.statsPages || "Páginas"}:</span> <span id="trr-stat-pages" class="trr-stat-val">0</span></div>
          <div class="trr-stat-pill trr-pill-accent"><span class="trr-stat-label">${isDryRun ? (t.statsListed || "Listados") : (t.statsRemoved || "Procesados")}:</span> <span id="trr-stat-removed" class="trr-stat-val">0</span></div>
          <div class="trr-stat-pill"><span class="trr-stat-label">${t.statsSkipped || "Omitidos"}:</span> <span id="trr-stat-skipped" class="trr-stat-val">0</span></div>
          <div class="trr-stat-pill trr-pill-warn"><span class="trr-stat-label">${t.statsFailed || "Fallidos"}:</span> <span id="trr-stat-failed" class="trr-stat-val">0</span></div>
          <div class="trr-stat-pill trr-pill-eta"><span class="trr-stat-label">${t.statsEta || "Restante"}:</span> <span id="trr-stat-eta" class="trr-stat-val">--</span></div>
        </div>
        <div class="trr-actions">
          <button type="button" class="trr-btn trr-pause" id="trr-pause-btn">${t.btnPause || "Pausar"}</button>
          <button type="button" class="trr-btn trr-download" id="trr-download-btn" disabled>${t.btnDownloadReport || "Descargar reporte"}</button>
        </div>
      </div>
      <div class="trr-minimized" id="trr-minimized" style="display: none;">
        <span class="trr-min-text" id="trr-min-text">🧹 TRR: 0 / 0</span>
        <button type="button" class="trr-btn-icon" id="trr-expand-btn" title="${t.panelExpand || "Expandir"}">↕</button>
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
        transition: border-color 0.3s, box-shadow 0.3s;
      }
      @keyframes trr-pulse-warn {
        0% { box-shadow: 0 0 0 0 rgba(255, 170, 0, 0.7), 0 16px 48px rgba(0,0,0,0.6); border-color: #ffaa00; }
        50% { box-shadow: 0 0 0 10px rgba(255, 170, 0, 0), 0 16px 48px rgba(0,0,0,0.6); border-color: #ff0050; }
        100% { box-shadow: 0 0 0 0 rgba(255, 170, 0, 0), 0 16px 48px rgba(0,0,0,0.6); border-color: #ffaa00; }
      }
      .trr-captcha-active {
        animation: trr-pulse-warn 1.6s infinite !important;
        border-top-color: #ffaa00 !important;
      }
      .trr-captcha-banner {
        margin: 10px 14px 4px;
        padding: 10px 12px;
        background: linear-gradient(135deg, rgba(255, 170, 0, 0.22), rgba(255, 0, 80, 0.18));
        border: 1px solid #ffaa00;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: trr-slideIn 0.3s ease;
      }
      .trr-captcha-icon {
        font-size: 26px;
        line-height: 1;
        animation: trr-bounce 1s infinite alternate;
      }
      @keyframes trr-bounce {
        from { transform: translateY(0); }
        to { transform: translateY(-4px); }
      }
      .trr-captcha-content {
        flex: 1;
      }
      .trr-captcha-title {
        font-size: 11px;
        font-weight: 800;
        color: #ffaa00;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .trr-captcha-desc {
        font-size: 10.5px;
        line-height: 1.3;
        color: #f0f0f0;
      }
      .trr-btn-skip-captcha {
        margin-top: 6px;
        padding: 4px 8px;
        background: rgba(255, 170, 0, 0.25);
        border: 1px solid #ffaa00;
        border-radius: 6px;
        color: #fff;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
      }
      .trr-btn-skip-captcha:hover {
        background: rgba(255, 170, 0, 0.45);
      }
      .trr-completion-card {
        margin: 10px 14px 4px;
        padding: 10px 12px;
        background: linear-gradient(135deg, rgba(0, 242, 234, 0.2), rgba(0, 255, 128, 0.15));
        border: 1px solid #00f2ea;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        animation: trr-slideIn 0.3s ease;
      }
      .trr-completion-icon {
        font-size: 26px;
        line-height: 1;
        animation: trr-bounce 0.8s infinite alternate;
      }
      .trr-completion-content {
        flex: 1;
      }
      .trr-completion-title {
        font-size: 12px;
        font-weight: 800;
        color: #00f2ea;
        letter-spacing: 0.02em;
        margin-bottom: 2px;
      }
      .trr-completion-desc {
        font-size: 11px;
        line-height: 1.35;
        color: #f2f2f2;
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
      .trr-pause.completed {
        background: #00f2ea;
        color: #0d0d0d;
      }
      .trr-pause.completed:hover { background: #33f5ed; }
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

    // Arrastre del panel
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

    // Minimizar / Expandir
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
    const captchaBanner = panel.querySelector("#trr-captcha-banner");
    const completionCard = panel.querySelector("#trr-completion-card");
    const completionDesc = panel.querySelector("#trr-completion-desc");

    const currentCard = panel.querySelector("#trr-current-card");
    const currentAuthor = panel.querySelector("#trr-current-author");
    const currentDesc = panel.querySelector("#trr-current-desc");

    if (captchaBanner) {
      if (state.captchaActive) {
        captchaBanner.style.display = "flex";
        panel.classList.add("trr-captcha-active");
      } else {
        captchaBanner.style.display = "none";
        panel.classList.remove("trr-captcha-active");
      }
    }

    if (completionCard) {
      if (state.isCompleted) {
        completionCard.style.display = "flex";
        if (completionDesc) {
          completionDesc.textContent = `Se procesaron exitosamente ${state.removed || 0} videos.`;
        }
      } else {
        completionCard.style.display = "none";
      }
    }

    if (statusEl) statusEl.textContent = state.status || "—";
    if (pagesEl) pagesEl.textContent = state.pages || 0;
    if (removedEl) removedEl.textContent = state.removed || 0;
    if (skippedEl) skippedEl.textContent = state.skipped || 0;
    if (failedEl) failedEl.textContent = state.failed || 0;
    if (etaEl) etaEl.textContent = state.eta || "--";

    if (minText) {
      if (state.captchaActive) {
        minText.textContent = `🧩 TRR: ¡RESUELVE CAPTCHA!`;
      } else if (state.isCompleted) {
        minText.textContent = `🎉 TRR: ¡COMPLETADO (${state.removed || 0})!`;
      } else {
        minText.textContent = `🧹 TRR: ${state.removed || 0} proc · ${state.eta || "--"}`;
      }
    }

    if (progressFill) {
      if (state.isCompleted) {
        progressFill.style.width = "100%";
        progressFill.style.background = "linear-gradient(90deg, #00f2ea, #00ff80)";
      } else if (state.totalCandidates > 0) {
        const pct = Math.min(100, Math.round(((state.removed + state.failed) / state.totalCandidates) * 100));
        progressFill.style.width = `${pct}%`;
      }
    }

    if (currentCard && currentAuthor && currentDesc) {
      if (state.currentItem && !state.isCompleted) {
        currentCard.style.display = "block";
        currentAuthor.textContent = state.currentItem.authorName || "";
        currentDesc.textContent = state.currentItem.desc || "(sin descripción)";
      } else {
        currentCard.style.display = "none";
      }
    }

    if (pauseBtn) {
      if (state.isCompleted) {
        pauseBtn.textContent = "Cerrar";
        pauseBtn.className = "trr-btn trr-pause completed";
        pauseBtn.disabled = false;
        pauseBtn.onclick = () => panel.remove();
      } else {
        pauseBtn.textContent = state.paused ? (t.btnResume || "Reanudar") : (t.btnPause || "Pausar");
        pauseBtn.className = "trr-btn trr-pause" + (state.paused ? " resumed" : "");
        pauseBtn.disabled = !!state.disablePause || !!state.captchaActive;
      }
    }

    if (downloadBtn) {
      downloadBtn.disabled = !state.reportReady;
      const baseLabel = t.btnDownloadReport || "Descargar reporte";
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
    captchaActive: false,
    captchaManualDismiss: false,
    isCompleted: false,
    reportReady: false,
    reportItems: [],
    reportFailedItems: [],
    reportSkippedItems: [],
    reportFormat: "json",
    currentItem: null,
    eta: "--",
  };

  let currentExecutionId = 0;

  /** Automatizador Universal en Reproductor Interactivo (Likes, Reposts y Favoritos con 100% de persistencia) */
  async function runUnifiedPlayerAutomator(config, panel, panelState, t, executionId) {
    if (executionId !== currentExecutionId) return;

    const targetType = config.targetType || "reposts";
    let targetLabel = "Reposts";
    if (targetType === "likes") targetLabel = "Me Gusta";
    else if (targetType === "favorites") targetLabel = "Favoritos";

    panelState.status = `Abriendo tu pestaña de ${targetLabel}...`;
    updatePanel(panel, panelState, t);

    // 1. Localiza y asegura que la pestaña correspondiente esté activa en el perfil
    async function ensureCorrectTabActive() {
      let tabEl = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        if (targetType === "likes") {
          tabEl =
            document.querySelector('p[data-e2e="liked-tab"]') ||
            document.querySelector('[data-e2e="liked-tab"]') ||
            document.querySelector('p[class*="PLike"]') ||
            document.querySelector('p[data-e2e*="liked"]');
        } else if (targetType === "favorites") {
          tabEl =
            document.querySelector('p[data-e2e="favorites-tab"]') ||
            document.querySelector('[data-e2e="favorites-tab"]') ||
            document.querySelector('p[class*="PFavorite"]') ||
            document.querySelector('p[data-e2e*="favorite"]');
        } else {
          // Reposts / Compartidos
          tabEl =
            document.querySelector('p[data-e2e="repost-tab"]') ||
            document.querySelector('[data-e2e="repost-tab"]') ||
            document.querySelector('p[class*="PRepost"]') ||
            document.querySelector('p[data-e2e*="repost"]') ||
            document.querySelector('[data-e2e="upvote-tab"]');
        }

        if (!tabEl) {
          const allTabs = Array.from(document.querySelectorAll('[role="tab"], p, div, span'));
          tabEl = allTabs.find((el) => {
            const txt = (el.innerText || el.textContent || "").trim().toLowerCase();
            if (/\d/.test(txt) || el.offsetParent === null) return false;
            if (targetType === "likes") return txt === "me gusta" || txt === "likes";
            if (targetType === "favorites") return txt === "favoritos" || txt === "favorites";
            return txt === "compartidos" || txt === "reposts" || txt === "volver a publicar" || txt === "republicados";
          });
        }

        if (tabEl) {
          if (tabEl.getAttribute("aria-selected") !== "true") {
            tabEl.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
            tabEl.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, view: window }));
            tabEl.click();
            if (tabEl.parentElement) tabEl.parentElement.click();
            await sleep(1200);
          }
          if (tabEl.getAttribute("aria-selected") === "true") {
            return true;
          }
        }

        window.scrollBy(0, 200);
        await sleep(600);
      }

      return Boolean(tabEl && tabEl.getAttribute("aria-selected") === "true");
    }

    const isTabReady = await ensureCorrectTabActive();
    if (!isTabReady && targetType === "reposts") {
      panelState.status = "⚠️ Selecciona manualmente tu pestaña 'Compartidos' en el perfil para continuar.";
      panelState.paused = true;
      panelState.disablePause = true;
      updatePanel(panel, panelState, t);
      return;
    }

    // Función universal para disparar clics reales y ejecutar los handlers internos de React Fiber
    function triggerReactClick(element) {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y };

      // 1. Secuencia nativa completa de eventos de puntero y ratón con coordenadas
      element.dispatchEvent(new PointerEvent("pointerdown", opts));
      element.dispatchEvent(new MouseEvent("mousedown", opts));
      element.dispatchEvent(new PointerEvent("pointerup", opts));
      element.dispatchEvent(new MouseEvent("mouseup", opts));
      element.dispatchEvent(new MouseEvent("click", opts));
      element.click();

      // 2. Disparo directo del handler onClick de React en el Fiber
      try {
        for (const key of Object.keys(element)) {
          if (key.startsWith("__reactProps") || key.startsWith("__reactEventHandlers")) {
            const props = element[key];
            if (props && typeof props.onClick === "function") {
              props.onClick({ stopPropagation: () => {}, preventDefault: () => {} });
            }
          }
        }
      } catch (e) {}
    }

    const processedVideoUrls = new Set();

    // 2. Busca el siguiente video no procesado de la cuadrícula del perfil
    function findFirstVideoLink() {
      const cardLinks = Array.from(document.querySelectorAll('[data-e2e="user-post-item"] a[href*="/video/"], [data-e2e="user-liked-item"] a[href*="/video/"], div[class*="DivItemContainer"] a[href*="/video/"]'));
      const validLink = cardLinks.find((a) => {
        if (a.closest('#app-header, header, nav, [class*="Notification"], [class*="Inbox"], [class*="Header"]')) return false;
        const href = a.getAttribute("href") || "";
        const idMatch = href.match(/\/video\/(\d+)/);
        const vidId = idMatch ? idMatch[1] : href;
        return href.includes("/video/") && !processedVideoUrls.has(vidId) && a.offsetParent !== null;
      });

      if (validLink) return validLink;

      const allVideoLinks = Array.from(document.querySelectorAll('a[href*="/video/"]'));
      return allVideoLinks.find((a) => {
        if (a.closest('#app-header, header, nav, [class*="Notification"], [class*="Inbox"], [class*="Header"], [class*="SideNav"]')) return false;
        const href = a.getAttribute("href") || "";
        const idMatch = href.match(/\/video\/(\d+)/);
        const vidId = idMatch ? idMatch[1] : href;
        return href.includes("/video/") && !processedVideoUrls.has(vidId) && a.offsetParent !== null;
      });
    }

    let firstVideoLink = findFirstVideoLink();
    if (!firstVideoLink) {
      for (let s = 0; s < 3; s++) {
        window.scrollBy({ top: 500, behavior: "smooth" });
        await sleep(700);
        firstVideoLink = findFirstVideoLink();
        if (firstVideoLink) break;
      }
    }

    if (!firstVideoLink) {
      panelState.status = `No se encontraron videos en la pestaña '${targetLabel}'.`;
      panelState.isCompleted = true;
      updatePanel(panel, panelState, t);
      return;
    }

    // Abre el reproductor interactivo
    triggerReactClick(firstVideoLink);
    await sleep(1500);

    const maxLimit = config.maxRemovals || 0;
    const startTime = Date.now();
    let consecutiveSame = 0;

    async function checkCaptchaInPlayer() {
      if (isCaptchaPresent() && !panelState.captchaManualDismiss) {
        panelState.captchaActive = true;
        playAttentionSound();
        panelState.status = "⚠️ Captcha detectado. Resuélvelo en pantalla para continuar...";
        updatePanel(panel, panelState, t);

        while (isCaptchaPresent() && !panelState.captchaManualDismiss) {
          await sleep(1000);
        }
        panelState.captchaActive = false;
        panelState.captchaManualDismiss = false;
        panelState.status = "✅ ¡Captcha resuelto! Reanudando...";
        updatePanel(panel, panelState, t);
        await sleep(1500);
      }
    }

    while (true) {
      if (executionId !== currentExecutionId) return;
      while (panelState.paused) await sleep(500);
      if (executionId !== currentExecutionId) return;

      // Verificación de Captcha al iniciar el video
      await checkCaptchaInPlayer();
      if (executionId !== currentExecutionId) return;

      // Obtiene datos del video actual en el reproductor
      const authorEl = document.querySelector('[data-e2e="browse-username"]') || document.querySelector('span[data-e2e="browser-nickname"]') || document.querySelector('a[href*="/@"]');
      const authorName = authorEl ? authorEl.textContent.trim() : "@video";
      const descEl = document.querySelector('[data-e2e="browse-video-desc"]') || document.querySelector('h1[data-e2e="video-desc"]');
      const descText = descEl ? descEl.textContent.trim() : "";

      const videoUrlMatch = window.location.href.match(/\/video\/(\d+)/);
      const itemId = videoUrlMatch ? videoUrlMatch[1] : window.location.href;
      processedVideoUrls.add(itemId);

      panelState.currentItem = { authorName: authorName.startsWith("@") ? authorName : `@${authorName}`, desc: descText, url: window.location.href };
      panelState.status = `Procesando [${targetLabel}]: ${panelState.currentItem.authorName}...`;
      updatePanel(panel, panelState, t);

      // Ejecuta la acción según targetType
      if (targetType === "likes") {
        const likeBtn =
          document.querySelector('[data-e2e="like-icon"]') ||
          document.querySelector('[data-e2e="browse-like-icon"]') ||
          document.querySelector('button[aria-label*="Like"]') ||
          document.querySelector('button[aria-label*="Me gusta"]') ||
          document.querySelector('button[aria-label*="like"]');

        if (likeBtn) {
          likeBtn.click();
          await sleep(600);
        }
      } else if (targetType === "favorites") {
        const favBtn =
          document.querySelector('[data-e2e="undefined-icon"]') ||
          document.querySelector('[data-e2e="bookmark-icon"]') ||
          document.querySelector('button[aria-label*="Favorite"]') ||
          document.querySelector('button[aria-label*="Favorito"]') ||
          document.querySelector('button[aria-label*="Guardar"]');

        if (favBtn) {
          favBtn.click();
          await sleep(600);
        }
      } else {
        // targetType === "reposts"
        // SEGURIDAD: Solo pulsa el botón si el video está COMPARTIDO actualmente (para NUNCA volver a publicar por error)
        const repostBtn =
          document.querySelector('a#icon-element-repost') ||
          document.querySelector('[data-e2e="video-share-repost"]') ||
          document.querySelector('a[aria-label*="Eliminar la publicación compartida"]') ||
          document.querySelector('a[aria-label*="compartida"]') ||
          document.querySelector('[data-e2e="repost-icon"]');

        if (repostBtn) {
          const label = (repostBtn.getAttribute("aria-label") || repostBtn.innerText || "").toLowerCase();
          const svgPath = repostBtn.querySelector('path[fill*="FFC300"], path[fill*="ffc300"], path[fill*="255, 195, 0"], path[fill*="rgb(255, 195, 0)"]');
          const isActuallyReposted = label.includes("eliminar") || label.includes("quitar") || Boolean(svgPath);

          if (isActuallyReposted) {
            repostBtn.click();
            await sleep(700);
            panelState.removed++;
            panelState.reportItems.push({ id: window.location.href, authorName, desc: descText, url: window.location.href });
            panelState.status = `✅ Eliminado (${panelState.removed}): ${authorName}`;
          } else {
            panelState.skipped++;
            panelState.status = `Omitido (no compartido): ${authorName}`;
          }
        } else {
          panelState.skipped++;
        }
      }

      await checkCaptchaInPlayer();

      panelState.reportReady = true;

      const elapsedSec = (Date.now() - startTime) / 1000;
      const avgPerItem = elapsedSec / Math.max(1, panelState.removed + panelState.skipped);
      const remainingItems = maxLimit > 0 ? Math.max(0, maxLimit - (panelState.removed + panelState.skipped)) : "--";
      panelState.eta = maxLimit > 0 ? formatEta(remainingItems * avgPerItem) : "--";

      updatePanel(panel, panelState, t);

      // Verifica si se alcanzó el límite elegido por el usuario
      if (maxLimit > 0 && (panelState.removed + panelState.skipped) >= maxLimit) {
        panelState.status = `Límite alcanzado: ${maxLimit} videos.`;
        break;
      }

      // Pausa de seguridad anti-bot cada 15 elementos en el reproductor
      if ((panelState.removed + panelState.skipped) > 0 && (panelState.removed + panelState.skipped) % 15 === 0) {
        panelState.status = "Pausa de seguridad anti-bot (6s)...";
        updatePanel(panel, panelState, t);
        await sleep(6000);
      }

      await checkCaptchaInPlayer();

      // Avanza al siguiente video utilizando el botón oficial de TikTok [data-e2e="arrow-right"]
      function advanceToNextVideo() {
        const nextBtn =
          document.querySelector('button[data-e2e="arrow-right"]') ||
          document.querySelector('button[aria-label="Ir al siguiente vídeo"]') ||
          document.querySelector('[data-e2e="arrow-right"]') ||
          document.querySelector('button[aria-label*="siguiente" i]') ||
          document.querySelector('button[aria-label*="next" i]');

        if (nextBtn) {
          nextBtn.click();
        }

        window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown", keyCode: 40, which: 40, bubbles: true }));
      }

      const urlBefore = window.location.href;
      advanceToNextVideo();

      const delay = randomDelayMs(config);
      await sleep(delay);

      // Si la URL no ha cambiado tras intentar avanzar en el reproductor:
      if (window.location.href === urlBefore) {
        // Cierra el reproductor modal actual
        const modalClose = document.querySelector('[data-e2e="browse-close"]') || document.querySelector('button[aria-label="Close"]');
        if (modalClose) modalClose.click();
        else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));

        await sleep(600);

        // Desplaza la cuadrícula de perfil hacia abajo para cargar videos siguientes
        window.scrollBy({ top: 600, behavior: "smooth" });
        await sleep(900);

        // Abre el siguiente video visible en la cuadrícula de perfil
        const nextGridVideo = findFirstVideoLink();
        if (nextGridVideo) {
          triggerReactClick(nextGridVideo);
          await sleep(1500);
        } else {
          // Intenta hasta 3 scrolls adicionales antes de concluir
          let foundMore = false;
          for (let s = 1; s <= 4; s++) {
            panelState.status = `Cargando videos más antiguos (${s}/4)...`;
            updatePanel(panel, panelState, t);
            window.scrollBy({ top: 800, behavior: "smooth" });
            await sleep(1500);
            const moreVideo = findFirstVideoLink();
            if (moreVideo) {
              triggerReactClick(moreVideo);
              await sleep(1500);
              foundMore = true;
              break;
            }
          }

          if (!foundMore) {
            break;
          }
        }
      }
    }

    // Cierra el reproductor al finalizar
    const closeBtn = document.querySelector('[data-e2e="browse-close"]') || document.querySelector('button[aria-label="Close"]');
    if (closeBtn) closeBtn.click();
    else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, bubbles: true }));

    panelState.isCompleted = true;
    panelState.currentItem = null;
    panelState.eta = "0s";
    panelState.status = `¡Listo! Todos los videos de '${targetLabel}' han sido procesados.`;
    updatePanel(panel, panelState, t);
    playCompletionSound();
    chrome.runtime.sendMessage({
      action: "notifyFinished",
      payload: {
        title: t.panelTitle || "TikTok Cleaner",
        message: substitutePlaceholders(t.notificationFinished, [panelState.removed]),
      },
    }).catch(() => {});
  }

  async function runRemoval(config) {
    config = config || {};
    const isDryRun = Boolean(config.dryRun);
    const targetType = config.targetType || "reposts";
    const t = config.i18n || {};

    const targetProfileUrl = window.location.href;

    const panel = createInPagePanel(t, isDryRun, targetType);
    if (!panel || !panel.parentNode) {
      console.error("TikTok Cleaner: no se pudo crear el panel.");
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
    panelState.captchaActive = false;
    panelState.captchaManualDismiss = false;
    panelState.isCompleted = false;
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
    const skipCaptchaBtn = panel.querySelector("#trr-skip-captcha");

    if (skipCaptchaBtn) {
      skipCaptchaBtn.onclick = () => {
        panelState.captchaActive = false;
        panelState.captchaManualDismiss = true;
        updatePanel(panel, panelState, t);
      };
    }

    pauseBtn.onclick = () => {
      if (panelState.isCompleted) {
        panel.remove();
        return;
      }
      panelState.paused = !panelState.paused;
      panelState.status = panelState.paused ? (t.statusPaused || "Pausado") : (t.statusResuming || "Reanudando…");
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

    const executionId = ++currentExecutionId;

    // Si había un reproductor o modal abierto de una ejecución previa, ciérralo
    const modalClose = document.querySelector('[data-e2e="browse-close"]') || document.querySelector('button[aria-label="Close"]');
    if (modalClose) {
      modalClose.click();
      await sleep(350);
    }

    const setStatus = (s) => {
      panelState.status = s;
      updatePanel(panel, panelState, t);
    };

    // Ejecuta el automatizador en el reproductor interactivo (100% de persistencia en TikTok para Likes, Compartidos y Favoritos)
    if (!isDryRun) {
      await runUnifiedPlayerAutomator(config, panel, panelState, t, executionId);
      return;
    }

    async function handleCaptchaWait() {
      if (isCaptchaPresent() && !panelState.captchaManualDismiss) {
        panelState.captchaActive = true;
        playAttentionSound();
        setStatus("⚠️ Captcha detectado. Resuélvelo en pantalla para continuar...");
        updatePanel(panel, panelState, t);

        while (isCaptchaPresent() && !panelState.captchaManualDismiss) {
          await sleep(1000);
        }

        panelState.captchaActive = false;
        panelState.captchaManualDismiss = false;
        setStatus("✅ ¡Captcha resuelto! Reanudando limpieza...");
        updatePanel(panel, panelState, t);
        await sleep(1800);
      }
    }

    function checkUrlSafety() {
      const current = window.location.href;
      if (current.includes("/foryou") && !targetProfileUrl.includes("/foryou")) {
        setStatus("Restaurando pestaña de tu perfil...");
        window.history.pushState(null, "", targetProfileUrl);
      }
    }

    try {
      if (config.notLoggedInRedirect) {
        panelState.paused = true;
        panelState.disablePause = true;
        setStatus(t.statusErrorRedirectedForyou || "Inicia sesión en TikTok primero.");
        updatePanel(panel, panelState, t);
        return;
      }

      setStatus(t.statusWaiting || "Identificando tu cuenta…");
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
          ? (t.statusErrorRedirectedForyou || "Inicia sesión en TikTok.")
          : (t.statusErrorNoAccount || "No se pudo identificar tu cuenta. Recarga la página.");
        panelState.paused = true;
        panelState.disablePause = true;
        setStatus(msg);
        updatePanel(panel, panelState, t);
        return;
      }

      let cursor = "0";
      let page = 1;
      const pagePauseMs = Math.max(0, (config.pagePauseSeconds ?? 4)) * 1000;
      let consecutiveFailures = 0;
      let cooldownCount = 0;
      let startTime = Date.now();
      let processedCount = 0;

      const processedIds = new Set();

      let targetText = "Reposts";
      if (targetType === "likes") targetText = "Me Gusta";
      else if (targetType === "favorites") targetText = "Favoritos";

      setStatus(`Buscando videos en "${targetText}"…`);

      while (true) {
        if (executionId !== currentExecutionId) return;
        while (panelState.paused) await sleep(500);
        if (executionId !== currentExecutionId) return;

        checkUrlSafety();
        await handleCaptchaWait();
        if (executionId !== currentExecutionId) return;

        if (isDryRun) {
          setStatus(substitutePlaceholders(t.statusDryRunListing, [page, panelState.totalListed]) || `Escaneando página ${page}...`);
        }

        let result = await fetchItems(targetType, cursor, secUid);

        // Si ocurrió un error de API explícito
        if (result.error) {
          let retrySuccess = false;
          for (let att = 1; att <= 3; att++) {
            setStatus(`Error de conexión con TikTok. Reintentando (${att}/3)...`);
            await sleep(3000);
            result = await fetchItems(targetType, cursor, secUid);
            if (!result.error) {
              retrySuccess = true;
              break;
            }
          }

          if (!retrySuccess) {
            panelState.paused = true;
            panelState.disablePause = true;
            setStatus(`Error en API TikTok [${targetText}]: ${result.error}`);
            updatePanel(panel, panelState, t);
            break;
          }
        }

        // Si la página no trajo items
        if (!result.items || result.items.length === 0) {
          if (panelState.removed > 0 || panelState.skipped > 0) {
            const finalMsg = isDryRun
              ? (substitutePlaceholders(t.statusDryRunDone, [panelState.totalListed]) || "¡Simulación completada!")
              : (t.statusDone || "¡Listo! Todos los videos han sido procesados.");
            setStatus(finalMsg);
            panelState.isCompleted = true;
            playCompletionSound();
          } else {
            setStatus(`No se encontraron videos en la sección "${targetText}".`);
          }

          panelState.reportReady = true;
          panelState.currentItem = null;
          panelState.eta = "0s";
          updatePanel(panel, panelState, t);
          break;
        }

        panelState.pages = page;
        panelState.totalListed += result.items.length;

        // Filtrar candidatos
        const candidates = [];
        for (const item of result.items) {
          if (processedIds.has(item.id)) {
            continue;
          }
          processedIds.add(item.id);

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
          await sleep(600);
        } else {
          const statusMsg = substitutePlaceholders(t.statusPageRemoving, [page, candidates.length, result.items.length])
            || `Pág ${page}: procesando ${candidates.length} de ${result.items.length} videos...`;
          setStatus(statusMsg);

          let stoppedDueToFailures = false;

          for (const item of candidates) {
            while (panelState.paused) await sleep(500);

            checkUrlSafety();
            await handleCaptchaWait();

            if (maxLimit > 0 && panelState.removed >= maxLimit) {
              const limitMsg = substitutePlaceholders(t.statusLimitReached, [maxLimit]) || `Límite alcanzado: ${maxLimit}.`;
              setStatus(limitMsg);
              panelState.isCompleted = true;
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

              // Pausa de seguridad humanizada cada 15 elementos
              if (processedCount > 0 && processedCount % 15 === 0) {
                setStatus("Pausa de seguridad anti-bot (6s)...");
                await sleep(6000);
              }
            } catch (e) {
              console.error("TikTok Cleaner - Error al remover:", item.id, e);
              consecutiveFailures++;
              panelState.failed++;
              panelState.reportFailedItems.push(item);
              panelState.reportReady = true;

              const errMsg = e.message || String(e);
              setStatus(`Error al procesar ${item.authorName}: ${errMsg}`);
              updatePanel(panel, panelState, t);

              if (consecutiveFailures >= 3 && cooldownCount < MAX_COOLDOWNS) {
                cooldownCount++;
                for (let cd = COOLDOWN_SECONDS; cd > 0; cd--) {
                  while (panelState.paused) await sleep(500);
                  setStatus(`Pausa de seguridad (${cd}s)... ${item.authorName}`);
                  await sleep(1000);
                }
                consecutiveFailures = 0;
              } else if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                panelState.paused = true;
                panelState.disablePause = true;
                setStatus(`Detenido tras ${MAX_CONSECUTIVE_FAILURES} fallos consecutivos. (${errMsg})`);
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

        // Determinación del siguiente lote de videos (Paginación Dinámica para eliminación):
        // 1. Si no hay filtros y se eliminaron elementos: los videos más antiguos suben al inicio (cursor "0").
        //    Consultar cursor "0" trae la siguiente tanda de videos antiguos sucesivamente.
        if (!isDryRun && candidates.length > 0 && keywordList.length === 0 && creatorList.length === 0) {
          cursor = "0";
        } else if (result.hasMore && result.nextCursor && result.nextCursor !== "0" && result.nextCursor !== cursor) {
          cursor = result.nextCursor;
        } else if (candidates.length > 0) {
          cursor = "0";
        } else {
          // No quedan más videos por procesar
          const finalMsg = isDryRun
            ? (substitutePlaceholders(t.statusDryRunDone, [panelState.totalListed]) || "¡Simulación completada!")
            : (t.statusDone || "¡Listo! Todos los videos han sido procesados.");
          setStatus(finalMsg);
          panelState.isCompleted = true;
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

        page++;
        panelState.currentItem = null;
        setStatus((t.statusBetweenPages || "Pausa antes de la siguiente página…") + " (" + page + ")");
        updatePanel(panel, panelState, t);
        await sleep(pagePauseMs);
      }
    } catch (err) {
      console.error("TikTok Cleaner:", err);
      if (panel && panel.querySelector("#trr-status")) {
        panel.querySelector("#trr-status").textContent = "Error: " + (err.message || String(err));
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
