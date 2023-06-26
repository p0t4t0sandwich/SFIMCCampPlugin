import { MinecraftWebSocket } from "./minecraft-be-websocket-api/lib/MinecraftWebSocket.js";

// Import Plugins
import { SFIMCCamp } from "./plugins/SFIMCCamp/SFIMCCamp_name_system.js";

async function main() {
    // Minecraft Web Socket
    const WEBSOCKET_PORT: number = <number><unknown>process.env.WEBSOCKET_PORT || 4005;
    const mwss: MinecraftWebSocket = new MinecraftWebSocket(WEBSOCKET_PORT);

    // Minecraft REST API
    const REST_PORT: number = <number><unknown>process.env.REST_PORT || 4006;
    mwss.startRestServer(REST_PORT);

    // Load plugins
    await mwss.loadPlugin(new SFIMCCamp());
}
main();
