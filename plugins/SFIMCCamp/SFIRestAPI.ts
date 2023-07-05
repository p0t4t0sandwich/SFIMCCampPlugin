// SFIRestAPI class -- REST API for SFIMCCamp plugin
// Author: p0t4t0sandwich

import express, { Express, Request, Response, Router } from 'express';
import multer from 'multer';


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


        // Add instructor route
        this.router.post('/instructors/add', this.addInstructorRoute.bind(this));

        // Remove instructor route
        this.router.post('/instructors/remove', this.removeInstructorRoute.bind(this));

        // Add instructors from file route
        this.router.post('/instructors/addFromFile', multer().single("instructorsFile"), this.addInstructorsFromFileRoute.bind(this));


        // Add camper route
        this.router.post('/campers/add', this.addCamperRoute.bind(this));

        // Remove camper route
        this.router.post('/campers/remove', this.removeCamperRoute.bind(this));

        // Add campers from file route
        this.router.post('/campers/addFromFile', multer().single("campersFile"), this.addCampersFromFileRoute.bind(this));

        // Rename camper route
        this.router.post('/campers/rename', this.renameCamperRoute.bind(this));


        // Set chest location route
        this.router.post('/setChestLocation', this.setChestLocationRoute.bind(this.sfiPlugin));


        // Pause servers route
        this.router.post('/servers/pause', this.pauseServersRoute.bind(this));
        
        // Unpause servers route
        this.router.post('/servers/unpause', this.unpauseServersRoute.bind(this));

        // Five minute warning route
        this.router.post('/fiveMinuteWarning', this.fiveMinuteWarningRoute.bind(this));


        // Kill process route
        this.router.post('/killProcess', (req: Request, res: Response, next: Function) => {
            res.type("application/json")
                .status(200)
                .json({ "message": "Process killed" });
            process.exit(0);
        });

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

                <script>
                    function pauseServers() {
                        fetch("/servers/pause", {
                            method: "POST"
                        });
                    }

                    function unpauseServers() {
                        fetch("/servers/unpause", {
                            method: "POST"
                        });
                    }

                    function fiveMinuteWarning() {
                        fetch("/fiveMinuteWarning", {
                            method: "POST"
                        });
                    }

                    function killProcess() {
                        fetch("/killProcess", {
                            method: "POST"
                        });
                    }
                </script>

                <body>
                    <h1>Sci-Fi Minecraft Camp Administration</h1>

                    <p>Pause buttons:</p>
                    <button onclick="pauseServers()">Pause Servers</button>
                    <button onclick="unpauseServers()">Unpause Servers</button>

                    <p>Five minute warning:</p>
                    <button onclick="fiveMinuteWarning()">Five Minute Warning</button>

                    <iframe name="dummyframe" id="dummyframe" style="display: none;"></iframe>

                    <p>Add player to the instructor list:</p>
                    <form action="/instructors/add" method="post" target="dummyframe">
                        <input type="text" id="playerName" name="playerName" placeholder="Player Name"><br>
                        <input type="submit" value="Submit">
                    </form>

                    <p>Remove player from the instructor list:</p>
                    <form action="/instructors/remove" method="post" target="dummyframe">
                        <input type="text" id="playerName" name="playerName" placeholder="Player Name"><br>
                        <input type="submit" value="Submit">
                    </form>

                    <p>Add instructors from file:</p>
                    <form action="/instructors/addFromFile" method="post" enctype="multipart/form-data" target="dummyframe">
                        <input type="file" id="instructorsFile" name="instructorsFile"><br>
                        <input type="submit" value="Submit">
                    </form>

                    <p>Add player to the camper list:</p>
                    <form action="/campers/add" method="post" target="dummyframe">
                        <input type="text" id="playerName" name="playerName" placeholder="Player Name"><br>
                        <input type="submit" value="Submit">
                    </form>

                    <p>Remove player from the camper list:</p>
                    <form action="/campers/remove" method="post" target="dummyframe">
                        <input type="text" id="playerName" name="playerName" placeholder="Player Name"><br>
                        <input type="submit" value="Submit">
                    </form>

                    <p>Rename player in the camper list:</p>
                    <form action="/campers/rename" method="post" target="dummyframe">
                        <input type="text" id="oldPlayerName" name="oldPlayerName" placeholder="Old Player Name"><br>
                        <input type="text" id="newPlayerName" name="newPlayerName" placeholder="New Player Name"><br>
                        <input type="submit" value="Submit">
                    </form>

                    <p>Set chest location:</p>
                    <form action="/setChestLocation" method="post" target="dummyframe">
                        <input type="text" id="playerName" name="playerName" placeholder="Player Name"><br>
                        <input type="text" id="x" name="x" placeholder="X"><br>
                        <input type="text" id="y" name="y" placeholder="Y"><br>
                        <input type="text" id="z" name="z" placeholder="Z"><br>
                        <input type="submit" value="Submit">
                    </form>

                    <p>Add campers from file:</p>
                    <form action="/campers/addFromFile" method="post" enctype="multipart/form-data" target="dummyframe">
                        <input type="file" id="campersFile" name="campersFile"><br>
                        <input type="submit" value="Submit">
                    </form>

                    <p>Kill process:</p>
                    <button onclick="killProcess()">Kill Process</button>
                </body>
                </html>
                `);

        // Serverside error response
        } catch (err) {
            logger(err, "SFIRestAPI Error");
            res.type("application/json")
                .status(500)
                .json({ "message": "Internal Server Error", "error": err });
        }
    }

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
}
