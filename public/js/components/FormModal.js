// ── Form Modal Component (Add / Edit) ──
window.FormModal = (function() {

const modal = document.getElementById("formModal");
const title = document.getElementById("formModalTitle");
const nameInput = document.getElementById("modalName");
const domainInput = document.getElementById("modalDomain");
const domainMsg = document.getElementById("modalDomainMsg");
const submitBtn = document.getElementById("modalSubmitBtn");
const protoHttp = document.getElementById("protoHttp");
const protoHttps = document.getElementById("protoHttps");

let protocol = "https";
let editingPort = null;

// Close on overlay click
modal.addEventListener("click", function(e) {
    if (e.target === modal) close();
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
    domainInput.value = "";
    domainMsg.textContent = "";
    domainInput.className = "";
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
    domainInput.value = domain;
    domainMsg.textContent = "";
    domainInput.className = "";
    setProtocol(proto);
    modal.style.display = "flex";
    setTimeout(() => nameInput.focus(), 100);
}

function close() {
    modal.style.display = "none";
}

async function submit() {
    const name = nameInput.value.trim();
    const domain = domainInput.value.trim();
    const target = ProxyUtils.buildTarget(protocol, domain);

    // Validate
    domainMsg.textContent = "";
    domainInput.className = "";

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
            await ProxyAPI.updateProxy(editingPort, { name, target });
            ProxyUtils.showToast("Proxy updated successfully", "success");
        } else {
            await ProxyAPI.addProxy({ name, target });
            ProxyUtils.showToast("Proxy added successfully", "success");
        }
        submitBtn.disabled = false;
        submitBtn.textContent = editingPort ? "Save Changes" : "Add Proxy";
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