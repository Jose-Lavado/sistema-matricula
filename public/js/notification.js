// notification.js — polling de notificaciones cada 3s, badge y dropdown en la barra
(function () {
  let pollInterval = null;
  let abortController = null;
  let isPolling = false;

  function findBellBtn() {
    const btns = document.querySelectorAll(".btn-outline-secondary, .btn.btn-sm");
    for (const btn of btns) {
      if (btn.querySelector(".bi-bell")) return btn;
    }
    return null;
  }

  function buildDropdown(bellBtn) {
    if (document.getElementById("notifDropdown")) return;

    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";

    bellBtn.parentNode.insertBefore(wrapper, bellBtn);
    wrapper.appendChild(bellBtn);

    const badge = document.createElement("span");
    badge.id = "notifBadge";
    badge.className = "position-absolute top-0 start-100 translate-middle badge rounded-pill";
    badge.style.cssText =
      "background:#d4a017;color:#0a1628;font-size:10px;min-width:18px;display:none";
    badge.textContent = "0";
    wrapper.appendChild(badge);

    const dropdown = document.createElement("div");
    dropdown.id = "notifDropdown";
    dropdown.className = "dropdown-menu shadow border-0";
    dropdown.style.cssText =
      "position:absolute;top:100%;right:0;left:auto;min-width:340px;max-height:420px;overflow-y:auto;border-radius:12px;margin-top:6px;z-index:9999;display:none;word-break:break-word;";

    const header = document.createElement("div");
    header.className =
      "d-flex justify-content-between align-items-center px-3 py-2 border-bottom sticky-top bg-white";
    header.style.borderRadius = "12px 12px 0 0";
    header.innerHTML =
      '<strong class="small" style="color:#0a1628">Notificaciones</strong><button class="btn btn-sm btn-link text-decoration-none p-0 small" id="marcarLeidasBtn" style="color:#d4a017">Marcar todo leído</button>';
    dropdown.appendChild(header);

    const list = document.createElement("div");
    list.id = "notifList";
    list.className = "py-1";
    dropdown.appendChild(list);

    wrapper.appendChild(dropdown);
  }

  function getIcon(tipo) {
    if (tipo === "success") return "bi-check-circle-fill text-success";
    if (tipo === "danger") return "bi-x-circle-fill text-danger";
    if (tipo === "warning") return "bi-clock-fill text-warning";
    return "bi-info-circle-fill text-primary";
  }

  function renderNotifications(notifs) {
    const list = document.getElementById("notifList");
    const badge = document.getElementById("notifBadge");
    if (!list) return;

    const unread = notifs.filter((n) => !n.leida);
    if (badge) {
      if (unread.length) {
        badge.textContent = unread.length > 9 ? "9+" : unread.length;
        badge.style.display = "inline";
      } else {
        badge.style.display = "none";
      }
    }

    if (!notifs.length) {
      list.innerHTML =
        '<div class="text-center text-muted py-4 small">Sin notificaciones</div>';
      return;
    }

    list.innerHTML = notifs
      .map(
        (n) => `
      <div class="d-flex align-items-start gap-2 px-3 py-2 ${n.leida ? "" : "bg-warning bg-opacity-10"}" style="border-bottom:1px solid #f0f0f0;">
        <i class="bi ${getIcon(n.tipo)} fs-5 mt-1"></i>
        <div class="flex-grow-1" style="cursor:pointer">
          <div class="small fw-semibold" style="color:#0a1628">${n.mensaje}</div>
          <small class="text-muted" style="font-size:11px">${new Date(n.timestamp).toLocaleString("es-PE")}</small>
        </div>
        <button class="btn btn-sm p-0 border-0 text-muted eliminar-notif" data-id="${n.id}" title="Eliminar" style="flex-shrink:0;font-size:18px;line-height:1;"><i class="bi bi-x"></i></button>
        ${n.leida ? "" : '<span class="mt-1" style="width:8px;height:8px;background:#d4a017;border-radius:50%;flex-shrink:0"></span>'}
      </div>`
      )
      .join("");

    list.querySelectorAll(".eliminar-notif").forEach(btn => {
      btn.addEventListener("click", async function(e) {
        e.stopPropagation();
        const id = this.dataset.id;
        try {
          await fetch(`/api/notificaciones/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          fetchNotifications();
        } catch {}
      });
    });
  }

  function getToken() {
    const raw = sessionStorage.getItem("user");
    if (!raw) return "";
    try { return JSON.parse(raw).token || ""; } catch { return ""; }
  }

  async function fetchNotifications() {
    if (isPolling) return;
    isPolling = true;

    if (abortController) abortController.abort();
    abortController = new AbortController();

    try {
      const res = await fetch("/api/notificaciones", {
        signal: abortController.signal,
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      isPolling = false;
      if (!res.ok) return;
      const json = await res.json();
      renderNotifications(json.data || []);
    } catch (e) {
      isPolling = false;
      if (e.name === "AbortError") return;
    }
  }

  async function markAllRead() {
    try {
      const list = document.getElementById("notifList");
      if (!list) return;
      const notifEls = list.querySelectorAll("div[style*='cursor:pointer']");
      if (!notifEls.length) return;

      const res = await fetch("/api/notificaciones/leer", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ids: "all" }),
      });
      if (!res.ok) return;
      fetchNotifications();
    } catch {
      // ignore
    }
  }

  function toggleDropdown(e) {
    e.stopPropagation();
    const dd = document.getElementById("notifDropdown");
    if (!dd) return;
    dd.style.display = dd.style.display === "block" ? "none" : "block";
    if (dd.style.display === "block") fetchNotifications();
  }

  function startPolling() {
    if (pollInterval) return;
    fetchNotifications();
    pollInterval = setInterval(fetchNotifications, 3000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    isPolling = false;
  }

  function initNotif() {
    const bellBtn = findBellBtn();
    if (!bellBtn) return false;
    if (document.getElementById("notifDropdown")) return true;
    buildDropdown(bellBtn);
    bellBtn.addEventListener("click", toggleDropdown);

    document.getElementById("marcarLeidasBtn")?.addEventListener("click", markAllRead);

    document.addEventListener("click", function (e) {
      const dd = document.getElementById("notifDropdown");
      if (dd && !dd.parentNode.contains(e.target)) {
        dd.style.display = "none";
      }
    });

    startPolling();

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
      }
    });
    return true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!initNotif()) {
      var retries = 0;
      var timer = setInterval(function () {
        retries++;
        if (initNotif() || retries >= 10) clearInterval(timer);
      }, 500);
    }
  });

  window.__stopNotifPolling = stopPolling;
})();
