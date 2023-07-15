import { MinecraftWebSocket } from "./minecraft-be-websocket-api/lib/MinecraftWebSocket.js";

// Import internal plugins
import { PlayerCachePlugin } from "./minecraft-be-websocket-api/lib/api/plugins/PlayerCachePlugin/PlayerCachePlugin.js";

// Import plugins
import { SFIMCCamp } from "./plugins/SFIMCCamp/SFIMCCamp.js";

async function main() {
    // Minecraft Web Socket
    const WEBSOCKET_PORT: number = <number><unknown>process.env.WEBSOCKET_PORT || 4005;
    const mwss: MinecraftWebSocket = new MinecraftWebSocket(WEBSOCKET_PORT);

    // Minecraft REST API
    // const REST_PORT: number = <number><unknown>process.env.REST_PORT || 4006;
    // mwss.startRestServer(REST_PORT);

    // Load internal plugins
    await mwss.loadPlugin(new PlayerCachePlugin());

    // Load plugins
    await mwss.loadPlugin(new SFIMCCamp());
}
main();
