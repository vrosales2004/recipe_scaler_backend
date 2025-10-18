---
timestamp: 'Sat Oct 18 2025 10:41:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_104111.e46021fd.md]]'
content_id: f16bd2c48ca110317ac2f0f7fd9cd8b2b123007ff549e9bafcdcfe56826cefec
---

# question: still getting the same error. here is my database.ts so you can point out if theres anything wrong// This import loads the `.env` file as environment variables

import "jsr:@std/dotenv/load";

import { Db, MongoClient } from "npm:mongodb";

import { ID } from "@utils/types.ts";

import { generate } from "jsr:@std/uuid/unstable-v7";

async function initMongoClient() {

const DB\_CONN = Deno.env.get("MONGODB\_URL");

if (DB\_CONN === undefined) {

throw new Error("Could not find environment variable: MONGODB\_URL");

}

const client = new MongoClient(DB\_CONN);

try {

await client.connect();

} catch (e) {

throw new Error("MongoDB connection failed: " + e);

}

return client;

}

async function init() {

const client = await initMongoClient();

const DB\_NAME = Deno.env.get("DB\_NAME");

if (DB\_NAME === undefined) {

throw new Error("Could not find environment variable: DB\_NAME");

}

return \[client, DB\_NAME] as \[MongoClient, string];

}

async function dropAllCollections(db: Db): Promise<void> {

try {

// Get all collection names

const collections = await db.listCollections().toArray();

// Drop each collection

for (const collection of collections) {

await db.collection(collection.name).drop();

}

} catch (error) {

console.error("Error dropping collections:", error);

throw error;

}

}

/\*\*

* MongoDB database configured by .env

* @returns {\[Db, MongoClient]} initialized database and client

\*/

export async function getDb() {

const \[client, DB\_NAME] = await init();

return \[client.db(DB\_NAME), client];

}

/\*\*

* Test database initialization

* @returns {\[Db, MongoClient]} initialized test database and client

\*/

export async function testDb() {

const \[client, DB\_NAME] = await init();

const test\_DB\_NAME = `test-${DB_NAME}`;

const test\_Db = client.db(test\_DB\_NAME);

await dropAllCollections(test\_Db);

return \[test\_Db, client] as \[Db, MongoClient];

}

/\*\*

* Creates a fresh ID.

* @returns {ID} UUID v7 generic ID.

\*/

export function freshID() {

return generate() as ID;

}
