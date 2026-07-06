const fs = require("fs");
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const http = require("http");
const https = require("https");
const cors = require("cors");

const cfgFile = __dirname + "/config.json";

let config = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
let servers = new Map();

const os = require("os");

function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }
    return "localhost";
}

const LOCAL_IP = getLocalIP();

function stopAll() {
    for (const server of servers.values()) {
        try { server.close(); } catch (e) {}
    }
    servers.clear();
}

function start(proxy) {
    if (proxy.enabled === false) return;
    const app = express();

    app.use(cors());

    app.use(
        createProxyMiddleware({
            target: proxy.target,
            changeOrigin: true,
            ws: true,
            xfwd: true,
            logLevel: "silent"
        })
    );

    const server = app.listen(proxy.port, "0.0.0.0", () => {
        console.log(`Proxy ${proxy.port} -> ${proxy.target}`);
    });

    server.on("error", err => {
        console.error(`Failed to start proxy on port ${proxy.port}:`, err.message);
    });

    servers.set(proxy.port, server);
}

function reload() {
    stopAll();
    delete require.cache[require.resolve(cfgFile)];
    config = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
    config.proxies.forEach(start);
}

reload();

fs.watchFile(cfgFile, { interval: 1000 }, () => {
    console.log("Config changed. Reloading...");
    reload();
});

const admin = express();
admin.use(cors());
admin.use(express.json({ limit: "10mb" }));
admin.use(express.static(__dirname + "/public"));

admin.get("/api/info", (req, res) => {
    res.json({ ip: LOCAL_IP, overrideIP: config.overrideIP || "" });
});

admin.patch("/api/override-ip", (req, res) => {
    const { overrideIP } = req.body;
    config.overrideIP = overrideIP || "";
    fs.writeFileSync(cfgFile, JSON.stringify(config, null, 2));
    res.json({ ok: true, overrideIP: config.overrideIP });
});

admin.get("/api/proxies", (req, res) => {
    res.json(config.proxies);
});

admin.post("/api/proxies", (req, res) => {
    const { port, target, name } = req.body;
    if (!port || !target) {
        return res.status(400).json({ error: "port and target are required" });
    }
    if (config.proxies.some(p => p.port === port)) {
        return res.status(400).json({ error: "port already exists" });
    }
    config.proxies.push({ port: Number(port), target, enabled: true, name: name || "" });
    fs.writeFileSync(cfgFile, JSON.stringify(config, null, 2));
    reload();
    res.json({ ok: true });
});

admin.put("/api/proxies/:port", (req, res) => {
    const oldPort = Number(req.params.port);
    const { port, target, enabled, name } = req.body;
    const idx = config.proxies.findIndex(p => p.port === oldPort);
    if (idx === -1) return res.sendStatus(404);

    if (port && port !== oldPort && config.proxies.some(p => p.port === port)) {
        return res.status(400).json({ error: "port already exists" });
    }

    config.proxies[idx] = {
        port: Number(port || oldPort),
        target: target || config.proxies[idx].target,
        enabled: enabled !== undefined ? enabled : config.proxies[idx].enabled,
        name: name !== undefined ? name : config.proxies[idx].name
    };

    fs.writeFileSync(cfgFile, JSON.stringify(config, null, 2));
    reload();
    res.json({ ok: true });
});

admin.patch("/api/proxies/:port/toggle", (req, res) => {
    const proxy = config.proxies.find(p => p.port == req.params.port);
    if (!proxy) return res.sendStatus(404);
    const { enabled } = req.body;
    if (enabled === undefined) {
        return res.status(400).json({ error: "enabled status is required" });
    }
    proxy.enabled = Boolean(enabled);
    fs.writeFileSync(cfgFile, JSON.stringify(config, null, 2));
    reload();
    res.json(proxy);
});

admin.delete("/api/proxies/:port", (req, res) => {
    config.proxies = config.proxies.filter(p => p.port != req.params.port);
    fs.writeFileSync(cfgFile, JSON.stringify(config, null, 2));
    reload();
    res.json({ ok: true });
});

admin.post("/api/proxies/test", (req, res) => {
    const { target } = req.body;
    if (!target) return res.status(400).json({ error: "target is required" });

    let responded = false;

    const client = target.startsWith("https") ? https : http;
    const reqTest = client.get(target, { timeout: 5000 }, (resp) => {
        if (responded) return;
        responded = true;
        res.json({ ok: true, status: resp.statusCode, statusText: resp.statusMessage });
    });
    reqTest.on("error", (err) => {
        if (responded) return;
        responded = true;
        res.json({ ok: false, error: err.message });
    });
    reqTest.on("timeout", () => {
        if (responded) return;
        responded = true;
        reqTest.destroy();
        res.json({ ok: false, error: "Connection timed out" });
    });
});

admin.get("/api/proxies/export", (req, res) => {
    res.json(config);
});

admin.post("/api/proxies/import", (req, res) => {
    const data = req.body;
    if (!data || !Array.isArray(data.proxies)) {
        return res.status(400).json({ error: "Invalid format: expected { proxies: [...] }" });
    }
    for (const p of data.proxies) {
        if (!p.port || !p.target) continue;
        if (!config.proxies.some(x => x.port === p.port)) {
            config.proxies.push({ port: Number(p.port), target: p.target, enabled: p.enabled !== false });
        }
    }
    fs.writeFileSync(cfgFile, JSON.stringify(config, null, 2));
    reload();
    res.json({ ok: true, count: config.proxies.length });
});

admin.listen(config.adminPort, "0.0.0.0", () => {
    console.log(`Admin panel: http://0.0.0.0:${config.adminPort}`);
});