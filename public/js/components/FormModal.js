// ── Form Modal Component (Add / Edit) ──
window.FormModal = (function() {

const modal = document.getElementById("formModal");
const title = document.getElementById("formModalTitle");
const nameInput = document.getElementById("modalName");
const portInput = document.getElementById("modalPort");
const portMsg = document.getElementById("modalPortMsg");
const domainInput = document.getElementById("modalDomain");
const domainMsg = document.getElementById("modalDomainMsg");
const domainOverrideInput = document.getElementById("modalDomainOverride");
const domainOverrideMsg = document.getElementById("modalDomainOverrideMsg");
const originalPort = document.getElementById("modalOriginalPort");
const submitBtn = document.getElementById("modalSubmitBtn");
const protoHttp = document.getElementById("protoHttp");
const protoHttps = document.getElementById("protoHttps");

let protocol = "https";
let editingPort = null;

// Close on overlay click
modal.addEventListener("click", function(e) {
    if (e.target === modal) close();
});

// Real-time validation
portInput.addEventListener("input", function() {
    const val = Number(this.value);
    if (!this.value) {
        portMsg.textContent = "";
        portMsg.className = "form-msg";
        portInput.className = "";
    } else if (val >= 1 && val <= 65535) {
        portMsg.textContent = "Valid port";
        portMsg.className = "form-msg ok";
        portInput.className = "ok";
    } else {
        portMsg.textContent = "Port must be 1-65535";
        portMsg.className = "form-msg error";
        portInput.className = "error";
    }
});

domainInput.addEventListener("input", function() {
    const val = this.value.trim();
    if (!val) {
        domainMsg.textContent = "";
        domainMsg.className = "form-msg";
        domainInput.className = "";
    } else if (ProxyUtils.validateDomain(val)) {
        domainMsg.textContent = "Valid domain";
        domainMsg.className = "form-msg ok";
        domainInput.className = "ok";
    } else {
        domainMsg.textContent = "Invalid domain";
        domainMsg.className = "form-msg error";
        domainInput.className = "error";
    }
});

function setProtocol(proto) {
    protocol = proto;
    protoHttp.className = "proto-btn" + (proto === "http" ? " active http" : "");
    protoHttps.className = "proto-btn" + (proto === "https" ? " active https" : "");
}

function openAdd() {
    editingPort = null;
    title.textContent = "Add Proxy";
    submitBtn.textContent = "Add Proxy";
    nameInput.value = "";
    portInput.value = "";
    domainInput.value = "";
    domainOverrideInput.value = "";
    originalPort.value = "";
    portMsg.textContent = "";
    domainMsg.textContent = "";
    domainOverrideMsg.textContent = "";
    portInput.className = "";
    domainInput.className = "";
    domainOverrideInput.className = "";
    setProtocol("https");
    modal.style.display = "flex";
    setTimeout(() => nameInput.focus(), 100);
}

function openEdit(proxy) {
    const { protocol: proto, domain } = ProxyUtils.parseTarget(proxy.target);
    editingPort = proxy.port;
    title.textContent = "Edit Proxy";
    submitBtn.textContent = "Save Changes";
    nameInput.value = proxy.name || "";
    portInput.value = proxy.port;
    domainInput.value = domain;
    domainOverrideInput.value = proxy.domainOverride || "";
    originalPort.value = proxy.port;
    portMsg.textContent = "";
    domainMsg.textContent = "";
    domainOverrideMsg.textContent = "";
    portInput.className = "";
    domainInput.className = "";
    domainOverrideInput.className = "";
    setProtocol(proto);
    modal.style.display = "flex";
    setTimeout(() => nameInput.focus(), 100);
}

function close() {
    modal.style.display = "none";
}

async function submit() {
    const name = nameInput.value.trim();
    const port = Number(portInput.value);
    const domain = domainInput.value.trim();
    const domainOverride = domainOverrideInput.value.trim();
    const target = ProxyUtils.buildTarget(protocol, domain);

    // Validate
    portMsg.textContent = "";
    domainMsg.textContent = "";
    domainOverrideMsg.textContent = "";
    portInput.className = "";
    domainInput.className = "";
    domainOverrideInput.className = "";

    let valid = true;

    if (!domain) {
        domainMsg.textContent = "Domain is required";
        domainMsg.className = "form-msg error";
        domainInput.className = "error";
        valid = false;
    } else if (!ProxyUtils.validateDomain(domain)) {
        domainMsg.textContent = "Invalid domain";
        domainMsg.className = "form-msg error";
        domainInput.className = "error";
        valid = false;
    } else {
        domainMsg.textContent = "Valid domain";
        domainMsg.className = "form-msg ok";
        domainInput.className = "ok";
    }

    if (domainOverride && !ProxyUtils.validateDomain(domainOverride)) {
        domainOverrideMsg.textContent = "Invalid domain";
        domainOverrideMsg.className = "form-msg error";
        domainOverrideInput.className = "error";
        valid = false;
    } else if (domainOverride) {
        domainOverrideMsg.textContent = "Valid domain";
        domainOverrideMsg.className = "form-msg ok";
        domainOverrideInput.className = "ok";
    }

    if (!portInput.value || port < 1 || port > 65535) {
        portMsg.textContent = "Port must be 1-65535";
        portMsg.className = "form-msg error";
        portInput.className = "error";
        valid = false;
    } else {
        portMsg.textContent = "Valid port";
        portMsg.className = "form-msg ok";
        portInput.className = "ok";
    }

    if (!valid) return;

    // Test target
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<div class="btn-spinner"></div> Testing...';

    const testResult = await ProxyAPI.testTarget(target);
    if (!testResult.ok) {
        ProxyUtils.showToast("Target unreachable: " + testResult.error, "error");
        submitBtn.disabled = false;
        submitBtn.textContent = editingPort ? "Save Changes" : "Add Proxy";
        return;
    }

    try {
        if (editingPort) {
            await ProxyAPI.updateProxy(editingPort, { name, target, port, domainOverride });
            ProxyUtils.showToast("Proxy updated successfully", "success");
        } else {
            await ProxyAPI.addProxy({ name, target, port, domainOverride });
            ProxyUtils.showToast("Proxy added successfully", "success");
        }
        close();
        ProxyApp.load();
    } catch (err) {
        ProxyUtils.showToast(err.message || "Operation failed", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = editingPort ? "Save Changes" : "Add Proxy";
    }
}

// Expose protocol setter globally for onclick
window.setProtocol = setProtocol;

return { openAdd, openEdit, close, submit };
})();