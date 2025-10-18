---
timestamp: 'Sat Oct 18 2025 09:54:59 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251018_095459.5e2f6128.md]]'
content_id: 18181f82c11e97530f7de08f3d301bef79c7d5e6426cc162226137c0cca402c5
---

# file: src/recipescaler/RecipeScalerConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Utility for test database setup
import { ID } from "@utils/types.ts"; // Generic ID type

// Import the concepts and LLM client interface
import RecipeConcept from "../recipe/RecipeConcept.ts";
import RecipeScalerConcept from "./RecipeScalerConcept.ts";
import { ILLMClient } from "./geminiLLMClient.ts"; // Only need the interface here

// Define generic ID types for consistency
type Author = ID;
type Recipe = ID;
type ScaledRecipe = ID;

// Define test author IDs
const authorAlice = "user:Alice" as Author;

// Mock IngredientData for testing
const mockIngredientsForScaling = [
  { name: "Flour", quantity: 200, unit: "g", scalingContext: "standard dry" },
  { name: "Sugar", quantity: 100, unit: "g", scalingContext: "standard dry" },
  { name: "Eggs", quantity: 2, unit: "large", scalingContext: "discrete item" },
  { name: "Salt", quantity: 0.5, unit: "tsp", scalingContext: "seasoning" },
  { name: "Water", quantity: 250, unit: "ml", scalingContext: "standard liquid" },
];

const mockCookingMethods = [
  "Mix dry ingredients",
  "Add wet ingredients",
  "Bake at 180C for 25 minutes",
];

/**
 * A simple dummy LLM client that implements ILLMClient but does nothing useful.
 * It's used to satisfy the constructor requirements of RecipeScalerConcept
 * when LLM-dependent tests are temporarily disabled.
 * Its executeLLM method will throw, as we are not testing LLM-specific actions.
 */
class DummyLLMClient implements ILLMClient {
  async executeLLM(_prompt: string): Promise<string> {
    // If an LLM-dependent action (like scaleRecipeAI) were accidentally called,
    // this would clearly indicate that the LLM functionality isn't being mocked/tested.
    throw new Error("DummyLLMClient: LLM execute method called. LLM-dependent tests are disabled.");
  }
}

const dummyLlmClient = new DummyLLMClient();

// --- Test Suite for RecipeScalerConcept ---

// Action: scaleManually specific tests
Deno.test({
  name: "scaleManually: should successfully scale a recipe linearly",
  permissions: { net: true }, // Only net for DB, no env for LLM key
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient); // Pass dummy client

    try {
      const addRecipeResult = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Simple Pasta",
        originalServings: 2,
        ingredients: mockIngredientsForScaling,
        cookingMethods: mockCookingMethods,
      });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const targetServings = 4; // Scale up
      const manualScaleResult = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings });
      assertNotEquals("error" in manualScaleResult, true, `Manual scaling failed: ${(manualScaleResult as { error: string }).error}`);
      const { scaledRecipeId } = manualScaleResult as { scaledRecipeId: ScaledRecipe };
      assertExists(scaledRecipeId);

      const fetchedScaledRecipe = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId });
      assertNotEquals("error" in fetchedScaledRecipe, true);
      assertEquals((fetchedScaledRecipe as { scalingMethod: string }).scalingMethod, "manual");

      const originalServings = 2;
      const scaleFactor = targetServings / originalServings; // 4/2 = 2
      const originalFlour = mockIngredientsForScaling.find(i => i.name === "Flour")!;
      const scaledFlour = (fetchedScaledRecipe as { scaledIngredients: typeof mockIngredientsForScaling }).scaledIngredients.find(i => i.name === "Flour")!;
      assertEquals(scaledFlour.quantity, originalFlour.quantity * scaleFactor, "Flour should be scaled linearly.");

      const targetServingsDown = 1; // Scale down
      const manualScaleDownResult = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: targetServingsDown });
      assertNotEquals("error" in manualScaleDownResult, true);
      const { scaledRecipeId: scaledRecipeIdDown } = manualScaleDownResult as { scaledRecipeId: ScaledRecipe };
      assertExists(scaledRecipeIdDown);

      const fetchedScaledRecipeDown = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId: scaledRecipeIdDown });
      assertNotEquals("error" in fetchedScaledRecipeDown, true);
      assertEquals((fetchedScaledRecipeDown as { scalingMethod: string }).scalingMethod, "manual");

      const scaleFactorDown = targetServingsDown / originalServings; // 1/2 = 0.5
      const originalWater = mockIngredientsForScaling.find(i => i.name === "Water")!;
      const scaledWater = (fetchedScaledRecipeDown as { scaledIngredients: typeof mockIngredientsForScaling }).scaledIngredients.find(i => i.name === "Water")!;
      assertEquals(scaledWater.quantity, parseFloat((originalWater.quantity * scaleFactorDown).toFixed(2)), "Water should be scaled linearly down.");

    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "scaleManually: should return error for non-existent base recipe",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient); // Pass dummy client
    try {
      const nonExistentRecipeId = "recipe:fake-id" as Recipe;
      const result = await recipeScalerConcept.scaleManually({ baseRecipeId: nonExistentRecipeId, targetServings: 4 });
      assertEquals("error" in result, true);
      assertEquals((result as { error: string }).error, `Base recipe with ID ${nonExistentRecipeId} not found.`);
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "scaleManually: should return error for invalid targetServings",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient); // Pass dummy client
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Test Recipe", originalServings: 4, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const resultZero = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 0 });
      assertEquals("error" in resultZero, true);
      assertEquals((resultZero as { error: string }).error, "targetServings must be greater than 0.");

      const resultNegative = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: -2 });
      assertEquals("error" in resultNegative, true);
      assertEquals((resultNegative as { error: string }).error, "targetServings must be greater than 0.");
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "scaleManually: should return error if targetServings equals originalServings",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient); // Pass dummy client
    try {
      const originalServings = 4;
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Test Recipe", originalServings, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const result = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: originalServings });
      assertEquals("error" in result, true);
      assertEquals((result as { error: string }).error, `targetServings (${originalServings}) cannot be equal to originalServings (${originalServings}).`);
    } finally {
      await client.close();
    }
  },
});

// --- Action: scaleRecipeAI specific tests (DISABLED - will not run with current setup) ---
// These tests are commented out or removed because they rely on LLM functionality
// For now, any call to scaleRecipeAI with this dummy client will throw an error.
/*
Deno.test({
  name: "scaleRecipeAI: (DISABLED) should successfully scale a recipe using AI and store it",
  permissions: { net: true, env: true }, // Still showing required permissions if it were active
  async fn() {
    // This test block is effectively disabled or will fail with DummyLLMClient
    // if `scaleRecipeAI` is uncommented/called.
    // To enable, replace dummyLlmClient with a real or properly configured mock.
    console.warn("Skipping 'scaleRecipeAI' test as LLM functionality is disabled.");
    assert(true); // Placeholder to ensure test runner doesn't complain about empty fn
  },
});
*/

// --- Query: _getScaledRecipe specific tests ---
Deno.test({
  name: "_getScaledRecipe: should return the scaled recipe by its ID",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient); // Pass dummy client
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Query Test Recipe", originalServings: 2, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      // We use scaleManually to create a scaled recipe for querying, as AI scaling is disabled
      const scaleResult = await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 4 });
      const { scaledRecipeId } = scaleResult as { scaledRecipeId: ScaledRecipe };
      assertExists(scaledRecipeId);

      const fetched = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId });
      assertNotEquals("error" in fetched, true);
      assertEquals((fetched as { _id: ScaledRecipe })._id, scaledRecipeId);
      assertEquals((fetched as { baseRecipeId: Recipe }).baseRecipeId, baseRecipeId);
      assertEquals((fetched as { targetServings: number }).targetServings, 4);
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "_getScaledRecipe: should return an error for a non-existent scaled recipe ID",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient); // Pass dummy client
    try {
      const nonExistentId = "scaled:fake-id" as ScaledRecipe;
      const fetched = await recipeScalerConcept._getScaledRecipe({ scaledRecipeId: nonExistentId });
      assertEquals("error" in fetched, true);
      assertEquals((fetched as { error: string }).error, `Scaled recipe with ID ${nonExistentId} not found.`);
    } finally {
      await client.close();
    }
  },
});

// --- Query: _findScaledRecipe specific tests ---
Deno.test({
  name: "_findScaledRecipe: should return a scaled recipe matching base ID and target servings",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient); // Pass dummy client
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Find Test Recipe", originalServings: 3, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 6 });
      // We are not calling scaleRecipeAI here, as LLM is disabled for now.
      // await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings: 9 });

      const fetched = await recipeScalerConcept._findScaledRecipe({ baseRecipeId, targetServings: 6 });
      assertExists(fetched);
      assertEquals(fetched.baseRecipeId, baseRecipeId);
      assertEquals(fetched.targetServings, 6);
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "_findScaledRecipe: should return null if no matching scaled recipe is found",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient); // Pass dummy client
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "No Match Recipe", originalServings: 4, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const fetched = await recipeScalerConcept._findScaledRecipe({ baseRecipeId, targetServings: 5 });
      assertEquals(fetched, null);
    } finally {
      await client.close();
    }
  },
});

// --- Query: _getScaledRecipesByBaseRecipe specific tests ---
Deno.test({
  name: "_getScaledRecipesByBaseRecipe: should return all scaled versions of a base recipe",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient); // Pass dummy client
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Multiple Scales Recipe", originalServings: 4, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 2 });
      // await recipeScalerConcept.scaleRecipeAI({ baseRecipeId, targetServings: 8 }); // Disabled
      await recipeScalerConcept.scaleManually({ baseRecipeId, targetServings: 6 });

      const scaledVersions = await recipeScalerConcept._getScaledRecipesByBaseRecipe({ baseRecipeId });
      assertEquals(scaledVersions.length, 2); // Expect 2 manual scales, not 3 (AI is off)
      assert(scaledVersions.some(s => s.targetServings === 2 && s.scalingMethod === 'manual'));
      // assert(scaledVersions.some(s => s.targetServings === 8 && s.scalingMethod === 'ai')); // Disabled
      assert(scaledVersions.some(s => s.targetServings === 6 && s.scalingMethod === 'manual'));
    } finally {
      await client.close();
    }
  },
});

Deno.test({
  name: "_getScaledRecipesByBaseRecipe: should return an empty array if no scaled versions exist",
  permissions: { net: true },
  async fn() {
    const [db, client] = await testDb();
    const recipeConcept = new RecipeConcept(db);
    const recipeScalerConcept = new RecipeScalerConcept(db, recipeConcept, dummyLlmClient); // Pass dummy client
    try {
      const addRecipeResult = await recipeConcept.addRecipe({ author: authorAlice, name: "Unscaled Recipe", originalServings: 4, ingredients: mockIngredientsForScaling, cookingMethods: [] });
      const { recipe: baseRecipeId } = addRecipeResult as { recipe: Recipe };

      const scaledVersions = await recipeScalerConcept._getScaledRecipesByBaseRecipe({ baseRecipeId });
      assertEquals(scaledVersions.length, 0);
    } finally {
      await client.close();
    }
  },
});
```
