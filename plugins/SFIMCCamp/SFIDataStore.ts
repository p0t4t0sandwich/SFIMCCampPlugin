// SFIDataStore class - DataStore for SFIMCCamp
// Author: p0t4t0sandwich

import { DataStore } from "../../minecraft-be-websocket-api/lib/DataStore.js";
import { Player } from "../../minecraft-be-websocket-api/lib/events/Events.js";


// Interfaces
interface playerLocation {
    dimension: number;
    position: {
        x: number;
        y: number;
        z: number;
    };
}


export class SFIDataStore extends DataStore {
    // Constructor
    constructor() {
        super("../plugins", "SFIMCCamp");
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