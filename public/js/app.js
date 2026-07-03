// ── Main App ──
window.ProxyApp = (function() {

const grid = document.getElementById("proxyGrid");
const count = document.getElementById("count");
const enabledCount = document.getElementById("enabledCount");
const myIp = document.getElementById("myIp");
const overrideInput = document.getElementById("overrideIPModal");
const overrideModal = document.getElementById("overrideModal");
const ipCard = document.getElementById("ipCard");

let localIP = "localhost";
let overrideIP = "";

function getDisplayIP() {
    return overrideIP || localIP;
}

// ── Load ──
async function load() {
    try {
        const info = await ProxyAPI.fetchInfo();
        localIP = info.ip;
        overrideIP = info.overrideIP || "";
        myIp.textContent = getDisplayIP();
        overrideInput.value = overrideIP;
    } catch {}

    const proxies = await ProxyAPI.fetchProxies();

    count.textContent = proxies.length;
    enabledCount.textContent = proxies.filter(p => p.enabled !== false).length;

    grid.innerHTML = "";

    if (proxies.length === 0) {
        grid.appendChild(ProxyCard.createEmpty());
        return;
    }

    proxies.forEach(proxy => {
        grid.appendChild(ProxyCard.create(proxy, getDisplayIP()));
    });
}

// ── Override ──
function toggleOverride() {
    overrideModal.style.display = "flex";
    overrideInput.value = overrideIP;
}

function closeOverrideModal() {
    overrideModal.style.display = "none";
}

// Close modal on overlay click
overrideModal.addEventListener("click", function(e) {
    if (e.target === overrideModal) closeOverrideModal();
});

async function saveOverrideIPFromModal() {
    const val = overrideInput.value.trim();
    try {
        const data = await ProxyAPI.saveOverrideIP(val);
        overrideIP = data.overrideIP;
        closeOverrideModal();
        ProxyUtils.showToast("Override IP updated", "success");
        load();
    } catch {
        ProxyUtils.showToast("Failed to save override IP", "error");
    }
}

// ── Modal helpers ──
function openAddModal() {
    FormModal.openAdd();
}

function openEditModal(port) {
    ProxyAPI.fetchProxies().then(proxies => {
        const proxy = proxies.find(p => p.port === port);
        if (proxy) FormModal.openEdit(proxy);
    });
}

function openDeleteModal(port) {
    DeleteModal.open(port);
}

function closeModal() {
    FormModal.close();
}

function submitModal() {
    FormModal.submit();
}

function closeDeleteModal() {
    DeleteModal.close();
}

function confirmDelete() {
    DeleteModal.confirm();
}

// ── Export / Import ──
async function handleExport() {
    try {
        const data = await ProxyAPI.exportConfig();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "config.json";
        a.click();
        URL.revokeObjectURL(url);
        ProxyUtils.showToast("Configuration exported", "success");
    } catch {
        ProxyUtils.showToast("Failed to export configuration", "error");
    }
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (!data.proxies || !Array.isArray(data.proxies)) {
            ProxyUtils.showToast("Invalid file: expected { proxies: [...] }", "error");
            return;
        }

        const result = await ProxyAPI.importConfig(data);
        ProxyUtils.showToast("Imported " + result.count + " proxies", "success");
        load();
    } catch (err) {
        ProxyUtils.showToast(err.message || "Invalid JSON file", "error");
    }

    event.target.value = "";
}

// ── Init ──
load();

// ── Refresh ──
async function refresh() {
    await load();
    ProxyUtils.showToast("Data refreshed", "success");
}

// Expose global functions for onclick handlers
window.toggleOverride = toggleOverride;
window.saveOverrideIP = saveOverrideIPFromModal;
window.openAddModal = openAddModal;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;
window.closeModal = closeModal;
window.submitModal = submitModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.exportConfig = handleExport;
window.importConfig = handleImport;
window.refresh = refresh;
window.closeOverrideModal = closeOverrideModal;

return { load, openEditModal, openDeleteModal, refresh };
})();