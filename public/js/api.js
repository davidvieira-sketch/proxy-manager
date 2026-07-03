// ── API calls ──
window.ProxyAPI = (function() {

async function fetchInfo() {
    return fetch("/api/info").then(r => r.json());
}

async function fetchProxies() {
    return fetch("/api/proxies").then(r => r.json());
}

async function saveOverrideIP(val) {
    const res = await fetch("/api/override-ip", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrideIP: val })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save override IP");
    }
    const result = await res.json();
    console.log("Override IP saved:", result);
    return result;
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
    const result = await res.json();
    console.log("Proxy added:", result);
    return result;
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
    const result = await res.json();
    console.log("Proxy updated:", result);
    return result;
}

async function deleteProxy(port) {
    await fetch("/api/proxies/" + port, { method: "DELETE" });
    console.log("Proxy " + port + " deleted");
}

async function toggleProxy(port) {
    await fetch("/api/proxies/" + port + "/toggle", { method: "PATCH" });
    console.log("Proxy " + port + " toggled");
}

async function testTarget(target) {
    try {
        const res = await fetch("/api/proxies/test", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target })
        });
        const result = await res.json();
        console.log("Target test result:", result);
        return result;
    } catch (error) {
        console.error("Target test failed:", error);
        return { ok: false, error: "Network error" };
    }
}

async function exportConfig() {
    const res = await fetch("/api/proxies/export");
    const result = await res.json();
    console.log("Export config result:", result);
    return result;
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
    const result = await res.json();
    console.log("Import config result:", result);
    return result;
}

return { fetchInfo, fetchProxies, saveOverrideIP, addProxy, updateProxy, deleteProxy, toggleProxy, testTarget, exportConfig, importConfig };
})();