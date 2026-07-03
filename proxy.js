const fs = require("fs");
const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const http = require("http");
const https = require("https");

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
    
    const targetUrl = new URL(proxy.target);
    const originalOrigin = `${targetUrl.protocol}//${targetUrl.host}`;
    const proxyAddress = `http://${LOCAL_IP}:${proxy.port}`;
    
    const proxyOptions = {
        target: proxy.target,
        changeOrigin: true,
        ws: true,
        xfwd: true,
        logLevel: "silent",
        onProxyReq: (proxyReq, req, res) => {
            // If domain override is set, rewrite the Host header
            if (proxy.domainOverride) {
                proxyReq.setHeader('Host', proxy.domainOverride);
            }
        },
        onProxyRes: (proxyRes, req, res) => {
            // Rewrite Location headers in redirects to point back to the proxy
            if (proxyRes.headers.location) {
                let location = proxyRes.headers.location;
                
                // Replace the entire original origin with the proxy address
                // This ensures redirects go back to the proxy, not the original site
                location = location.replace(originalOrigin, proxyAddress);
                
                // Also try to replace just the host if full origin didn't match
                const originalHost = targetUrl.host;
                location = location.replace(new RegExp(originalHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `${LOCAL_IP}:${proxy.port}`);
                
                proxyRes.headers.location = location;
            }
            
            // Rewrite Content-Location header if present
            if (proxyRes.headers['content-location']) {
                let contentLocation = proxyRes.headers['content-location'];
                contentLocation = contentLocation.replace(originalOrigin, proxyAddress);
                const originalHost = targetUrl.host;
                contentLocation = contentLocation.replace(new RegExp(originalHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `${LOCAL_IP}:${proxy.port}`);
                proxyRes.headers['content-location'] = contentLocation;
            }
        }
    };
    
    if (proxy.domainOverride) {
        console.log(`Proxy ${proxy.port} -> ${proxy.target} (domain override: ${proxy.domainOverride})`);
    } else {
        console.log(`Proxy ${proxy.port} -> ${proxy.target}`);
    }
    
    app.use(createProxyMiddleware(proxyOptions));
    const server = app.listen(proxy.port, "0.0.0.0", () => {
        if (proxy.domainOverride) {
            console.log(`Proxy ${proxy.port} -> ${proxy.target} (override: ${proxy.domainOverride})`);
        } else {
            console.log(`Proxy ${proxy.port} -> ${proxy.target}`);
        }
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
    config.proxies.push({ port: Number(port), target, enabled: true, name: name || "", domainOverride: "" });
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
        name: name !== undefined ? name : config.proxies[idx].name,
        domainOverride: req.body.domainOverride !== undefined ? req.body.domainOverride : (config.proxies[idx].domainOverride || "")
    };

    fs.writeFileSync(cfgFile, JSON.stringify(config, null, 2));
    reload();
    res.json({ ok: true });
});

admin.patch("/api/proxies/:port/toggle", (req, res) => {
    const proxy = config.proxies.find(p => p.port == req.params.port);
    if (!proxy) return res.sendStatus(404);
    proxy.enabled = !proxy.enabled;
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
            config.proxies.push({ 
                port: Number(p.port), 
                target: p.target, 
                enabled: p.enabled !== false,
                name: p.name || "",
                domainOverride: p.domainOverride || ""
            });
        }
    }
    fs.writeFileSync(cfgFile, JSON.stringify(config, null, 2));
    reload();
    res.json({ ok: true, count: config.proxies.length });
});

admin.listen(config.adminPort, "0.0.0.0", () => {
    console.log(`Admin panel: http://0.0.0.0:${config.adminPort}`);
});