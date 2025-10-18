---
timestamp: 'Sat Oct 18 2025 10:43:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_104311.eed65699.md]]'
content_id: e1f850024d55f6d9a034451db4c474bdc878940ab056fbe592fa9e3b52d0e65d
---

# file: src/scalingtips/ScalingTipsConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertRejects, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Utility for test database setup
import { ID } from "@utils/types.ts"; // Generic ID type
// Removed: import { config } from "dotenv"; // No longer calling config directly in tests

// Import the concepts and LLM client interface (only the interface needed)
import ScalingTipsConcept from "./ScalingTipsConcept.ts";
import { ILLMClient } from "../recipescaler/geminiLLMClient.ts"; // Re-use the interface definition

// Define generic ID types for consistency
type Author = ID;
type Tip = ID; // Internal ID for a tip

// Dummy LLM client that implements ILLMClient but does nothing and throws if called.
// This ensures no real LLM calls are made and LLM-dependent features are not accidentally tested.
class DummyLLMClient implements ILLMClient {
  async executeLLM(_prompt: string): Promise<string> {
    throw new Error("DummyLLMClient: LLM execute method called. LLM functionality is disabled for testing.");
  }
}

const dummyLlmClient = new DummyLLMClient(); // Singleton dummy client

// Helper function to get LLM client - always returns the dummy client
function getLLMClient(): ILLMClient {
  return dummyLlmClient;
}

// Test Authors
const authorAlice = "user:Alice" as Author;
const authorBob = "user:Bob" as Author;

// --- Principle Trace Test (Adjusted for Manual Tips Only) ---
Deno.test("Principle: User adds manual tips, which are then retrieved", async () => { // Permissions removed
  // Removed: config({ export: true, allowEmptyValues: true }); // No longer calling config directly
  const [db, client] = await testDb();
  const scalingTipsConcept = new ScalingTipsConcept(db, getLLMClient()); // Use dummy LLM client

  try {
    // 1. User adds a tip for scaling up baking
    const addTip1Result = await scalingTipsConcept.addManualScalingTip({
      cookingMethod: "Baking",
      direction: "up",
      tipText: "When scaling up baking recipes, ensure your oven has enough space for larger pans.",
      addedBy: authorAlice,
    });
    assertNotEquals("error" in addTip1Result, true, `Failed to add tip 1: ${(addTip1Result as { error: string }).error}`);
    const { tipId: tip1Id } = addTip1Result as { tipId: Tip };
    assertExists(tip1Id, "Tip 1 ID should be returned.");

    // 2. User adds another tip for scaling down sauces
    const addTip2Result = await scalingTipsConcept.addManualScalingTip({
      cookingMethod: "Sauces",
      direction: "down",
      tipText: "Reducing sauce recipes often requires careful tasting and adjusting seasonings more frequently.",
      addedBy: authorBob, // Different author
    });
    assertNotEquals("error" in addTip2Result, true, `Failed to add tip 2: ${(addTip2Result as { error: string }).error}`);
    const { tipId: tip2Id } = addTip2Result as { tipId: Tip };
    assertExists(tip2Id, "Tip 2 ID should be returned.");

    // 3. Tips are retrieved and are available to users
    const bakingUpTips = await scalingTipsConcept._getScalingTips({ cookingMethod: "Baking", direction: "up" });
    assertEquals(bakingUpTips.length, 1, "Should retrieve 1 baking up tip.");
    assertEquals(bakingUpTips[0].text, "When scaling up baking recipes, ensure your oven has enough space for larger pans.");
    assertEquals(bakingUpTips[0].addedBy, authorAlice);

    const sauceDownTips = await scalingTipsConcept._getScalingTips({ cookingMethod: "Sauces", direction: "down" });
    assertEquals(sauceDownTips.length, 1, "Should retrieve 1 sauces down tip.");
    assertEquals(sauceDownTips[0].text, "Reducing sauce recipes often requires careful tasting and adjusting seasonings more frequently.");
    assertEquals(sauceDownTips[0].addedBy, authorBob);

  } finally {
    await client.close(); // Close DB connection
  }
});

// --- Action: addManualScalingTip specific tests ---
Deno.test("addManualScalingTip: should successfully add a new manual tip", async () => { // Permissions removed
  // Removed: config({ export: true, allowEmptyValues: true });
  const [db, client] = await testDb();
  const scalingTipsConcept = new ScalingTipsConcept(db, getLLMClient());

  try {
    const result = await scalingTipsConcept.addManualScalingTip({
      cookingMethod: "Frying",
      direction: "up",
      tipText: "Use a wider pan when frying larger batches to maintain even cooking.",
      addedBy: authorAlice,
    });

    assertNotEquals("error" in result, true, `addManualScalingTip failed: ${(result as { error: string }).error}`);
    const newTipId = (result as { tipId: Tip }).tipId;
    assertExists(newTipId, "Should return a tip ID on success.");

    // Verify the tip exists in the database
    const fetchedTips = await scalingTipsConcept._getScalingTips({ cookingMethod: "Frying", direction: "up" });
    assertEquals(fetchedTips.length, 1, "The added tip should be retrievable.");
    assertEquals(fetchedTips[0].text, "Use a wider pan when frying larger batches to maintain even cooking.");
    assertEquals(fetchedTips[0].source, "manual");
    assertEquals(fetchedTips[0].addedBy, authorAlice);
  } finally {
    await client.close();
  }
});

Deno.test("addManualScalingTip: should return error for invalid direction", async () => { // Permissions removed
  // Removed: config({ export: true, allowEmptyValues: true });
  const [db, client] = await testDb();
  const scalingTipsConcept = new ScalingTipsConcept(db, getLLMClient());

  try {
    const result = await scalingTipsConcept.addManualScalingTip({
      cookingMethod: "Grilling",
      // @ts-ignore: Intentionally testing invalid input
      direction: "sideways",
      tipText: "Test tip.",
      addedBy: authorAlice,
    });
    assertEquals("error" in result, true, "Should return an error for invalid direction.");
    assertEquals((result as { error: string }).error, "Direction must be 'up' or 'down'.");
  } finally {
    await client.close();
  }
});

Deno.test("addManualScalingTip: should return error for empty cooking method", async () => { // Permissions removed
  // Removed: config({ export: true, allowEmptyValues: true });
  const [db, client] = await testDb();
  const scalingTipsConcept = new ScalingTipsConcept(db, getLLMClient());

  try {
    const result = await scalingTipsConcept.addManualScalingTip({
      cookingMethod: "",
      direction: "up",
      tipText: "Test tip.",
      addedBy: authorAlice,
    });
    assertEquals("error" in result, true, "Should return an error for empty cooking method.");
    assertEquals((result as { error: string }).error, "Cooking method cannot be empty.");
  } finally {
    await client.close();
  }
});

Deno.test("addManualScalingTip: should return error for empty tip text", async () => { // Permissions removed
  // Removed: config({ export: true, allowEmptyValues: true });
  const [db, client] = await testDb();
  const scalingTipsConcept = new ScalingTipsConcept(db, getLLMClient());

  try {
    const result = await scalingTipsConcept.addManualScalingTip({
      cookingMethod: "Roasting",
      direction: "down",
      tipText: "",
      addedBy: authorAlice,
    });
    assertEquals("error" in result, true, "Should return an error for empty tip text.");
    assertEquals((result as { error: string }).error, "Tip text cannot be empty.");
  } finally {
    await client.close();
  }
});

// --- Action: removeScalingTip specific tests ---
Deno.test("removeScalingTip: should successfully remove an existing tip", async () => { // Permissions removed
  // Removed: config({ export: true, allowEmptyValues: true });
  const [db, client] = await testDb();
  const scalingTipsConcept = new ScalingTipsConcept(db, getLLMClient());

  try {
    const addResult = await scalingTipsConcept.addManualScalingTip({
      cookingMethod: "Stewing",
      direction: "up",
      tipText: "When scaling up stews, remember to adjust liquid gradually.",
      addedBy: authorAlice,
    });
    const tipIdToRemove = (addResult as { tipId: Tip }).tipId;
    assertExists(tipIdToRemove, "Tip should be added successfully before removal test.");

    const removeResult = await scalingTipsConcept.removeScalingTip({ tipId: tipIdToRemove });
    assertEquals("error" in removeResult, false, `removeScalingTip failed: ${(removeResult as { error: string }).error}`);
    assertEquals(removeResult, {}, "Should return an empty object on successful removal.");

    // Verify the tip is actually gone
    const fetchedTips = await scalingTipsConcept._getScalingTips({ cookingMethod: "Stewing", direction: "up" });
    assertEquals(fetchedTips.length, 0, "The removed tip should no longer be found.");
  } finally {
    await client.close();
  }
});

Deno.test("removeScalingTip: should return error if attempting to remove a non-existent tip", async () => { // Permissions removed
  // Removed: config({ export: true, allowEmptyValues: true });
  const [db, client] = await testDb();
  const scalingTipsConcept = new ScalingTipsConcept(db, getLLMClient());

  try {
    const nonExistentTipId = "tip:fake-id-123" as Tip;
    const removeResult = await scalingTipsConcept.removeScalingTip({ tipId: nonExistentTipId });
    assertEquals("error" in removeResult, true, "Should return an error for non-existent tip.");
    assertEquals((removeResult as { error: string }).error, `Tip with ID ${nonExistentTipId} not found.`, "Error message should indicate tip not found.");
  } finally {
    await client.close();
  }
});

// --- Action: requestTipGeneration specific tests (DISABLED - will not run) ---
Deno.test("requestTipGeneration: should throw error if called (LLM functionality disabled)", async () => { // Permissions removed
  // Removed: config({ export: true, allowEmptyValues: true });
  const [db, client] = await testDb();
  const scalingTipsConcept = new ScalingTipsConcept(db, getLLMClient());

  try {
    const mockRecipeContext = {
      recipeId: "recipe:123" as ID,
      name: "Mock Recipe",
      originalServings: 4,
      targetServings: 8,
      ingredients: [],
      cookingMethods: [],
    };
    await assertRejects(
      () => scalingTipsConcept.requestTipGeneration({ recipeContext: mockRecipeContext }),
      Error,
      "DummyLLMClient: LLM execute method called. LLM functionality is disabled for testing.",
    );
  } finally {
    await client.close();
  }
});


// --- Query: _getScalingTips specific tests ---
Deno.test("_getScalingTips: should return tips filtered by cooking method and direction", async () => { // Permissions removed
  // Removed: config({ export: true, allowEmptyValues: true });
  const [db, client] = await testDb();
  const scalingTipsConcept = new ScalingTipsConcept(db, getLLMClient());

  try {
    await scalingTipsConcept.addManualScalingTip({ cookingMethod: "Baking", direction: "up", tipText: "Tip 1", addedBy: authorAlice });
    await scalingTipsConcept.addManualScalingTip({ cookingMethod: "Baking", direction: "down", tipText: "Tip 2", addedBy: authorAlice });
    await scalingTipsConcept.addManualScalingTip({ cookingMethod: "Frying", direction: "up", tipText: "Tip 3", addedBy: authorAlice });
    await scalingTipsConcept.addManualScalingTip({ cookingMethod: "Baking", direction: "up", tipText: "Tip 4", addedBy: authorBob }); // Another for Baking/up

    const bakingUpTips = await scalingTipsConcept._getScalingTips({ cookingMethod: "Baking", direction: "up" });
    assertEquals(bakingUpTips.length, 2, "Should retrieve 2 tips for 'Baking' and 'up'.");
    assert(bakingUpTips.some(t => t.text === "Tip 1"));
    assert(bakingUpTips.some(t => t.text === "Tip 4"));

    const fryingUpTips = await scalingTipsConcept._getScalingTips({ cookingMethod: "Frying", direction: "up" });
    assertEquals(fryingUpTips.length, 1, "Should retrieve 1 tip for 'Frying' and 'up'.");
    assertEquals(fryingUpTips[0].text, "Tip 3");

    const nonExistentTips = await scalingTipsConcept._getScalingTips({ cookingMethod: "Grilling", direction: "down" });
    assertEquals(nonExistentTips.length, 0, "Should return an empty array for no matching tips.");
  } finally {
    await client.close();
  }
});

// --- Query: _getRandomScalingTip specific tests ---
Deno.test("_getRandomScalingTip: should return a random tip matching criteria", async () => { // Permissions removed
  // Removed: config({ export: true, allowEmptyValues: true });
  const [db, client] = await testDb();
  const scalingTipsConcept = new ScalingTipsConcept(db, getLLMClient());

  try {
    await scalingTipsConcept.addManualScalingTip({ cookingMethod: "Baking", direction: "up", tipText: "Tip A", addedBy: authorAlice });
    await scalingTipsConcept.addManualScalingTip({ cookingMethod: "Baking", direction: "up", tipText: "Tip B", addedBy: authorAlice });
    await scalingTipsConcept.addManualScalingTip({ cookingMethod: "Baking", direction: "down", tipText: "Tip C", addedBy: authorAlice });

    const randomUpBakingTip = await scalingTipsConcept._getRandomScalingTip({ cookingMethod: "Baking", direction: "up" });
    assertExists(randomUpBakingTip, "Should return a random tip.");
    assert(["Tip A", "Tip B"].includes(randomUpBakingTip.text), "Random tip should be one of the 'Baking'/'up' tips.");

    const randomDownBakingTip = await scalingTipsConcept._getRandomScalingTip({ cookingMethod: "Baking", direction: "down" });
    assertExists(randomDownBakingTip, "Should return a random tip.");
    assertEquals(randomDownBakingTip.text, "Tip C");

    const noTips = await scalingTipsConcept._getRandomScalingTip({ cookingMethod: "Grilling", direction: "up" });
    assertEquals(noTips, null, "Should return null if no tips match criteria.");
  } finally {
    await client.close();
  }
});
```

***

### How to Run (and Why This Should Finally Work)

1. **Crucial: Your `database.ts` file is good!**
   The line `import "jsr:@std/dotenv/load";` at the very top of your `database.ts` is designed to load environment variables from `.env` automatically when `database.ts` is first imported. This is the **correct and standard Deno way** to handle it.

2. **Command Line Permissions:** You *still* need to grant `env` permission to the main Deno process:
   ```bash
   deno test --allow-env --allow-net src/scalingtips/ScalingTipsConcept.test.ts
   ```
   * `--allow-env`: Essential because `database.ts` needs `env` access to read `MONGODB_URL` (and other `.env` variables).
   * `--allow-net`: Essential for connecting to MongoDB.
   * `--allow-sys`, `--allow-read`: No longer needed on the command line for *this specific test file*, as no code here should be triggering those permissions anymore.

With the explicit `permissions` objects removed from your `Deno.test` calls, these test blocks will now **inherit all the permissions you grant on the command line.** This means `database.ts` will load with `env` access, and then `MONGODB_URL` will be available to `Deno.env.get()`.

This approach keeps your test files clean and focused on test logic, while centralizing environment variable loading in `database.ts` and relying on the command line for top-level permission grants.
