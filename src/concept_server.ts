import { Hono } from "jsr:@hono/hono";
import { getDb } from "@utils/database.ts";
import { walk } from "jsr:@std/fs";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { toFileUrl } from "jsr:@std/path/to-file-url";
import { GeminiLLM } from "./geminiLLMClient.ts";
import RecipeConcept from "./concepts/Recipe/RecipeConcept.ts";
import { Db, MongoClient } from "npm:mongodb";

// Load config.json
const config = JSON.parse(Deno.readTextFileSync("config.json"));

// Parse command-line arguments for port and base URL
const flags = parseArgs(Deno.args, {
  string: ["port", "baseUrl"],
  default: {
    port: "8000",
    baseUrl: "/api",
  },
});

const PORT = parseInt(flags.port, 10);
const BASE_URL = flags.baseUrl;
const CONCEPTS_DIR = "src/concepts";

/**
 * Main server function to initialize DB, load concepts, and start the server.
 */
async function main() {
  const [db, _client] = await getDb() as [Db, MongoClient];
  const app = new Hono();

  app.get("/", (c) => c.text("Concept Server is running."));

  // --- Dynamic Concept Loading and Routing ---
  console.log(`Scanning for concepts in ./${CONCEPTS_DIR}...`);

  for await (
    const entry of walk(CONCEPTS_DIR, {
      maxDepth: 1,
      includeDirs: true,
      includeFiles: false,
    })
  ) {
    if (entry.path === CONCEPTS_DIR) continue; // Skip the root directory

    const conceptName = entry.name;
    const conceptFilePath = `${entry.path}/${conceptName}Concept.ts`;

    try {
      const modulePath = toFileUrl(Deno.realPathSync(conceptFilePath)).href;
      const module = await import(modulePath);
      const ConceptClass = module.default;

      if (
        typeof ConceptClass !== "function" ||
        !ConceptClass.name.endsWith("Concept")
      ) {
        console.warn(
          `! No valid concept class found in ${conceptFilePath}. Skipping.`,
        );
        continue;
      }

      // Special handling for concepts which require additional dependencies
      let instance;
      if (conceptName === "Scaler") {
        // Create Recipe concept instance first
        const recipeConcept = new RecipeConcept(db);

        // Get Gemini API key from config
        const geminiApiKey = config.apiKey;
        if (!geminiApiKey) {
          console.error(
            "❌ API key not found in config.json for Scaler concept",
          );
          continue;
        }

        // Create LLM client
        const llmClient = new GeminiLLM(geminiApiKey);

        // Create Scaler concept with all required dependencies
        instance = new ConceptClass(db, recipeConcept, llmClient);
      } else if (conceptName === "Tips") {
        // Get Gemini API key from config
        const geminiApiKey = config.apiKey;
        if (!geminiApiKey) {
          console.error(
            "❌ API key not found in config.json for Tips concept",
          );
          continue;
        }

        // Create LLM client
        const llmClient = new GeminiLLM(geminiApiKey);

        // Create Tips concept with LLM client
        instance = new ConceptClass(db, llmClient);
      } else {
        // Standard instantiation for other concepts
        instance = new ConceptClass(db);
      }

      const conceptApiName = conceptName === "Scaler"
        ? "RecipeScaler"
        : conceptName === "Tips"
        ? "ScalingTips"
        : conceptName;
      console.log(
        `- Registering concept: ${conceptName} at ${BASE_URL}/${conceptApiName}`,
      );

      const methodNames = Object.getOwnPropertyNames(
        Object.getPrototypeOf(instance),
      )
        .filter((name) =>
          name !== "constructor" && typeof instance[name] === "function"
        );

      for (const methodName of methodNames) {
        const actionName = methodName;
        const route = `${BASE_URL}/${conceptApiName}/${actionName}`;

        app.post(route, async (c) => {
          try {
            const body = await c.req.json().catch(() => ({})); // Handle empty body
            const result = await instance[methodName](body);
            return c.json(result);
          } catch (e) {
            console.error(`Error in ${conceptName}.${methodName}:`, e);
            return c.json({ error: "An internal server error occurred." }, 500);
          }
        });
        console.log(`  - Endpoint: POST ${route}`);
      }
    } catch (e) {
      console.error(
        `! Error loading concept from ${conceptFilePath}:`,
        e,
      );
    }
  }

  console.log(`\nServer listening on http://localhost:${PORT}`);
  Deno.serve({ port: PORT }, app.fetch);
}

// Run the server
main();
