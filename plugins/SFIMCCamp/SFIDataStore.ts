// SFIDataStore class - DataStore for SFIMCCamp
// Author: p0t4t0sandwich

import { DataStore } from "../../minecraft-be-websocket-api/lib/DataStore.js";
import { Player } from "../../minecraft-be-websocket-api/lib/game/Player.js";


// Interfaces
interface positionData {
    x: number;
    y: number;
    z: number;
}

interface locationData {
    dimension: number;
    position: positionData;
}

interface nameData {
    realName: string;
    playerName: string;
}

export class SFIPlayerData {
    // Properties
    public id: number;
    public realName: string;
    public playerName: string;
    public logoutLocation: locationData;
    public isInstructor: boolean;
    public isNamed: boolean;
    public commandAccess: boolean;
    public outgoingTpaRequest: string;
    public incomingTpaRequest: string;

    // Constructor
    constructor(playerData: SFIPlayerData) {
        this.id = playerData.id;
        this.realName = playerData.realName;
        this.playerName = playerData.playerName;
        this.logoutLocation = playerData.logoutLocation;
        this.isInstructor = playerData.isInstructor;
        this.isNamed = playerData.isNamed;
        this.commandAccess = playerData.commandAccess;
        this.outgoingTpaRequest = playerData.outgoingTpaRequest;
        this.incomingTpaRequest = playerData.incomingTpaRequest;
    }

    // Methods
    toJSON(): object {
        return {
            id: this.id,
            realName: this.realName,
            playerName: this.playerName,
            logoutLocation: this.logoutLocation,
            isInstructor: this.isInstructor,
            isNamed: this.isNamed,
            commandAccess: this.commandAccess,
            outgoingTpaRequest: this.outgoingTpaRequest,
            incomingTpaRequest: this.incomingTpaRequest
        };
    }

    // From JSON
    static fromJSON(json: object): SFIPlayerData {
        return new SFIPlayerData(<SFIPlayerData>json);
    }

    // New player
    static newPlayer(player: Player, isInstructor: boolean): SFIPlayerData {
        return new SFIPlayerData(<SFIPlayerData>{
            id: player.id,
            realName: "",
            playerName: player.name,
            logoutLocation: <locationData>{
                dimension: player.dimension,
                position: <positionData>{
                    x: player.position.x,
                    y: player.position.y,
                    z: player.position.z
                }
            },
            isInstructor: isInstructor,
            isNamed: false,
            commandAccess: true,
            outgoingTpaRequest: "",
            incomingTpaRequest: ""
        });
    }

    // Logout to JSON
    logoutToJSON(player: Player): object {
        return {
            id: player.id,
            realName: this.realName,
            playerName: "",
            logoutLocation: {
                dimension: player.dimension,
                position: {
                    x: player.position.x,
                    y: player.position.y,
                    z: player.position.z
                }
            },
            isInstructor: false,
            isNamed: false,
            commandAccess: false,
            outgoingTpaRequest: "",
            incomingTpaRequest: "",
            outgoingTpHereRequest: "",
            incomingTpHereRequest: ""
        };
    }

    // Login from JSON
    static loginFromJSON(json: object, player: Player, isInstructor: boolean): SFIPlayerData {
        if (json["id"] == player.id) {
            return new SFIPlayerData(<SFIPlayerData>{
                id: player.id,
                realName: json["realName"],
                playerName: player.name,
                logoutLocation: <locationData>json["logoutLocation"],
                isInstructor: isInstructor,
                isNamed: false,
                commandAccess: false,
                outgoingTpaRequest: "",
                incomingTpaRequest: ""
            });
        }
    }

    // Set real name
    setRealName(realName: string): void {
        this.realName = realName;
    }

    // Set named
    setNamed(isNamed: boolean): void {
        this.isNamed = isNamed;
    }

    // Set outgoing tpa request
    setOutgoingTpaRequest(outgoingTpaRequest: string, timeout: number): void {
        this.outgoingTpaRequest = outgoingTpaRequest;

        // Set expiration timer
        setTimeout(() => {
            this.outgoingTpaRequest = "";
        }, timeout);
    }

    // Has active outgoing tpa request
    hasActiveOutgoingTpaRequest(): boolean {
        if (!this.outgoingTpaRequest) this.outgoingTpaRequest = "";
        return this.outgoingTpaRequest != "";
    }

    // Set incoming tpa request
    setIncomingTpaRequest(incomingTpaRequest: string, timeout: number): void {
        this.incomingTpaRequest = incomingTpaRequest;

        // Set expiration timer
        setTimeout(() => {
            this.incomingTpaRequest = "";
        }, timeout);
    }

    // Has active incoming tpa request
    hasActiveIncomingTpaRequest(): boolean {
        if (!this.incomingTpaRequest) this.incomingTpaRequest = "";
        return this.incomingTpaRequest != "";
    }
}

export class SFIDataStore extends DataStore {
    // Constructor
    constructor() {
        super("../plugins/SFIMCCamp", "SFIDataStore");
    }

    // Methods

    // ----------------------------- Player Data -----------------------------

    // Get player data from DataStore
    async getPlayerData(playerId: number): Promise<SFIPlayerData> {
        const playerData = await this.getData("PlayerData");
        const stringId = playerId.toString();

        if (!playerData[stringId]) return undefined;

        return SFIPlayerData.fromJSON(playerData[stringId]);
    }

    // Set player data in DataStore
    async setPlayerData(playerId: number, playerData: SFIPlayerData): Promise<void> {
        const data = await this.getData("PlayerData");
        const stringId = playerId.toString();
        data[stringId] = playerData;
        await this.setData("PlayerData", data);
        await this.saveData();
    }

    // Remove player data from DataStore
    async removePlayerData(playerId: number): Promise<void> {
        const data = await this.getData("PlayerData");
        const stringId = playerId.toString();
        if (data[stringId]) delete data[stringId];
        await this.setData("PlayerData", data);
        await this.saveData();
    }

    // Remove all player data from DataStore
    async clearAllPlayerData(): Promise<void> {
        const data = await this.getData("PlayerData");
        for (const playerId in data) {
            if (data[playerId]) delete data[playerId];
        }
        await this.setData("PlayerData", data);
        await this.saveData();
    }

    // ----------------------------- Chest Locations -----------------------------

    // Get chest location from DataStore
    async getChestLocation(realName: string): Promise<positionData> {
        const chestData = await this.getData("ChestLocations");
        return chestData[realName];
    }

    // Get all chest locations from DataStore
    async getAllChestLocations(): Promise<any> {
        const chestData = await this.getData("ChestLocations");
        return chestData;
    }

    // Set chest location in DataStore
    async setChestLocation(realName: string, chestLocation: positionData): Promise<void> {
        const data = await this.getData("ChestLocations");
        data[realName] = chestLocation;
        await this.setData("ChestLocations", data);
        await this.saveData();
    }

    // Remove chest location from DataStore
    async removeChestLocation(realName: string): Promise<void> {
        const data = await this.getData("ChestLocations");
        if (data[realName]) delete data[realName];
        await this.setData("ChestLocations", data);
        await this.saveData();
    }

    // Remove all chest locations from DataStore
    async removeAllChestLocations(): Promise<void> {
        const data = await this.getData("ChestLocations");
        for (const realName in data) {
            if (data[realName]) delete data[realName];
        }
        await this.setData("ChestLocations", data);
        await this.saveData();
    }

    // ----------------------------- Player Name Queue -----------------------------

    // Get player name queue from DataStore
    async getPlayerNameQueue(): Promise<nameData[]> {
        const nameData = await this.getData("PlayerNameQueue");
        return nameData;
    }

    // Get next player from queue
    async getNextPlayerNameQueue(): Promise<nameData> {
        const nameData = await this.getData("PlayerNameQueue");
        const keys = Object.keys(nameData);
        return nameData[keys[0]];
    }

    // Add player to queue
    async addPlayerNameQueue(playerName: string, realName: string): Promise<void> {
        const nameData = await this.getData("PlayerNameQueue");
        nameData[realName] = <nameData>{ playerName, realName };
        await this.setData("PlayerNameQueue", nameData);
        await this.saveData();
    }

    // Remove player from queue
    async removePlayerNameQueue(playerName: string): Promise<void> {
        const nameData = await this.getData("PlayerNameQueue");

        // Check if player is in queue
        if (nameData[playerName]) delete nameData[playerName];

        await this.setData("PlayerNameQueue", nameData);
        await this.saveData();
    }

    // Remove all players from queue
    async removeAllPlayerNameQueue(): Promise<void> {
        const nameData = await this.getData("PlayerNameQueue");
        for (const playerName in nameData) {
            if (nameData[playerName]) delete nameData[playerName];
        }
        await this.setData("PlayerNameQueue", nameData);
        await this.saveData();
    }

    // ----------------------------- Instructors -----------------------------

    // Get instructor data from DataStore
    async getInstructorData(): Promise<string[]> {
        const instructorData = await this.getData("Instructors");
        return instructorData;
    }

    // Add instructor to DataStore
    async addInstructor(playerName: string): Promise<void> {
        const instructorData = await this.getData("Instructors");

        // Get object keys
        const keys = Object.keys(instructorData);

        // Check if instructor is already in DataStore
        if (!keys.includes(playerName)) {
            instructorData[playerName] = true;
        }

        await this.setData("Instructors", instructorData);
        await this.saveData();
    }

    // Remove instructor from DataStore
    async removeInstructor(playerName: string): Promise<void> {
        const instructorData = await this.getData("Instructors");

        // Get object keys
        const keys = Object.keys(instructorData);

        // Check if instructor is in DataStore
        if (keys.includes(playerName)) {
            delete instructorData[playerName];
        }

        await this.setData("Instructors", instructorData);
        await this.saveData();
    }

    // Get all instructors
    async getInstructors(): Promise<string[]> {
        const instructorData = await this.getData("Instructors");
        return Object.keys(instructorData);
    }

    // Check if player is an instructor
    async isInstructor(playerName: string): Promise<boolean> {
        const instructors: string[] = await this.getInstructors();
        return instructors.includes(playerName);
    }

    // Remove all instructors from DataStore
    async removeAllInstructors(): Promise<void> {
        const instructorData = await this.getData("Instructors");
        for (const playerName in instructorData) {
            if (instructorData[playerName]) delete instructorData[playerName];
        }
        await this.setData("Instructors", instructorData);
        await this.saveData();
    }

    // -------------------------------- Campers --------------------------------

    // Add camper to DataStore
    async addCamper(playerName: string): Promise<void> {
        const camperData = await this.getData("Campers");

        camperData[playerName] = true;
        await this.setData("Campers", camperData);
        await this.saveData();
    }

    // Remove camper from DataStore
    async removeCamper(playerName: string): Promise<void> {
        const camperData = await this.getData("Campers");

        if (camperData[playerName]) delete camperData[playerName];
        await this.setData("Campers", camperData);
        await this.saveData();
    }

    // Get all campers
    async getCampers(): Promise<string[]> {
        const camperData = await this.getData("Campers");
        return Object.keys(camperData);
    }

    // Check if player is a camper
    async isCamper(playerName: string): Promise<boolean> {
        const campers: string[] = await this.getCampers();
        return campers.includes(playerName);
    }

    // Rename camper
    async renameCamper(oldName: string, newName: string): Promise<void> {
        const camperData = await this.getData("Campers");

        // Check if camper is in DataStore
        if (camperData[oldName]) {
            camperData[newName] = camperData[oldName];
            delete camperData[oldName];
        }

        // Update camper data in ChestLocations
        const chestData = await this.getData("ChestLocations");
        if (chestData[oldName]) {
            chestData[newName] = chestData[oldName];
            delete chestData[oldName];
        }

        await this.setData("Campers", camperData);
        await this.saveData();
    }

    // Remove all campers from DataStore
    async removeAllCampers(): Promise<void> {
        const camperData = await this.getData("Campers");
        for (const playerName in camperData) {
            if (camperData[playerName]) delete camperData[playerName];
        }
        await this.setData("Campers", camperData);
        await this.saveData();
    }

    // --------------------------------- Permissions ---------------------------------

    // Load permissions from DataStore
    async loadPermissions(): Promise<any> {
        const permissionData = await this.getData("Permissions");
        return permissionData;
    }

    // Add permission to DataStore
    async savePermissions(permissionData: any): Promise<void> {
        await this.setData("Permissions", JSON.stringify(permissionData));
        await this.saveData();
    }
}
