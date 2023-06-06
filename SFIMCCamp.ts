// NamePlayerCommand
// Author: p0t4t0sandwich

import express, { Request, Response, Router } from 'express';


import { BedrockServer } from "./minecraft-be-websocket-api/lib/BedrockServer.js";
import { DataStore } from "./minecraft-be-websocket-api/lib/DataStore.js";
import { MinecraftWebSocket } from "./minecraft-be-websocket-api/lib/MinecraftWebSocket.js";
import { Plugin } from "./minecraft-be-websocket-api/lib/Plugin.js";
import { EventName, Player, PlayerJoinEvent, PlayerLeaveEvent, PlayerMessageEvent } from "./minecraft-be-websocket-api/lib/events/Events.js";


const PLUGIN_REST_PORT: number = <number><unknown>process.env.PLUGIN_REST_PORT || 4007;


// Interfaces
interface playerLocation {
    dimension: number;
    position: {
        x: number;
        y: number;
        z: number;
    };
}


// SFIDataStore class - DataStore for SFIMCCamp
class SFIDataStore extends DataStore {
    // Constructor
    constructor() {
        super("./", "SFIMCCamp");
    }

    // Methods

    // Add playerName to DataStore
    async addPlayerName(playerName: string, name: string) {
        const nameData = await this.getData("PlayerNames");

        nameData[playerName] = name;
        await this.setData("PlayerNames", nameData);
        await this.saveData();
    }

    // Remove playerName from DataStore
    async removePlayerName(playerName: string) {
        const nameData = await this.getData("PlayerNames");

        delete nameData[playerName];
        await this.setData("PlayerNames", nameData);
        await this.saveData();
    }

    // Add instructor to DataStore
    async addInstructor(playerName: string) {
        const instructorData = await this.getData("Instructors");

        instructorData[playerName] = true;
        await this.setData("Instructors", instructorData);
        await this.saveData();
    }

    // Remove instructor from DataStore
    async removeInstructor(playerName: string) {
        const instructorData = await this.getData("Instructors");

        delete instructorData[playerName];
        await this.setData("Instructors", instructorData);
        await this.saveData();
    }

    // Is player an instructor?
    async isInstructor(playerName: string): Promise<boolean> {
        const instructorData = await this.getData("Instructors");

        return instructorData[playerName] || false;
    }

    // Get all instructors
    async getInstructors(): Promise<string[]> {
        const instructorData = await this.getData("Instructors");

        for (const instructor of instructorData) {
            if (!instructorData[instructor]) delete instructorData[instructor];
        }

        return Object.keys(instructorData);
    }

    // Map player name to actual name
    async mapPlayerToName(playerName: string): Promise<string> {
        const nameData = await this.getData("PlayerNames");

        return nameData[playerName];
    }

    // Map actual name to player name
    async mapNameToPlayer(playerName: string): Promise<string> {
        const nameData = await this.getData("PlayerNames");

        for (const name in nameData) {
            if (nameData[name] === playerName) return name;
        }
    }

    // Get player location from DataStore
    async getPlayerLocation(playerName: string): Promise<playerLocation> {
        // Get player's actual name
        const mappedName = await this.mapPlayerToName(playerName);
        if (!mappedName) return;

        // Get player location
        const locationData = await this.getData("PlayerLocations");

        return locationData[mappedName];
    }

    // Save player location to DataStore
    async savePlayerLocation(player: Player) {
        // Get player's actual name
        const mappedName = await this.mapPlayerToName(player.name);
        if (!mappedName) return;

        // Save player location
        const locationData = await this.getData("PlayerLocations");

        locationData[mappedName] = <playerLocation>{
            dimension: player.dimension,
            position: player.position
        };

        await this.setData("PlayerLocations", locationData);
        await this.saveData();
    }

    // Delete player location from DataStore
    async deletePlayerLocation(playerName: string) {
        // Get player's actual name
        const mappedName = await this.mapPlayerToName(playerName);
        if (!mappedName) return;

        // Delete player location
        const locationData = await this.getData("PlayerLocations");

        delete locationData[mappedName];

        await this.setData("PlayerLocations", locationData);
        await this.saveData();
    }

    // Save tpa request to DataStore
    async saveTpaRequest(playerName: string, targetName: string, timeout: number) {
        const tpaData = await this.getData("TpaRequests");

        tpaData[playerName] = {
            target: targetName,
            timeout: timeout
        };

        // Callback to delete tpa request after timeout
        setTimeout(async () => {
            await this.cancelTpaRequest(playerName);
        }, timeout);

        await this.setData("TpaRequests", tpaData);
        await this.saveData();
    }

    // Delete tpa request from DataStore
    async cancelTpaRequest(playerName: string) {
        const tpaData = await this.getData("TpaRequests");

        delete tpaData[playerName];

        await this.setData("TpaRequests", tpaData);
        await this.saveData();
    }

    // Check if player has an active tpa request
    async hasTpaRequest(playerName: string): Promise<boolean> {
        const tpaData = await this.getData("TpaRequests");

        return tpaData[playerName] ? true : false;
    }

    // Set command access
    async setCommandAccess(enabled: boolean): Promise<void> {
        const commandAccessData = await this.getData("CommandAccess");

        commandAccessData.enabled = enabled;
    }

    // Get command access status
    async getCommandAccessStatus(): Promise<boolean> {
        const commandAccessData = await this.getData("CommandAccess");

        return commandAccessData.enabled;
    }
}

// SFIMCCamp class - Main plugin class
export class SFIMCCamp extends Plugin {
    // Properties
    private ds: SFIDataStore = new SFIDataStore();

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

    // Name command
    async nameCommand(server: BedrockServer, playerName: string, cmd: string[]) {
        // Check if command access is enabled
        if (await this.ds.getCommandAccessStatus() === false) return;

        if (cmd.length < 2) {
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Usage: !name <yourName>"}]}`);
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
    }

    // tpa command
    async tpaCommand(server: BedrockServer, playerName: string, cmd: string[]) {
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
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"You must set your name with "!name <yourName>" before using this command."}]}`);
            return;
        }

        // Send tpa request to target
        await server.sendCommand(`tellraw ${targetName} {"rawtext":[{"text":"${actualPlayerName} has requested to teleport to you. Type !tpaccept <playerName> to accept."}]}`);
        await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Sent tpa request to ${actualTargetName}."}]}`);

        // Save tpa request to DataStore
        await this.ds.saveTpaRequest(actualPlayerName, actualTargetName, 30000);
    }

    // tpaccept command
    async tpacceptCommand(server: BedrockServer, playerName: string, cmd: string[]) {
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
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"You must set your name with "!name <yourName>" before using this command."}]}`);
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
    async tpdenyCommand(server: BedrockServer, playerName: string, cmd: string[]) {
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
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"You must set your name with "!name <yourName>" before using this command."}]}`);
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
    async tpcancelCommand(server: BedrockServer, playerName: string, cmd: string[]) {
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
            await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"You must set your name with "!name <yourName>" before using this command."}]}`);
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

    // Handle PlayerMessage
    async handlePlayerMessage(event: PlayerMessageEvent) {
        const server: BedrockServer = this.mwss.getServer(event.server);
        const playerName: string = event.body.sender;
        const cmd = event.body.message.split(" ");

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
    async handlePlayerJoin(event: PlayerJoinEvent) {
        const playerName: string = event.body.player.name;
        const server: BedrockServer = this.mwss.getServer(event.server);

        // Set gamemode to adventure
        await server.sendCommand(`gamemode adventure ${playerName}`);

        // Send message to player
        await server.sendCommand(`tellraw ${playerName} {"rawtext":[{"text":"Welcome back! To set your name, type !name <yourName>"}]}`);
        
        // Set title
        await server.sendCommand(`title ${playerName} times 0 10000 0`);
        await server.sendCommand(`title ${playerName} title Please set your name using: !name <yourName>`);
    }

    // Handle PlayerLeave
    async handlePlayerLeave(event: PlayerLeaveEvent) {
        const player: Player = event.body.player;
        const playerName: string = player.name;

        // Save player location to DataStore
        await this.ds.savePlayerLocation(player);

        // Remove playerName from DataStore
        await this.ds.removePlayerName(playerName);
    }

    // Default route
    async defaultRoute(req: Request, res: Response, next: Function) {
        try {
            res.type("text/html")
                .status(200)
                .send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>Sci-Fi Minecraft Camp Administration</title>
                    <style>
                        body {
                            font-family: Arial, Helvetica, sans-serif;
                        }
                    </style>
                </head>
                <body>
                    <h1>Sci-Fi Minecraft Camp Administration</h1>
                    <p>Add player to the instructor list:</p>

                    <iframe name="dummyframe" id="dummyframe" style="display: none;"></iframe>

                    <form action="/instructors/add" method="post" target="dummyframe">
                        <input type="text" id="playerName" name="playerName" placeholder="Player Name"><br>
                        <input type="submit" value="Submit">
                    </form>
                    <p>Remove player from the instructor list:</p>
                    <form action="/instructors/remove" method="post" target="dummyframe">
                        <input type="text" id="playerName" name="playerName" placeholder="Player Name"><br>
                        <input type="submit" value="Submit">
                    </form>
                </body>
                </html>
                `);

        // Serverside error response
        } catch (err) {
            console.log(err);
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Add instructor route
    async addInstructorRoute(req: Request, res: Response, next: Function) {
        try {
            const playerName: string = req.body.playerName;

            // Add playerName to DataStore
            await this.ds.addInstructor(playerName);

            res.type("application/json")
                .status(200)
                .json({ "message": "Player added to instructor list", "playerName": playerName });

        // Serverside error response
        } catch (err) {
            console.log(err);
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Remove instructor route
    async removeInstructorRoute(req: Request, res: Response, next: Function) {
        try {
            const playerName: string = req.body.playerName;

            // Check if playerName is an instructor
            if (this.ds.isInstructor(playerName)) {
                // Remove playerName from DataStore
                await this.ds.removeInstructor(playerName);

                res.type("application/json")
                    .status(200)
                    .json({ "message": "Player removed from instructor list", "playerName": playerName });
            } else {
                res.type("application/json")
                    .status(200)
                    .json({ "message": "Player is not an instructor", "playerName": playerName });
            }

        // Serverside error response
        } catch (err) {
            console.log(err);
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Start
    async start(mwss: MinecraftWebSocket) {
        this.mwss = mwss;
        this.mrest = mwss.getRestServer();

        // Start plugin REST server
        const port = PLUGIN_REST_PORT;
        const router = Router();
        const app = express();

        // Configure Express
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use("", router);

        // Default route
        router.get('/', this.defaultRoute.bind(this));

        // Add instructor route
        router.post('/instructors/add', this.addInstructorRoute.bind(this));

        // Remove instructor route
        router.post('/instructors/remove', this.removeInstructorRoute.bind(this));

        // Start webserver
        app.listen(port, () => {
            console.log(`Sci-Fi Minecraft Camp plugin REST server running on port ${port}`);
        });

        console.log("Sci-Fi Minecraft Camp plugin started!");
    }
}
