// SFIMCCamp - Main plugin file
// Author: p0t4t0sandwich


import { BedrockServer } from "../../minecraft-be-websocket-api/lib/BedrockServer.js";
import { MinecraftWebSocket } from "../../minecraft-be-websocket-api/lib/MinecraftWebSocket.js";
import { Plugin } from "../../minecraft-be-websocket-api/lib/Plugin.js";
import { EventName, Player, PlayerJoinEvent, PlayerLeaveEvent, PlayerMessageEvent } from "../../minecraft-be-websocket-api/lib/events/Events.js";
import { SFIDataStore, SFIPlayerData } from './SFIDataStore.js';
import { SFIRestAPI } from './SFIRestAPI.js';


// Sleep function
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Interfaces
interface PlayerDataMap {
    [key: string]: SFIPlayerData;
}


// SFIMCCamp class - Main plugin class
export class SFIMCCamp extends Plugin {
    // Properties
    private ds: SFIDataStore = new SFIDataStore();
    private restAPI: SFIRestAPI;
    private playerDataMap: PlayerDataMap = {};

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

    // ----------------------------- Commands -----------------------------

    // name command
    async nameCommand(server: BedrockServer, playerName: string, cmd: string[]) {
        // Check if command access is enabled
        const playerData: SFIPlayerData = this.playerDataMap[playerName];
        if (playerData && playerData.commandAccess === false) return;

        if (cmd.length < 2) {
            await server.tellCommand(playerName, "Usage: !name yourName");
            return;
        }

        // Get player's name from message
        const realName = cmd[1];

        // Announce name change
        await server.sayCommand(`${playerName} changed their name to ${realName}`);

        // Clear and Reset title message
        await server.sendCommand(`title ${playerName} clear`);
        await server.sendCommand(`title ${playerName} reset`);

        // Add playerName to playerData
        playerData.setRealName(realName);

        // Add playerName to be-named queue
        await this.ds.addPlayerNameQueue(playerName, realName);

        // Send message to instructors
        await this.broadcastToInstructors(server, `${playerName} has been added to the naming queue. Use "!n" to teleport to them.`);
    }

    // tpa command
    async tpaCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if command access is enabled
        const playerData: SFIPlayerData = this.playerDataMap[playerName];
        if (playerData && playerData.commandAccess === false) return;

        if (cmd.length < 2) {
            await server.tellCommand(playerName, "Usage: !tpa <playerName>");
            return;
        }

        if (playerData.hasActiveOutgoingTpaRequest()) {
            await server.tellCommand(playerName, "You already have an active tpa request.");
            return;
        }

        // Get names from DataStore
        const realTargetName: string = cmd[1];
        let targetPlayer: SFIPlayerData = null;

        for (const target of Object.values(this.playerDataMap)) {
            if (target.realName === realTargetName) {
                targetPlayer = target;
                break;
            }
        }

        if (!targetPlayer) {
            await server.tellCommand(playerName, `${realTargetName} is not a valid player.`);
            return;
        }

        if (!playerData.realName || playerData.realName === "") {
            await server.tellCommand(playerName, 'You must set your name with "!name yourName" before using this command.');
            return;
        }

        // Send tpa request to target
        await server.tellCommand(targetPlayer.playerName, `${playerData.realName} has requested to teleport to you. Type "!tpaccept playerName" to accept.`);
        await server.tellCommand(playerName, `Sent tpa request to ${targetPlayer.realName}.`);

        // Save tpa request to playerData
        playerData.setOutgoingTpaRequest(targetPlayer.playerName, 120000);
        targetPlayer.setIncomingTpaRequest(playerName, 120000);
    }

    // tpaccept command
    async tpacceptCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if command access is enabled
        const playerData: SFIPlayerData = this.playerDataMap[playerName];
        if (playerData && playerData.commandAccess === false) return;

        if (cmd.length < 2) {
            await server.tellCommand(playerName, "Usage: !tpaccept playerName");
            return;
        }

        // Get names from DataStore
        const realTargetName: string = cmd[1];
        let targetPlayer: SFIPlayerData = null;

        for (const target of Object.values(this.playerDataMap)) {
            if (target.realName === realTargetName) {
                targetPlayer = target;
                break;
            }
        }

        if (!targetPlayer) {
            await server.tellCommand(playerName, `${realTargetName} is not a valid player.`);
            return;
        }

        if (!playerData.realName || playerData.realName === "") {
            await server.tellCommand(playerName, 'You must set your name with "!name yourName" before using this command.');
            return;
        }

        // Check if target incoming tpa request is from player
        if (!targetPlayer.hasActiveIncomingTpaRequest() || targetPlayer.incomingTpaRequest !== playerName) {
            await server.tellCommand(playerName, `You don't have an active tpa request from ${targetPlayer.realName}.`);
            return;
        }

        // Teleport player to target
        await server.teleportPlayerToPlayerCommand(playerName, targetPlayer.playerName);
        await server.tellCommand(playerName, `Teleported to ${targetPlayer.realName}.`);
        await server.tellCommand(targetPlayer.playerName, `${playerData.realName} has teleported to you.`);
    }

    // tpdeny command
    async tpdenyCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if command access is enabled
        const playerData: SFIPlayerData = this.playerDataMap[playerName];
        if (playerData && playerData.commandAccess === false) return;

        if (cmd.length < 2) {
            await server.tellCommand(playerName, "Usage: !tpdeny playerName");
            return;
        }

        // Get names from DataStore
        const realTargetName: string = cmd[1];
        let targetPlayer: SFIPlayerData = null;

        for (const target of Object.values(this.playerDataMap)) {
            if (target.realName === realTargetName) {
                targetPlayer = target;
                break;
            }
        }

        if (!targetPlayer) {
            await server.tellCommand(playerName, `${realTargetName} is not a valid player.`);
            return;
        }

        if (!playerData.realName || playerData.realName === "") {
            await server.tellCommand(playerName, 'You must set your name with "!name yourName" before using this command.');
            return;
        }

        // Check if target incoming tpa request is from player
        if (!targetPlayer.hasActiveIncomingTpaRequest() || targetPlayer.incomingTpaRequest !== playerName) {
            await server.tellCommand(playerName, `You don't have an active tpa request from ${targetPlayer.realName}.`);
            return;
        }

        // Remove tpa request from playerData
        playerData.outgoingTpaRequest = "";
        targetPlayer.incomingTpaRequest = "";

        // Notify players
        await server.tellCommand(playerName, `Denied tpa request from ${targetPlayer.realName}.`);
        await server.tellCommand(targetPlayer.playerName, `${playerData.realName} denied your tpa request.`);
    }

    // tpcancel command
    async tpcancelCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if command access is enabled
        const playerData: SFIPlayerData = this.playerDataMap[playerName];
        if (playerData && playerData.commandAccess === false) return;

        if (cmd.length < 2) {
            await server.tellCommand(playerName, "Usage: !tpcancel playerName");
            return;
        }

        // Get names from DataStore
        const realTargetName: string = cmd[1];
        let targetPlayer: SFIPlayerData = null;

        for (const target of Object.values(this.playerDataMap)) {
            if (target.realName === realTargetName) {
                targetPlayer = target;
                break;
            }
        }

        if (!targetPlayer) {
            await server.tellCommand(playerName, `${realTargetName} is not a valid player.`);
            return;
        }

        if (!playerData.realName || playerData.realName === "") {
            await server.tellCommand(playerName, 'You must set your name with "!name yourName" before using this command.');
            return;
        }

        // Check if target incoming tpa request is from player
        if (!targetPlayer.hasActiveIncomingTpaRequest() || targetPlayer.incomingTpaRequest !== playerName) {
            await server.tellCommand(playerName, `You don't have an active tpa request tp ${targetPlayer.realName}.`);
            return;
        }

        // Remove tpa request from playerData
        playerData.outgoingTpaRequest = "";
        targetPlayer.incomingTpaRequest = "";

        // Notify players
        await server.tellCommand(playerName, `Cancelled tpa request to ${targetPlayer.realName}.`);
        await server.tellCommand(targetPlayer.playerName, `${playerData.realName} cancelled their tpa request.`);
    }

    // TODO: individual camper perms -- maybe a gmc/gms shortcut also?
    // gamemode command
    async gamemodeCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if command access is enabled
        const playerData: SFIPlayerData = this.playerDataMap[playerName];
        if (playerData && playerData.commandAccess === false) return;

        if (cmd.length < 2) {
            await server.tellCommand(playerName, "Usage: !gamemode gamemode");
            return;
        }

        // Get player name from DataStore
        const actualPlayerName: string = playerData.realName;
        if (!actualPlayerName) {
            await server.tellCommand(playerName, 'You must set your name with "!name yourName" before using this command.');
            return;
        }

        // Get gamemode from command
        const gamemode = cmd[1];

        // Check if gamemode is valid
        if (gamemode !== "survival" && gamemode !== "creative" && gamemode !== "0" && gamemode !== "1") {
            await server.tellCommand(playerName, "Invalid gamemode. Must be survival or creative.");
            return;
        }

        // Set gamemode
        await server.gamemodeCommand(playerName, gamemode);

        // Tell player
        await server.tellCommand(playerName, `Gamemode set to ${gamemode}.`);
    }

    // n command
    async nameUserQueueCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if the player is an instructor
        const playerData: SFIPlayerData = this.playerDataMap[playerName];
        if (!playerData || playerData.commandAccess === false) return;

        let playerToBeNamed;
        if (cmd.length < 2) {
            // Get name from DataStore
            playerToBeNamed = await this.ds.getNextPlayerNameQueue()
        } else {
            // Get name from command
            const realTargetName = cmd[1];
            let targetPlayer: SFIPlayerData = null;

            for (const target of Object.values(this.playerDataMap)) {
                if (target.realName === realTargetName) {
                    targetPlayer = target;
                    break;
                }
            }

            playerToBeNamed = {
                playerName: targetPlayer.playerName,
                realName: realTargetName
            }

            if (!playerToBeNamed.playerName) {
                await server.tellCommand(playerName, `${realTargetName} is not in the system.`);
                return;
            }
        }

        if (!playerToBeNamed) {
            await server.tellCommand(playerName, "There are no players in the queue.");
            return;
        }

        // Teleport player to target
        await server.sendCommand(`tp ${playerName} ${playerToBeNamed.playerName}`);

        // Get the location of the nametag chest
        const chestLocation = await this.ds.getChestLocation(playerToBeNamed.realName);

        // Clone the chest to the player's location
        await server.sendCommand(`execute "${playerName}" ~ ~ ~ clone ${chestLocation.x} ${chestLocation.y} ${chestLocation.z} ${chestLocation.x} ${chestLocation.y} ${chestLocation.z} ~ ~ ~`);

        // Break the chest with setblock
        await server.sendCommand(`execute "${playerName}" ~ ~ ~ setblock ~ ~ ~ air 0 destroy`);

        // Sleep for 0.5 seconds
        await sleep(500);

        // Teleport the player to the toBeNamedPlayer
        await server.tellCommand(playerName, `Teleporting to ${playerToBeNamed.name}.`);
        await server.teleportPlayerToPlayerCommand(playerName, playerToBeNamed.playerName);

        // Give the player slowness 10 and resistance 10 for 15 seconds
        await server.effectCommand(playerToBeNamed.playerName, "slowness", 15, 10);
        await server.effectCommand(playerToBeNamed.playerName, "resistance", 15, 10);

        // Change their game mode to survival
        await server.gamemodeCommand("survival", playerToBeNamed.playerName);

        // Remove player from queue
        await this.ds.removePlayerNameQueue(playerToBeNamed.playerName);
    }

    // setnamechest command
    async setNameChestCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if the user has permission to use this command
        if (await this.ds.isInstructor(playerName) === false) return;

        if (cmd.length < 5) {
            await server.tellCommand(playerName, "Usage: !setnamechest campersName x y z");
            return;
        }

        // Get the location of the chest from the comand
        const name = cmd[1];
        const x = parseInt(cmd[2]);
        const y = parseInt(cmd[3]);
        const z = parseInt(cmd[4]);

        // Set the location of the chest in the DataStore
        await this.ds.setChestLocation(name, { x, y, z });

        // Send confirmation message
        await server.tellCommand(playerName, `Set the location of the nametag chest for ${name} to ${x} ${y} ${z}.`);
    }

    // commandaccess command
    async commandAccessCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if the user has permission to use this command
        if (await this.ds.isInstructor(playerName) === false) return;

        if (cmd.length < 2) {
            await server.tellCommand(playerName, "Usage: !commandaccess true/false");
            return;
        }

        // Get the access boolean from the command
        const access = cmd[1].toLowerCase() === "true";

        // Set the access boolean in the DataStore
        await this.setCommandAccess(playerName, access);

        // Send confirmation message
        await server.tellCommand(playerName, `Set command access to ${access}.`);
    }

    // nametitle command
    async nameTitleCommand(server: BedrockServer, playerName: string, cmd: string[]): Promise<void> {
        // Check if the user has permission to use this command
        if (await this.ds.isInstructor(playerName) === false) return;

        if (cmd.length < 2) {
            await server.tellCommand(playerName, "Usage: !nametitle MinecraftPlayerName");
            return;
        }

        // Get the name from the command
        const name = cmd[1];

        // Run join functions
        // Set gamemode to adventure
        await server.gamemodeCommand("adventure", name);

        // Send message to player
        await server.tellCommand(name, "Welcome back! To set your name, type !name yourName");

        // Set title
        await server.sendCommand(`title ${name} times 0 10000 0`);
        await server.sendCommand(`title ${name} title Please set your name\nusing: !name yourName`);
    }

    // -------------------------------------- General Functions --------------------------------------

    // broadcast message to all instructors
    async broadcastToInstructors(server: BedrockServer, message: string): Promise<void> {
        const instructors = await this.ds.getInstructors();
        const playerList = (await server.listCommand()).getPlayers();

        const instructorList = playerList.filter((player) => {
            return instructors.includes(player);
        });

        for (const instructor of instructorList) {
            await server.tellCommand(instructor, message);
        }
    }

    // Set command access
    async setCommandAccess(playerName: string, access: boolean): Promise<void> {
        this.playerDataMap[playerName].commandAccess = access;
    }

    // Set all command access
    async setAllCommandAccess(access: boolean): Promise<void> {
        const players = Object.keys(this.playerDataMap);
        for (const player of players) {
            await this.setCommandAccess(player, access);
        }
    }

    // Pause all servers
    async pauseAllServers(): Promise<void> {
        const serversNames = this.mwss.getServerNames();
        for (const serversName of serversNames) {
            const server = this.mwss.getServer(serversName);
            await server.globalpauseCommand(true);
        }
    }

    // Unpause all servers
    async unpauseAllServers(): Promise<void> {
        const serversNames = this.mwss.getServerNames();
        for (const serversName of serversNames) {
            const server = this.mwss.getServer(serversName);
            await server.globalpauseCommand(false);
        }
    }

    // -------------------------------------- Event Handlers --------------------------------------

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

            // TODO: tpahere command

            // gamemode command
            case "!gamemode":
                await this.gamemodeCommand(server, playerName, cmd);
                break;

            // gmc command
            case "!gmc":
                await this.gamemodeCommand(server, playerName, ["!gamemode", "creative"]);
                break;

            // gms command
            case "!gms":
                await this.gamemodeCommand(server, playerName, ["!gamemode", "survival"]);
                break;

            // n command
            case "!n":
                await this.nameUserQueueCommand(server, playerName, cmd);
                break;

            // setnamechest command
            case "!setnamechest":
                await this.setNameChestCommand(server, playerName, cmd);
                break;

            // commandaccess command
            case "!commandaccess":
                await this.commandAccessCommand(server, playerName, cmd);
                break;

            // nametitle command
            case "!nametitle":
                await this.nameTitleCommand(server, playerName, cmd);
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

        //
        console.log("PlayerJoinEvent");
        console.log(event.getPlayer());
        //

        // Sleep for 5 seconds
        await sleep(5000);

        // Set gamemode to adventure
        await server.gamemodeCommand("adventure", playerName);

        // Send message to player
        await server.tellCommand(playerName, "Welcome back! To set your name, type !name yourName");

        // Set title
        await server.sendCommand(`title ${playerName} times 0 10000 0`);
        await server.sendCommand(`title ${playerName} title Please set your name\nusing: !name yourName`);
    }

    // Handle PlayerLeave
    async handlePlayerLeave(event: PlayerLeaveEvent): Promise<void> {
        event = new PlayerLeaveEvent(event);
        const player: Player = event.getPlayer();
        const playerName: string = player.name;

        //
        console.log("PlayerLeaveEvent");
        console.log(event.getPlayer());
        //

        // Save player location to DataStore
        this.playerDataMap[playerName].logoutLocation = {
            dimension: player.dimension,
            position: player.position,
        };

        // Remove playerName from DataStore
        await this.ds.setPlayerData(player.id, <SFIPlayerData>this.playerDataMap[playerName].logoutToJSON(player));

        // Remove player from toBeNamed
        await this.ds.removePlayerNameQueue(playerName);
    }

    // Start
    async start(mwss: MinecraftWebSocket): Promise<void> {
        this.mwss = mwss;
        this.mrest = mwss.getRestServer();

        this.restAPI = new SFIRestAPI(this, this.ds);

        console.log("Sci-Fi Minecraft Camp plugin started!");
    }
}
