// ── Delete Confirm Modal Component ──
window.DeleteModal = (function() {

const modal = document.getElementById("deleteModal");
const portDisplay = document.getElementById("deletePort");
let targetPort = null;

// Close on overlay click
modal.addEventListener("click", function(e) {
    if (e.target === modal) close();
});

function open(port) {
    targetPort = port;
    portDisplay.textContent = port;
    modal.style.display = "flex";
}

function close() {
    modal.style.display = "none";
    targetPort = null;
}

async function confirm() {
    if (targetPort === null) return;
    await ProxyAPI.deleteProxy(targetPort);
    ProxyUtils.showToast("Proxy deleted", "info");
    close();
    ProxyApp.load();
}

return { open, close, confirm };
})();