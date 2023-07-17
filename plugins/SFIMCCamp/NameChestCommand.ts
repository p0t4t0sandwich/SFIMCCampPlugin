// GMC Command

import { BedrockServer } from "../../minecraft-be-websocket-api/lib/BedrockServer.js";
import { Command } from "../../minecraft-be-websocket-api/lib/api/command/Command.js";
import { BedrockPlayer } from "../../minecraft-be-websocket-api/lib/api/player/BedrockPlayer.js";
import { SFIDataStore } from "./SFIDataStore.js";

class NameChestCommand extends Command {
    // Properties
    private ds: SFIDataStore;

    // Constructor
    constructor(ds: SFIDataStore) {
        super(
            "Name Chest Command",
            "General utility command for Name Chest",
            "namechest",
            "-namechest <subcommand> [args]",
            "-", ["!", ".", ","],
            "namechest", false
        );

        this.ds = ds;
    }

    // Methods
    async execute(server: BedrockServer, player: BedrockPlayer, args: string[]) {
        if (this.ds.isInstructor(player.getName())) {
            if (args.length > 0) {
                switch (args[0]) {
                    case "help":
                        player.sendMessage("§aName Chest Help");
                        player.sendMessage("§a-namechest help §7- Shows this help message.");
                        player.sendMessage("§a-namechest set <name> <x> <y> <z> §7- Sets the location of a chest.");
                        player.sendMessage("§a-namechest get <name> §7- Gets the location of a chest.");
                        break;
                    case "set":
                        if (args.length >= 5) {
                            const chestName = args[1];
                            const x = parseInt(args[2]);
                            const y = parseInt(args[3]);
                            const z = parseInt(args[4]);
                            await this.ds.setChestLocation(chestName, { x, y, z });
                            player.sendMessage(`§aSet chest name to §6${chestName}`);
                        } else {
                            player.sendMessage("§cUsage: §7-namechest set <name> <x> <y> <z>");
                        }
                        break;
                    case "get":
                        if (args.length >= 2) {
                            const playerName = player.getName();
                            const chestName = args[1];
                            const chestLocation = await this.ds.getChestLocation(chestName);

                            if (chestLocation == undefined) {
                                player.sendMessage(`§cChest with name §6${chestName} §cdoes not exist!`);
                                return;
                            }

                            player.sendMessage(`§aChest name: §6${chestName}`);
                            player.sendMessage(`§aChest location: §6${chestLocation.x}, ${chestLocation.y}, ${chestLocation.z}`);

                            // Clone the chest to the player's location
                            await server.sendCommand(`execute as ${playerName} run clone ${chestLocation.x} ${chestLocation.y} ${chestLocation.z} ${chestLocation.x} ${chestLocation.y} ${chestLocation.z} ~ ~ ~`);

                            // Break the chest with setblock
                            await server.sendCommand(`execute as ${playerName} run setblock ~ ~ ~ air 0 destroy`);

                            // Send confirmation message
                            await server.tellCommand(playerName, `Cloned the nametag chest for ${chestName} to your location.`);
                            
                        } else {
                            player.sendMessage("§cUsage: §7-namechest get <name>");
                        }
                        break;
                    default:
                        player.sendMessage("§cUnknown subcommand! Use §7-namechest help §cto see all subcommands.");
                        break;
                }
            }
        }
    }
}

export { NameChestCommand };
