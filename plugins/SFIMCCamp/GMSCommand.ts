// GMS Command

import { BedrockServer } from "../../minecraft-be-websocket-api/lib/BedrockServer.js";
import { Command } from "../../minecraft-be-websocket-api/lib/api/command/Command.js";
import { BedrockPlayer } from "../../minecraft-be-websocket-api/lib/api/player/BedrockPlayer.js";

class GMSCommand extends Command {
    // Constructor
    constructor() {
        super(
            "GMS Command",
            "Change gamemode to survival",
            "gms",
            "-gms",
            "-", ["!", ".", ","],
            "gms", true
        );
    }

    // Methods
    async execute(server: BedrockServer, player: BedrockPlayer, args: string[]) {
        if (this.hasPermission(player)) {
            // Set gamemode to survival
            await server.gamemodeCommand("survival", player.getName());
            player.sendMessage("§aSet gamemode to survival!");
        }
    }
}

export { GMSCommand };
