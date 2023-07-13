// GMC Command

import { BedrockServer } from "../../minecraft-be-websocket-api/lib/BedrockServer.js";
import { Command } from "../../minecraft-be-websocket-api/lib/api/command/Command.js";
import { BedrockPlayer } from "../../minecraft-be-websocket-api/lib/api/player/BedrockPlayer.js";

class GMCCommand extends Command {
    // Constructor
    constructor() {
        super(
            "GMC Command",
            "Change gamemode to creative",
            "gmc",
            "-gmc",
            "-", ["!", ".", ","],
            "gmc", true
        );
    }

    // Methods
    async execute(server: BedrockServer, player: BedrockPlayer, args: string[]) {
        if (this.hasPermission(player)) {
            // Set gamemode to creative
            await server.gamemodeCommand("creative", player.getName());
            player.sendMessage("§aSet gamemode to creative!");
        }
    }
}

export { GMCCommand };
