// ── API calls ──
window.ProxyAPI = (function() {

async function fetchInfo() {
    return fetch("/api/info?_=" + Date.now()).then(r => r.json());
}

async function fetchProxies() {
    return fetch("/api/proxies?_=" + Date.now()).then(r => r.json());
}

async function saveOverrideIP(val) {
    const res = await fetch("/api/override-ip", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrideIP: val })
    });
    if (!res.ok) throw new Error("Failed to save override IP");
    return res.json();
}

async function addProxy(data) {
    const res = await fetch("/api/proxies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add proxy");
    }
    return res.json();
}

async function updateProxy(port, data) {
    const res = await fetch("/api/proxies/" + port, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update proxy");
    }
    return res.json();
}

async function deleteProxy(port) {
    await fetch("/api/proxies/" + port, { method: "DELETE" });
}

async function toggleProxy(port, enabled) {
    await fetch("/api/proxies/" + port + "/toggle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled })
    });
}

async function testTarget(target) {
    try {
        const res = await fetch("/api/proxies/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target })
        });
        return await res.json();
    } catch {
        return { ok: false, error: "Network error" };
    }
}

async function exportConfig() {
    return fetch("/api/proxies/export?_=" + Date.now()).then(r => r.json());
}

async function importConfig(data) {
    const res = await fetch("/api/proxies/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
    }
    return res.json();
}

return { fetchInfo, fetchProxies, saveOverrideIP, addProxy, updateProxy, deleteProxy, toggleProxy, testTarget, exportConfig, importConfig };
})();