// PermissionsPlugin

import { MinecraftWebSocket } from "../../minecraft-be-websocket-api/lib/MinecraftWebSocket.js";
import { Plugin } from "../../minecraft-be-websocket-api/lib/Plugin.js";

export class PermissionsPlugin extends Plugin {
    // Constructor
    constructor() {
        // Set plugin info
        super(
            "Permissions Plugin",
            "Permissions plugin for MWSS.",
            "1.0.0",
            "p0t4t0sandwich"
        );
    }

    // Methods

    // Start
    async start(mwss: MinecraftWebSocket): Promise<void> {
        this.mwss = mwss;

        console.log("Permissions plugin started!");
    }
}