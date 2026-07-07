// ── Main App ──
window.ProxyApp = (function() {

const grid = document.getElementById("proxyGrid");
const count = document.getElementById("count");
const enabledCount = document.getElementById("enabledCount");
const myIp = document.getElementById("myIp");
const overrideInput = document.getElementById("overrideIPModal");
const overrideModal = document.getElementById("overrideModal");
const ipCard = document.getElementById("ipCard");
const searchInput = document.getElementById("searchInput");
const bulkBar = document.getElementById("bulkBar");
const bulkCount = document.getElementById("bulkCount");
const selectAllCheckbox = document.getElementById("selectAllCheckbox");

let localIP = "localhost";
let overrideIP = "";
let allProxies = [];
let selectedPorts = new Set();

function getDisplayIP() {
    return overrideIP || localIP;
}

// ── Selection ──
function toggleSelection(port) {
    if (selectedPorts.has(port)) {
        selectedPorts.delete(port);
    } else {
        selectedPorts.add(port);
    }
    updateBulkBar();
    updateCardSelection();
}

function selectAll() {
    const filtered = getFilteredProxies();
    if (selectedPorts.size === filtered.length) {
        selectedPorts.clear();
    } else {
        selectedPorts = new Set(filtered.map(p => p.port));
    }
    updateBulkBar();
    updateCardSelection();
}

function deselectAll() {
    selectedPorts.clear();
    updateBulkBar();
    updateCardSelection();
}

function deleteSelected() {
    const ports = Array.from(selectedPorts);
    if (ports.length === 0) return;
    if (!confirm("Delete " + ports.length + " selected proxy" + (ports.length > 1 ? "ies" : "y") + "?")) return;
    
    Promise.all(ports.map(port => ProxyAPI.deleteProxy(port)))
        .then(() => {
            selectedPorts.clear();
            ProxyUtils.showToast("Deleted " + ports.length + " proxy" + (ports.length > 1 ? "ies" : "y"), "info");
            load();
        })
        .catch(() => {
            ProxyUtils.showToast("Failed to delete some proxies", "error");
            load();
        });
}

function enableAll() {
    const ports = Array.from(selectedPorts);
    if (ports.length === 0) return;
    Promise.all(ports.map(port => ProxyAPI.toggleProxy(port, true)))
        .then(() => {
            ProxyUtils.showToast("Enabled " + ports.length + " proxy" + (ports.length > 1 ? "ies" : "y"), "success");
            load();
        })
        .catch(() => {
            ProxyUtils.showToast("Failed to enable some proxies", "error");
            load();
        });
}

function disableAll() {
    const ports = Array.from(selectedPorts);
    if (ports.length === 0) return;
    Promise.all(ports.map(port => ProxyAPI.toggleProxy(port, false)))
        .then(() => {
            ProxyUtils.showToast("Disabled " + ports.length + " proxy" + (ports.length > 1 ? "ies" : "y"), "info");
            load();
        })
        .catch(() => {
            ProxyUtils.showToast("Failed to disable some proxies", "error");
            load();
        });
}

function updateBulkBar() {
    const count = selectedPorts.size;
    if (count > 0) {
        bulkBar.style.display = "flex";
        bulkCount.textContent = count + " selected";
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        const filtered = getFilteredProxies();
        if (count === filtered.length) {
            selectAllCheckbox.checked = true;
        } else if (count > 0) {
            selectAllCheckbox.indeterminate = true;
        }
    } else {
        bulkBar.style.display = "none";
    }
}

function updateCardSelection() {
    document.querySelectorAll(".proxy-card").forEach(card => {
        const port = parseInt(card.dataset.port);
        if (selectedPorts.has(port)) {
            card.classList.add("selected");
        } else {
            card.classList.remove("selected");
        }
    });
}

function getFilteredProxies() {
    const query = searchInput.value.toLowerCase().trim();
    return allProxies.filter(proxy => {
        if (!query) return true;
        const { domain } = ProxyUtils.parseTarget(proxy.target);
        const name = (proxy.name || domain).toLowerCase();
        const target = proxy.target.toLowerCase();
        const port = String(proxy.port);
        return name.includes(query) || target.includes(query) || port.includes(query);
    });
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

    allProxies = await ProxyAPI.fetchProxies();

    count.textContent = allProxies.length;
    enabledCount.textContent = allProxies.filter(p => p.enabled !== false).length;

    applySearchAndFilter();
}

// ── Search ──
function handleSearch() {
    applySearchAndFilter();
}

function applySearchAndFilter() {
    const query = searchInput.value.toLowerCase().trim();
    
    grid.innerHTML = "";

    const filtered = getFilteredProxies();

    if (filtered.length === 0) {
        grid.appendChild(ProxyCard.createEmpty());
        return;
    }

    filtered.forEach(proxy => {
        grid.appendChild(ProxyCard.create(proxy, getDisplayIP()));
    });

    updateCardSelection();
    updateBulkBar();
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
window.handleSearch = handleSearch;
window.selectAll = selectAll;
window.deselectAll = deselectAll;
window.enableAll = enableAll;
window.disableAll = disableAll;
window.deleteSelected = deleteSelected;

return { load, openEditModal, openDeleteModal, refresh, handleSearch, toggleSelection };
})();