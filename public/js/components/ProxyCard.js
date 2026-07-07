// ── Proxy Card Component ──
window.ProxyCard = (function() {

function create(proxy, displayIP) {
    const { protocol, domain } = ProxyUtils.parseTarget(proxy.target);
    const enabled = proxy.enabled !== false;

    const card = document.createElement("div");
    card.className = "proxy-card" + (enabled ? "" : " disabled");
    card.dataset.port = proxy.port;
    card.dataset.name = (proxy.name || domain).toLowerCase();
    card.dataset.target = proxy.target.toLowerCase();
    card.innerHTML = `
        <div class="card-top">
            <div class="card-status">
                <span class="status-dot ${enabled ? "on" : "off"}"></span>
                <button class="btn-icon edit" title="Edit" onclick="event.stopPropagation(); ProxyApp.openEditModal(${proxy.port})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button class="btn-icon delete" title="Delete" onclick="event.stopPropagation(); ProxyApp.openDeleteModal(${proxy.port})">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
            <div class="card-top-actions">
                <a class="card-url" href="${protocol}://${displayIP}:${proxy.port}" target="_blank" title="${protocol}://${displayIP}:${proxy.port}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
            </div>
        </div>
        <div class="card-body">
            <div class="card-name">
                <strong>${proxy.name || domain}</strong>
                <span class="card-domain">${domain}</span>
            </div>
        </div>
        <div class="card-actions">
            <button class="toggle-btn ${enabled ? "active" : ""}" onclick="event.stopPropagation(); ProxyAPI.toggleProxy(${proxy.port}, ${!enabled}).then(() => ProxyApp.load())">
                <span class="toggle-text">${enabled ? "ON" : "OFF"}</span>
            </button>
        </div>
    `;

    card.addEventListener("click", function(e) {
        if (e.target.closest(".toggle-btn") || e.target.closest(".card-url") || e.target.closest(".btn-icon")) return;
        ProxyApp.toggleSelection(proxy.port);
    });

    return card;
}

function createEmpty() {
    const div = document.createElement("div");
    div.className = "empty-state";
    div.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.4">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/>
            <line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
        <h3>No proxies configured</h3>
        <p>Add your first proxy using the button above</p>
    `;
    return div;
}

return { create, createEmpty };
})();