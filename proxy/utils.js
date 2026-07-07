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

function portGenerator(config) {
    const usedPorts = config.proxies.map(p => p.port);
    let port;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
        port = Math.floor(Math.random() * (65535 - 1024)) + 1024;
        attempts++;
    } while (usedPorts.includes(port) && attempts < maxAttempts);
    
    return port;
}

module.exports = { getLocalIP, portGenerator };
