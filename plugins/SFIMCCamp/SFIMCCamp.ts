// SFIMCCamp - Main plugin file
// Author: p0t4t0sandwich


import { BedrockServer } from "../../minecraft-be-websocket-api/lib/BedrockServer.js";
import { MinecraftWebSocket } from "../../minecraft-be-websocket-api/lib/MinecraftWebSocket.js";
import { Plugin } from "../../minecraft-be-websocket-api/lib/Plugin.js";
import { EventName, Player, PlayerJoinEvent, PlayerLeaveEvent, PlayerMessageBody, PlayerMessageEvent } from "../../minecraft-be-websocket-api/lib/events/Events.js";
import { SFIDataStore } from './SFIDataStore.js';
import { SFIRestAPI } from './SFIRestAPI.js';


// Sleep function
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// SFIMCCamp class - Main plugin class
export class SFIMCCamp extends Plugin {
    // Properties
    private ds: SFIDataStore = new SFIDataStore();
    private restAPI: SFIRestAPI;

    // Constructor
    constructor() {
        super(
            "Name Player Command",
            "Allows players to set a custom name for themselves (Displayed below their in-game name).",
            "1.0.0",
            "p0t4t0sandwich"
        );

        this.setListeners([
            { eventName: EventName.PlayerMessage, callback: this.handlePlayerMessage.bind(this) },
            { eventName: EventName.PlayerJoin, callback: this.handlePlayerJoin.bind(this) },
            { eventName: EventName.PlayerLeave, callback: this.handlePlayerLeave.bind(this) }
        ]);
    }

    // Methods

    // Commands

    // name command
    async nameCommand(server: BedrockServer, playerName: string, cmd: string[]) {
        // Check if command access is enabled
        if (await this.ds.getCommandAccessStatus() === false) return;

        if (cmd.length < 2) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Usage: !name yourName"}]}`);
            return;
        }

        // Get player's name from message
        const name = cmd[1];

        // Announce name change
        await server.sendCommand(`say ${playerName} changed their name to ${name}`);

        // Clear and Reset title message
        await server.sendCommand(`title ${playerName} clear`);
        await server.sendCommand(`title ${playerName} reset`);

        // Add playerName to DataStore
        await this.ds.addPlayerName(playerName, name);

        // Add playerName to be-named queue
        await this.ds.addPlayerToBeNamed(playerName, name);

        // TODO: Alert all online Instructors that a player is ready to be named
    }

    // tpa command
    async tpaCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if command access is enabled
        if (await this.ds.getCommandAccessStatus() === false) return;

        if (cmd.length < 2) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Usage: !tpa <playerName>"}]}`);
            return;
        }

        if (await this.ds.hasTpaRequest(playerName)) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"You already have an active tpa request."}]}`);
            return;
        }

        // Get names from DataStore
        const actualTargetName = cmd[1];
        const targetName = await this.ds.mapNameToPlayer(actualTargetName) || actualTargetName;
        const actualPlayerName = await this.ds.mapPlayerToName(playerName);

        if (!actualPlayerName) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"You must set your name with "!name yourName" before using this command."}]}`);
            return;
        }

        // Send tpa request to target
        await server.sendCommand(`tellraw ${targetName} {"rawtext":[{"text":"${actualPlayerName} has requested to teleport to you. Type !tpaccept <playerName> to accept."}]}`);
        await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Sent tpa request to ${actualTargetName}."}]}`);

        // Save tpa request to DataStore
        await this.ds.saveTpaRequest(actualPlayerName, actualTargetName, 30000);
    }

    // tpaccept command
    async tpacceptCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if command access is enabled
        if (await this.ds.getCommandAccessStatus() === false) return;

        if (cmd.length < 2) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Usage: !tpaccept <playerName>"}]}`);
            return;
        }

        // Get names from DataStore
        const actualTargetName = cmd[1];
        const targetName = await this.ds.mapNameToPlayer(actualTargetName) || actualTargetName;
        const actualPlayerName = await this.ds.mapPlayerToName(playerName);

        if (!actualPlayerName) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"You must set your name with "!name yourName" before using this command."}]}`);
            return;
        }

        // Check if target has an active tpa request
        if (!await this.ds.hasTpaRequest(targetName)) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"${actualTargetName} does not have an active tpa request."}]}`);
            return;
        }

        // Teleport player to target
        await server.sendCommand(`tp ${playerName} ${targetName}`);
        await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Teleported to ${actualTargetName}."}]}`);
        await server.sendCommand(`tellraw ${targetName} {"rawtext":[{"text":"${actualPlayerName} has teleported to you."}]}`);
    }

    // tpdeny command
    async tpdenyCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if command access is enabled
        if (await this.ds.getCommandAccessStatus() === false) return;

        if (cmd.length < 2) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Usage: !tpdeny <playerName>"}]}`);
            return;
        }

        // Get names from DataStore
        const actualTargetName = cmd[1];
        const targetName = await this.ds.mapNameToPlayer(actualTargetName) || actualTargetName;
        const actualPlayerName = await this.ds.mapPlayerToName(playerName);

        if (!actualPlayerName) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"You must set your name with "!name yourName" before using this command."}]}`);
            return;
        }

        // Check if target has an active tpa request
        if (!await this.ds.hasTpaRequest(targetName)) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"${actualTargetName} does not have an active tpa request."}]}`);
            return;
        }

        // Remove tpa request from DataStore
        await this.ds.cancelTpaRequest(targetName);
        await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Denied tpa request from ${actualTargetName}."}]}`);
        await server.sendCommand(`tellraw ${targetName} {"rawtext":[{"text":"${actualPlayerName} denied your tpa request."}]}`);
    }

    // tpcancel command
    async tpcancelCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if command access is enabled
        if (await this.ds.getCommandAccessStatus() === false) return;

        if (cmd.length < 2) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Usage: !tpcancel <playerName>"}]}`);
            return;
        }

        // Get names from DataStore
        const actualTargetName = cmd[1];
        const actualPlayerName = await this.ds.mapPlayerToName(playerName);

        if (!actualPlayerName) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"You must set your name with "!name yourName" before using this command."}]}`);
            return;
        }

        // Check if target has an active tpa request
        if (!await this.ds.hasTpaRequest(actualPlayerName)) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"You do not have an active tpa request."}]}`);
            return;
        }

        // Remove tpa request from DataStore
        await this.ds.cancelTpaRequest(actualPlayerName);
        await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Cancelled tpa request to ${actualTargetName}."}]}`);
    }

    // !n command
    async nameUserCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {

    }

    // Handle PlayerMessage
    async handlePlayerMessage(event: PlayerMessageEvent) {
        event = new PlayerMessageEvent(event);
        const server: BedrockServer = this.mwss.getServer(event.getServer());
        const playerName: string = event.getSender();
        const cmd = event.getMessage().split(" ");

        // Ignore messages from the websocket server
        if (playerName == "Teacher") return

        // Command switch
        switch (cmd[0]) {
            // Name command
            case "!name":
                await this.nameCommand(server, playerName, cmd);
                break;

            // tpa command
            case "!tpa":
            case "!tpask":
                await this.tpaCommand(server, playerName, cmd);
                break;

            // tpaccept command
            case "!tpaccept":
                await this.tpacceptCommand(server, playerName, cmd);
                break;

            // tpdeny command
            case "!tpdeny":
                await this.tpdenyCommand(server, playerName, cmd);
                break;

            // tpcancel command
            case "!tpcancel":
                await this.tpcancelCommand(server, playerName, cmd);
                break;

            // Default
            default:
                break;
        }
    }

    // Handle PlayerJoin
    async handlePlayerJoin(event: PlayerJoinEvent): Promise<void> {
        event = new PlayerJoinEvent(event);
        const playerName: string = event.getPlayer().name;
        const server: BedrockServer = this.mwss.getServer(event.getServer());

        // Sleep for 5 seconds
        await sleep(5000);

        // Set gamemode to adventure
        await server.sendCommand(`gamemode adventure ${playerName}`);

        // Send message to player
        await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Welcome back! To set your name, type !name yourName"}]}`);

        // Set title
        await server.sendCommand(`title ${playerName} times 0 10000 0`);
        await server.sendCommand(`title ${playerName} title Please set your name\nusing: !name yourName`);

        // TODO: broadcast player join to instructors
    }

    // Handle PlayerLeave
    async handlePlayerLeave(event: PlayerLeaveEvent): Promise<void> {
        const player: Player = event.body.player;
        const playerName: string = player.name;

        // Save player location to DataStore
        await this.ds.savePlayerLocation(player);

        // Remove playerName from DataStore
        await this.ds.removePlayerName(playerName);

        // Remove player from tpa requests
        await this.ds.cancelTpaRequest(playerName);

        // Remove player from toBeNamed
        await this.ds.removePlayerToBeNamed(playerName);
    }

    // Start
    async start(mwss: MinecraftWebSocket): Promise<void> {
        this.mwss = mwss;
        this.mrest = mwss.getRestServer();

        this.restAPI = new SFIRestAPI(this.ds);

        console.log("Sci-Fi Minecraft Camp plugin started!");
    }
}
