// ── Utility functions ──
window.ProxyUtils = (function() {

function showToast(msg, type = "info") {
    const t = document.createElement("div");
    t.className = "toast " + type;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

function buildTarget(protocol, domain) {
    return protocol + "://" + domain;
}

function parseTarget(url) {
    try {
        const u = new URL(url);
        return { protocol: u.protocol.replace(":", ""), domain: u.host };
    } catch {
        return { protocol: "https", domain: "" };
    }
}

function validateDomain(domain) {
    return domain.trim().length > 0 && !/\s/.test(domain);
}

return { showToast, buildTarget, parseTarget, validateDomain };
})();