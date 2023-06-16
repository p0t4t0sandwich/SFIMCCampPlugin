# SFI MC Camp Plugin

Plugin for managing the Sci-Fi Minecraft Camp using the Bedrock websocket API

## Installation

1. Install Node.js on the raspberry pi -- `sudo apt-get update && sudo apt-get install -y nodejs npm`
2. Install git on the raspberry pi -- `sudo apt-get update && sudo apt-get install -y git`
3. Run `git clone https://github.com/p0t4t0sandwich/SFIMCCampPlugin.git` on the raspberry pi
4. Run `cd SFIMCCampPlugin`
5. Run `npm ci`
6. Run `npm run build`
7. Run `node ./`

## Usage

1. Boot up Minecraft Education Edition on your computer
2. Run `node ./` in the SFIMCCampPlugin directory
3. Connect to the WebSocket server using the ws:// URL in the console using the in-game command: `/connect ws://addressinfo:port`
4. Navigate to the "Sci-Fi Minecraft Camp Administration" webpage using the URL in the console

## Commands

| Command | Usage | Description | Permission |
| ------- | ----- | ----------- | ---------- |
| `!name` | `!name campersName` | Allows a camper to add themselves to the naming queue | camper |
| `!tpa` / `!tpask` | `!tpa playerName` | User sends a request to teleport to the specified player | camper |
| `!tpaccept` | `!tpaccept playerName` | User accepts teleport request from other player | camper |
| `!tpdeny` | `!tpdeny playerName` | User denies teleport request from other player | camper |
| `!tpcancel` | `!tpcancel playerName` | User cancels an outgoing teleport request | camper |
| `!tpahere` | `!tpahere playerName` | User sends a request to teleport the specified player to them | camper |
| `!gamemode` | `!gamemode survival/creative` | Sets the gamemode of the camper | camper |
| `!gmc` | `!gmc` | Sets the gamemode of the camper to creative | camper |
| `!gms` | `!gms` | Sets the gamemode of the camper to survival | camper |
| `!n` | `!n`/ `!n campersName` | Gives the camper's nametag and teleports user to the camper | instructor |
| `!setnamechest` | `!setnamechest campersName x y z` | Sets the location of the chest with the camper's nametag (to be teleported to an instructor later with `!n`) | instructor |
| `!commandaccess` | `!commandaccess true/false` | Enables/disables the camper commands | instructor |
| `!allcommandaccess` | `!allcommandaccess true/false` | Enables/disables all camper commands | instructor |
| `!nametitle` | `!nametitle MinecraftPlayerName` | Places the camper in adventure mode and instructs them to run the !name command. (used when the login system fails) | instructor |

## Setting Up the Camper Naming System

Due to the arbitrary limitations put in place by Microsoft, this is the most streightforward and efficient way we've figured out how to name campers.

### Initial setup

#### Adding camper names to the system

Before a camp starts, you'll need to get a list of first names from the Camp Director/Head Instructor. Next you'll upload this list using the Camp Administration webpage (format required is a `.txt` file with a name on each line).

Edge cases: If two campers share the same first name, append an underscore and their last initial before uploading the list.

Example: we have a camper `Carl Bananna` and another, `Carl Sandwich`. In the list you'd add these campers as `Carl_B` and `Carl_S`.

In the case of a hyphonated last name, ex: `Carl Sandwich-Bananna`, you'd list them as `Carl_SB`.

#### Setting up the nametag chest

Next you'll need to set up a nametag chest for each camper. This is done by placing a chest in the world, placing a renamed name tag (with the camper's name) in the chest, and running the command `!setnamechest campersName x y z` in the chat. This will save the location of the chest to the server.

### During the camp

When a camper joins the server, they'll be prompted to name themselves. They'll do this by typing `!name campersName` in the chat. This will add them to the naming queue.

When an instructor is ready to name a camper, they'll type `!n` in the chat. This will give them the camper's nametag and teleport them to the camper. The instructor will then rename the camper and teleport them back to the spawn.

If for whatever reason this fails, the instructor can run `!n campersName` to force-repeat the process.
