Create a web server with express in typescript that servers images in different folders.
Create the server in a folder called server. And use good variable names that make sense (except for for loopes just use singular characters). And also create a good folder structure for the code in src

One folder called settings contains different folders named:
- raw
- shopProductImage
- (May also contain other directories)#

(The image folder has the same structure but it only contains images)

In these folders are json files with UUIDs as names and in these files are the following keys:
- image: UUID[] (same as below with raw image)
- settings: the settings with which it was created (important)
- 

And then there is a job folder with json files with uuids as names and these contain:
- image settings: UUID
- raw image: UUID[]
- (and all the other folders each have a uuid file in json with the info and get referenced with the uuid from this job json)

the server should allow for editing these files creating them deleting them.

And for getting them. there are for each folder is an endpoint where you can get either one by uuid or get all of them

The server should discover folders dynamically at startup and expose CRUD endpoints for all folders without requiring code changes.

When deleting a job it should delete all the other files it references

Use:
- Express
- TypeScript
- ts-node-dev for development
- strict TypeScript mode
- ES modules

Types:
    Define TypeScript interfaces for:
    - Job
    - SettingEntry
    - ImageReference
    - API error responses

Avoid using `any`.


404 -> UUID not found
400 -> invalid UUID or malformed JSON
409 -> referenced resources do not exist
500 -> unexpected server error

Extra routes:
    GET /api/jobs?rawImage=...
    GET /api/settings/raw?setting=value

(getting / Updating / Editing endpoints):
    GET    /api/:folder
    GET    /api/:folder/:uuid

    POST   /api/:folder
    PUT    /api/:folder/:uuid
    DELETE /api/:folder/:uuid

where :folder is:
    jobs
    raw
    shopProductImage
    <any discovered folder>

Folder structure:
    data/
    ├── settings/
    │   ├── raw/
    │   │   ├── <uuid>.json
    │   │   └── ...
    │   ├── shopProductImage/
    │   │   └── <uuid>.json
    │   └── ...
    ├── images/
    │   ├── raw/
    │   │   ├── <uuid>.<ext>
    │   │   └── ...
    │   ├── shopProductImage/
    │   │   └── ...
    │   └── ...
    └── jobs/
        ├── <uuid>.json
        └── ...


Make it easely extendible and make a custom plugin loader that loads all the folders in plugins and the folders contain the code that has functions that get the info from the request and the return a structure that gets returned as the response and you should also create the plugins to serve each folder (aka each folder in the settings / images / and all new discovered folders have a plugin that makes the response for each folder and each endpoint).
The plugins folder contains the plugins and the plugins are in folders that are called like the plugin and in there are index.ts files that are the entrie and export the Plugin class

Plugins may transform or enrich the response returned by the default filesystem CRUD implementation. If a plugin exists for a folder, its handler should be invoked before the response is sent. If no plugin exists, the default CRUD behavior should be used.

Plugins also may create thair own routes.
Plugins also decide how the image is saved and loaded and what format is used (for the raw images they are all jpeg files and for the product images they are also jpeg files)

Plugin class:
import { Express, Request, Response, NextFunction } from "express";

export interface ProcessPlugin {
    folder: string;

    getAll?(req: Request): Promise<unknown>;
    getOne?(req: Request, uuid: string): Promise<unknown>;

    create?(req: Request, body: unknown): Promise<unknown>;
    update?(req: Request, uuid: string, body: unknown): Promise<unknown>;

    delete?(req: Request, uuid: string): Promise<void>;

    registerRoutes?(app: Express): void | Promise<void>;
}

The server should dynamically import all plugins found in the /plugins directory at startup. Each plugin exports a default FolderPlugin implementation.


Deleting a job should:
- delete the job JSON file,
- delete all referenced settings JSON files,
- delete all referenced image files,
- recursively process dynamically discovered folder references,
- succeed atomically or roll back changes if a deletion fails.

