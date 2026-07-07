const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");

function createProxyManager(config, cfgFile, reloadCallback) {
    let servers = new Map();

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
                logLevel: "silent",
                onProxyReq(proxyReq) {
                    proxyReq.removeHeader("origin");
                    proxyReq.removeHeader("referer");
                }
            })
        );

        const server = app.listen(proxy.port, "0.0.0.0", () => {
        });

        server.on("error", err => {
            console.error(`Failed to start proxy on port ${proxy.port}:`, err.message);
        });

        servers.set(proxy.port, server);
    }

    function reload() {
        stopAll();
        const fs = require("fs");
        const newConfig = JSON.parse(fs.readFileSync(cfgFile, "utf8"));
        newConfig.proxies.forEach(start);
        if (reloadCallback) reloadCallback(newConfig);
        return newConfig;
    }

    return { start, stopAll, reload };
}

module.exports = { createProxyManager };
