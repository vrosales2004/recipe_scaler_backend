---
timestamp: 'Sat Oct 18 2025 10:29:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_102932.1eab7f32.md]]'
content_id: b1a20c5388a39c18c10e4c375c7e73e1d4fadf4734ff33fe474c1b9ce924b212
---

# file: src/scalingtips/ScalingTipsConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Utility for test database setup
import { ID } from "@utils/types.ts"; // Generic ID type

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

const dummyLlmClient = new DummyLLMClient();

// Test Authors
const authorAlice = "user:Alice" as Author;
const authorBob = "user:Bob" as Author;

// --- Principle Trace Test (Adjusted for Manual Tips Only) ---
Deno.test({
  name: "Principle: User adds manual tips, which are then retrieved",
  permissions: { net: true }, // Only network access needed for DB
  async fn() {
    const [db, client] = await testDb();
    const scalingTipsConcept = new ScalingTipsConcept(db, dummyLlmClient); // Use dummy LLM client

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
  },
});

// --- Action: addManualScalingTip specific tests ---
Deno.test({
  name: "addManualScalingTip: should successfully add a new manual tip",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const scalingTipsConcept = new ScalingTipsConcept(db, dummyLlmClient);

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
  },
});

Deno.test({
  name: "addManualScalingTip: should return error for invalid direction",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const scalingTipsConcept = new ScalingTipsConcept(db, dummyLlmClient);

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
  },
});

Deno.test({
  name: "addManualScalingTip: should return error for empty cooking method",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const scalingTipsConcept = new ScalingTipsConcept(db, dummyLlmClient);

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
  },
});

Deno.test({
  name: "addManualScalingTip: should return error for empty tip text",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const scalingTipsConcept = new ScalingTipsConcept(db, dummyLlmClient);

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
  },
});

// --- Action: removeScalingTip specific tests ---
Deno.test({
  name: "removeScalingTip: should successfully remove an existing tip",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const scalingTipsConcept = new ScalingTipsConcept(db, dummyLlmClient);

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
  },
});

Deno.test({
  name: "removeScalingTip: should return error if attempting to remove a non-existent tip",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const scalingTipsConcept = new ScalingTipsConcept(db, dummyLlmClient);

    try {
      const nonExistentTipId = "tip:fake-id-123" as Tip;
      const removeResult = await scalingTipsConcept.removeScalingTip({ tipId: nonExistentTipId });
      assertEquals("error" in removeResult, true, "Should return an error for non-existent tip.");
      assertEquals((removeResult as { error: string }).error, `Tip with ID ${nonExistentTipId} not found.`, "Error message should indicate tip not found.");
    } finally {
      await client.close();
    }
  },
});

// --- Query: _getScalingTips specific tests ---
Deno.test({
  name: "_getScalingTips: should return tips filtered by cooking method and direction",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const scalingTipsConcept = new ScalingTipsConcept(db, dummyLlmClient);

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
  },
});

// --- Query: _getRandomScalingTip specific tests ---
Deno.test({
  name: "_getRandomScalingTip: should return a random tip matching criteria",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const scalingTipsConcept = new ScalingTipsConcept(db, dummyLlmClient);

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
  },
});
```
