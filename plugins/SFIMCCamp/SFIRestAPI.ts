// SFIRestAPI class -- REST API for SFIMCCamp plugin
// Author: p0t4t0sandwich

import express, { Express, Request, Response, Router } from 'express';
import multer from 'multer';
import fs from 'fs';


import { SFIDataStore } from './SFIDataStore.js';
import { SFIMCCamp } from './SFIMCCamp.js';
import { logger, sendDiscordWebhook } from '../../minecraft-be-websocket-api/lib/utils.js';

export class SFIRestAPI {
    // Properties
    private ip: string = "";
    private port: number = <number><unknown>process.env.PLUGIN_REST_PORT || 4007;
    private router: Router = Router();
    private app: Express = express();
    private sfiPlugin: SFIMCCamp;
    private ds: SFIDataStore;

    // Constructor
    constructor(sfiPlugin: SFIMCCamp, ds: SFIDataStore) {
        // Set IP
        this.ip = sfiPlugin.mwss.getIpAddress();

        // Set plugin
        this.sfiPlugin = sfiPlugin;

        // Set DataStore
        this.ds = ds;

        // Configure Express
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use("", this.router);

        // Default route
        this.router.get('/', this.defaultRoute.bind(this));


        // Server Routes

        // Pause servers route
        this.router.post('/servers/pause', this.pauseServersRoute.bind(this));
        
        // Unpause servers route
        this.router.post('/servers/unpause', this.unpauseServersRoute.bind(this));

        // Five minute warning route
        this.router.post('/servers/fiveMinuteWarning', this.fiveMinuteWarningRoute.bind(this));


        // Instructor Routes

        // Add instructor route
        this.router.post('/instructors/add', this.addInstructorRoute.bind(this));

        // Remove instructor route
        this.router.post('/instructors/remove', this.removeInstructorRoute.bind(this));

        // Add instructors from file route
        this.router.post('/instructors/addFromFile', multer().single("instructorsFile"), this.addInstructorsFromFileRoute.bind(this));

        // Remove all instructors route
        this.router.post('/instructors/removeAll', this.removeAllInstructorsRoute.bind(this));


        // Camper Routes

        // Add camper route
        this.router.post('/campers/add', this.addCamperRoute.bind(this));

        // Remove camper route
        this.router.post('/campers/remove', this.removeCamperRoute.bind(this));

        // Rename camper route
        this.router.post('/campers/rename', this.renameCamperRoute.bind(this));

        // Add campers from file route
        this.router.post('/campers/addFromFile', multer().single("campersFile"), this.addCampersFromFileRoute.bind(this));

        // Remove all campers route
        this.router.post('/campers/removeAll', this.removeAllCampersRoute.bind(this));


        // Chest Routes

        // Set chest location route
        this.router.post('/chests/set', this.setChestLocationRoute.bind(this));

        // Set chest locations route
        this.router.post('/chests/addFromFile', multer().single("chestLocationFile"), this.setChestLocationsRoute.bind(this));

        // Clear chest locations route
        this.router.post('/chests/clear', this.clearChestLocationsRoute.bind(this));


        // System Routes

        // Kill process route
        this.router.post('/system/killProcess', this.killProcessRoute.bind(this));

        // Clear All Player Data route
        this.router.post('/system/clearAllPlayerData', this.clearAllPlayerDataRoute.bind(this));

        // Start webserver
        this.app.listen(this.port, () => {
            logger(`Sci-Fi Minecraft Camp Administration webpage Running at  http://${this.ip}:${this.port}`, "SFIRestAPI");
            sendDiscordWebhook('Sci-Fi MC Camp Admin webpage', `Running at http://${this.ip}:${this.port}`);
        });
    }

    // Default route
    async defaultRoute(req: Request, res: Response, next: Function) {
        try {
            res.type("text/html")
                .status(200)
                .send(await fs.promises.readFile("./plugins/SFIMCCamp/index.html", "utf8"));

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }


    // Server Routes

    // Pause servers route
    async pauseServersRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            // Pause servers
            await this.sfiPlugin.pauseAllServers();

            res.type("application/json")
                .status(200)
                .json({ "message": "Servers paused" });

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Unpause servers route
    async unpauseServersRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            // Unpause servers
            await this.sfiPlugin.unpauseAllServers();

            res.type("application/json")
                .status(200)
                .json({ "message": "Servers unpaused" });

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Five minute warning route
    async fiveMinuteWarningRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            // Send five minute warning
            await this.sfiPlugin.fiveMinuteWarning();

            res.type("application/json")
                .status(200)
                .json({ "message": "Five minute warning sent" });

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }


    // Instructor Routes

    // Add instructor route
    async addInstructorRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            const playerName: string = req.body.playerName;

            // Add playerName to DataStore
            await this.ds.addInstructor(playerName);

            res.type("application/json")
                .status(200)
                .json({ "message": "Player added to instructor list", "playerName": playerName });

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Remove instructor route
    async removeInstructorRoute(req: Request, res: Response, next: Function): Promise<void> {
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
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Add instructors from file route
    async addInstructorsFromFileRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            // Convert instructorsFile to a buffer, then to a string
            const instructorsFileBuffer: Buffer = req.file.buffer;
            const instructorsFileString: string = instructorsFileBuffer.toString();

            // Split instructorsFileString into an array of lines
            const instructorsFileLines: string[] = instructorsFileString.split("\n");

            // Add each line to the DataStore
            for (let i = 0; i < instructorsFileLines.length; i++) {
                const playerName: string = instructorsFileLines[i].trim();
                if (playerName.length > 0) {
                    const nameParts: string[] = playerName.split(" ");
                    const parsedName = nameParts[1] + "_" + nameParts[0][0].toUpperCase()
                    await this.ds.addInstructor(parsedName);
                }
            }

            res.type("application/json")
                .status(200)
                .json({ "message": "Instructors added from file", "filePath": req.file.path });

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Remove all instructors route
    async removeAllInstructorsRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            // Remove all instructors from DataStore
            await this.ds.removeAllInstructors();
            
            res.type("application/json")
                .status(200)
                .json({ "message": "All instructors removed" });

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
        }
    }


    // Camper Routes

    // Add camper route
    async addCamperRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            const playerName: string = req.body.playerName;

            // Add playerName to DataStore
            await this.ds.addCamper(playerName);

            res.type("application/json")
                .status(200)
                .json({ "message": "Player added to camper list", "playerName": playerName });

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Remove camper route
    async removeCamperRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            const playerName: string = req.body.playerName;

            // Check if playerName is a camper
            if (this.ds.isCamper(playerName)) {
                // Remove playerName from DataStore
                await this.ds.removeCamper(playerName);

                res.type("application/json")
                    .status(200)
                    .json({ "message": "Player removed from camper list", "playerName": playerName });
            } else {
                res.type("application/json")
                    .status(200)
                    .json({ "message": "Player is not a camper", "playerName": playerName });
            }

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Rename camper route
    async renameCamperRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            const oldPlayerName: string = req.body.oldPlayerName;
            const newPlayerName: string = req.body.newPlayerName;

            // Check if oldPlayerName is a camper
            if (this.ds.isCamper(oldPlayerName)) {
                // Rename oldPlayerName to newPlayerName in DataStore
                await this.ds.renameCamper(oldPlayerName, newPlayerName);

                res.type("application/json")
                    .status(200)
                    .json({ "message": "Player renamed in camper list", "oldPlayerName": oldPlayerName, "newPlayerName": newPlayerName });
            } else {
                res.type("application/json")
                    .status(200)
                    .json({ "message": "Player is not a camper", "playerName": oldPlayerName });
            }

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Add campers from file route
    async addCampersFromFileRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            // Convert campersFile to a buffer, then to a string
            const campersFileBuffer: Buffer = req.file.buffer;
            const campersFileString: string = campersFileBuffer.toString();

            // Split campersFileString into an array of lines
            const campersFileLines: string[] = campersFileString.split("\n");

            // Add each line to the DataStore
            for (let i = 0; i < campersFileLines.length; i++) {
                const playerName: string = campersFileLines[i].trim();
                if (playerName.length > 0) {
                    await this.ds.addCamper(playerName);
                }
            }

            res.type("application/json")
                .status(200)
                .json({ "message": "Campers added from file", "filePath": req.file.path });

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Remove all campers route
    async removeAllCampersRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            // Remove all campers from DataStore
            await this.ds.removeAllCampers();

            res.type("application/json")
                .status(200)
                .json({ "message": "All campers removed" });

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
        }
    }


    // Set chest location route
    async setChestLocationRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            // Set chest location
            await this.ds.setChestLocation(req.body.playerName, { x: req.body.x, y: req.body.y, z: req.body.z });

            res.type("application/json")
                .status(200)
                .json({ "message": "Chest location set", "playerName": req.body.playerName, "x": req.body.x, "y": req.body.y, "z": req.body.z });

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

    // Set chest locations route
    async setChestLocationsRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            // Convert chestLocationFile to a buffer, then to a string
            const chestLocationFileBuffer: Buffer = req.file.buffer;
            const chestLocationFileString: string = chestLocationFileBuffer.toString();

            // Split chestLocationFileString into an array of lines
            const chestLocationFileLines: string[] = chestLocationFileString.split("\n");

            // Add each line to the DataStore
            for (const line of chestLocationFileLines) {
                const inputString: string[] = line.split(" ");
                const playerName: string = inputString[0];
                const x: number = parseInt(inputString[1]);
                const y: number = parseInt(inputString[2]);
                const z: number = parseInt(inputString[3]);
                await this.ds.setChestLocation(playerName, { x: x, y: y, z: z });
            }
        } catch (err) {
            logger(err, "SFIRestAPI Error");
        }
    }

    // Clear chest locations route
    async clearChestLocationsRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            this.ds.removeAllChestLocations();
        } catch (err) {
            logger(err, "SFIRestAPI Error");
        }
    }

    // System Routes

    // Kill process route
    async killProcessRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            res.type("application/json")
                .status(200)
                .json({ "message": "Process killed" });

            process.exit(0);

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
        }
    }

    // Clear All Player Data route
    async clearAllPlayerDataRoute(req: Request, res: Response, next: Function): Promise<void> {
        try {
            this.ds.clearAllPlayerData();
            this.ds.removeAllPlayerNameQueue();

            res.type("application/json")
                .status(200)
                .json({ "message": "All player data cleared" });
        } catch (err) {
            logger(err, "SFIRestAPI Error");
        }
    }
}
