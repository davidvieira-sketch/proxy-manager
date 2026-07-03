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
const bulkActions = document.getElementById("bulkActions");
const selectAllCheckbox = document.getElementById("selectAll");
const selectedCountSpan = document.getElementById("selectedCount");

let localIP = "localhost";
let overrideIP = "";
let allProxies = [];

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

    const filtered = allProxies.filter(proxy => {
        if (!query) return true;
        const { domain } = ProxyUtils.parseTarget(proxy.target);
        const name = (proxy.name || domain).toLowerCase();
        const target = proxy.target.toLowerCase();
        const port = String(proxy.port);
        return name.includes(query) || target.includes(query) || port.includes(query);
    });

    if (filtered.length === 0) {
        grid.appendChild(ProxyCard.createEmpty());
        bulkActions.style.display = "none";
        return;
    }

    filtered.forEach(proxy => {
        grid.appendChild(ProxyCard.create(proxy, getDisplayIP()));
    });

    updateBulkActions();
}

// ── Bulk Actions ──
function handleCheckboxChange() {
    updateBulkActions();
}

function updateBulkActions() {
    const checkboxes = document.querySelectorAll(".proxy-checkbox");
    const checked = document.querySelectorAll(".proxy-checkbox:checked");
    
    // Only show bulk actions when at least one proxy is selected
    if (checked.length === 0) {
        bulkActions.style.display = "none";
        return;
    }

    bulkActions.style.display = "flex";
    selectedCountSpan.textContent = `${checked.length} selected`;

    // Update select all checkbox state
    selectAllCheckbox.checked = checked.length === checkboxes.length;
    selectAllCheckbox.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
}

function toggleSelectAll() {
    const checkboxes = document.querySelectorAll(".proxy-checkbox");
    checkboxes.forEach(cb => {
        cb.checked = selectAllCheckbox.checked;
    });
    updateBulkActions();
}

async function bulkToggle() {
    const checked = document.querySelectorAll(".proxy-checkbox:checked");
    if (checked.length === 0) return;

    const ports = Array.from(checked).map(cb => Number(cb.dataset.port));
    
    try {
        await Promise.all(ports.map(port => ProxyAPI.toggleProxy(port)));
        ProxyUtils.showToast(`Toggled ${ports.length} proxy${ports.length > 1 ? 'ies' : ''}`, "success");
        load();
    } catch {
        ProxyUtils.showToast("Failed to toggle proxies", "error");
    }
}

async function bulkDelete() {
    const checked = document.querySelectorAll(".proxy-checkbox:checked");
    if (checked.length === 0) return;

    const ports = Array.from(checked).map(cb => Number(cb.dataset.port));
    const count = ports.length;

    if (!confirm(`Are you sure you want to delete ${count} proxy${count > 1 ? 'ies' : ''}? This action cannot be undone.`)) {
        return;
    }

    try {
        await Promise.all(ports.map(port => ProxyAPI.deleteProxy(port)));
        ProxyUtils.showToast(`Deleted ${count} proxy${count > 1 ? 'ies' : ''}`, "success");
        load();
    } catch {
        ProxyUtils.showToast("Failed to delete proxies", "error");
    }
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
window.handleCheckboxChange = handleCheckboxChange;
window.toggleSelectAll = toggleSelectAll;
window.bulkToggle = bulkToggle;
window.bulkDelete = bulkDelete;

return { load, openEditModal, openDeleteModal, refresh, handleSearch, handleCheckboxChange, toggleSelectAll, bulkToggle, bulkDelete };
})();