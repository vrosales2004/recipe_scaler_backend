---
timestamp: 'Fri Oct 17 2025 14:06:12 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_140612.347f8c02.md]]'
content_id: 24138295e64573a16692c0290c2d7fc8e337f7460604c8879496920baa38480b
---

# file: src/recipe/RecipeConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assert } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Utility for test database setup
import { ID } from "@utils/types.ts"; // Generic ID type
import RecipeConcept from "./RecipeConcept.ts"; // The concept to be tested

// Define generic ID types for consistency
type Author = ID;
type Recipe = ID;

// Define mock IngredientData for reuse in tests
const mockIngredients = [
  { name: "Flour", quantity: 2, unit: "cups", scalingContext: "dry" },
  { name: "Sugar", quantity: 1, unit: "cup", scalingContext: "sweetener" },
  { name: "Eggs", quantity: 2, unit: "large", scalingContext: "binder" },
];

// Define mock CookingMethods for reuse in tests
const mockCookingMethods = [
  "Preheat oven to 350°F",
  "Mix dry ingredients",
  "Add wet ingredients",
  "Bake for 30 minutes",
];

// Define test author IDs
const authorAlice = "user:Alice" as Author;
const authorBob = "user:Bob" as Author;
const authorCharlie = "user:Charlie" as Author; // For testing scenarios with no recipes

// --- Principle Trace Test ---
Deno.test("Principle: Recipe manually inputted, stored, and accessed later", async () => {
  const [db, client] = await testDb(); // Get a fresh, clean database for this test
  const recipeConcept = new RecipeConcept(db);

  try {
    // Principle Step 1: Recipe manually inputted or uploaded with original ingredients and number of people
    const addResult = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Grandma's Apple Pie",
      originalServings: 8,
      ingredients: [
        { name: "Apples", quantity: 6, unit: "medium", scalingContext: "fruit" },
        { name: "Pie Crust", quantity: 2, unit: "sheets", scalingContext: "base" },
        { name: "Cinnamon", quantity: 1, unit: "tsp", scalingContext: "spice" },
      ],
      cookingMethods: [
        "Prepare pie crust",
        "Slice apples and mix with cinnamon",
        "Fill crust and bake",
      ],
    });
    assertNotEquals("error" in addResult, true, "Adding Grandma's Apple Pie should succeed.");
    const { recipe: applePieId } = addResult as { recipe: Recipe };
    assertExists(applePieId, "A recipe ID should be returned.");

    // Principle Step 2: Stores recipes to be accessed by scaler or tipsPage (implies retrievable)
    // Access the recipe by its ID
    const fetchedRecipeById = await recipeConcept._getRecipeById({ recipeId: applePieId });
    assertExists(fetchedRecipeById, "Grandma's Apple Pie should be retrievable by its ID.");
    assertEquals(fetchedRecipeById.name, "Grandma's Apple Pie");
    assertEquals(fetchedRecipeById.author, authorAlice);
    assertEquals(fetchedRecipeById.originalServings, 8);
    assertEquals(fetchedRecipeById.ingredients.length, 3);
    assertEquals(fetchedRecipeById.cookingMethods.length, 3);

    // Access the recipe by name and author
    const fetchedRecipeByName = await recipeConcept._getRecipeByName({ recipeName: "Grandma's Apple Pie", author: authorAlice });
    assertExists(fetchedRecipeByName, "Grandma's Apple Pie should be retrievable by name and author.");
    assertEquals(fetchedRecipeByName._id, applePieId);

  } finally {
    await client.close(); // Close the database connection for this test
  }
});

// --- Action and Query Specific Tests ---
Deno.test("RecipeConcept Actions and Queries", async (test) => {
  let db: Deno.MongoClient.Db;
  let client: Deno.MongoClient;
  let recipeConcept: RecipeConcept;

  // Setup: Runs once before all tests in this group
  test.beforeAll(async () => {
    [db, client] = await testDb();
    recipeConcept = new RecipeConcept(db);
    console.log("Database and RecipeConcept initialized for 'Actions and Queries' tests.");
  });

  // Cleanup: Runs before each individual test to ensure a clean state
  test.beforeEach(async () => {
    // Delete all documents from the 'Recipe.recipes' collection
    await db.collection("Recipe.recipes").deleteMany({});
  });

  await test.step("addRecipe action", async (t) => {
    await t.step("should successfully add a new recipe", async () => {
      const result = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Classic Chocolate Chip Cookies",
        originalServings: 12,
        ingredients: mockIngredients,
        cookingMethods: mockCookingMethods,
      });

      assertNotEquals("error" in result, true, `addRecipe failed with error: ${(result as { error: string }).error}`);
      const newRecipeId = (result as { recipe: Recipe }).recipe;
      assertExists(newRecipeId, "Should return a recipe ID on success");

      // Verify the recipe exists in the database
      const fetchedRecipe = await recipeConcept._getRecipeById({ recipeId: newRecipeId });
      assertExists(fetchedRecipe, "The added recipe should be retrievable by its ID");
      assertEquals(fetchedRecipe.name, "Classic Chocolate Chip Cookies");
      assertEquals(fetchedRecipe.author, authorAlice);
      assertEquals(fetchedRecipe.originalServings, 12);
      assertEquals(fetchedRecipe.ingredients.length, mockIngredients.length);
      assertEquals(fetchedRecipe.cookingMethods.length, mockCookingMethods.length);
    });

    await t.step("should return an error if originalServings is 0 or less", async () => {
      const resultZero = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Zero Servings Test",
        originalServings: 0,
        ingredients: mockIngredients,
        cookingMethods: mockCookingMethods,
      });
      assertExists((resultZero as { error: string }).error, "Should return an error for 0 servings");
      assertEquals((resultZero as { error: string }).error, "originalServings must be greater than 0.");

      const resultNegative = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Negative Servings Test",
        originalServings: -5,
        ingredients: mockIngredients,
        cookingMethods: mockCookingMethods,
      });
      assertExists((resultNegative as { error: string }).error, "Should return an error for negative servings");
      assertEquals((resultNegative as { error: string }).error, "originalServings must be greater than 0.");
    });

    await t.step("should return an error if originalServings is not an integer", async () => {
      const result = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Non-Integer Servings Test",
        originalServings: 8.5,
        ingredients: mockIngredients,
        cookingMethods: mockCookingMethods,
      });
      assertExists((result as { error: string }).error, "Should return an error for non-integer servings");
      assertEquals((result as { error: string }).error, "originalServings must be an integer.");
    });

    await t.step("should return an error if ingredients list is empty", async () => {
      const result = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Empty Ingredients Test",
        originalServings: 4,
        ingredients: [], // Empty ingredients list
        cookingMethods: mockCookingMethods,
      });
      assertExists((result as { error: string }).error, "Should return an error for empty ingredients");
      assertEquals((result as { error: string }).error, "Recipe must have at least one ingredient.");
    });

    await t.step("should return an error if recipe name already exists for the same author", async () => {
      // Add the first recipe successfully
      await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Duplicate Name Test Recipe",
        originalServings: 4,
        ingredients: mockIngredients,
        cookingMethods: mockCookingMethods,
      });

      // Attempt to add another recipe with the same name by the same author
      const result = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Duplicate Name Test Recipe", // Same name
        originalServings: 6,
        ingredients: mockIngredients,
        cookingMethods: ["Another method"],
      });
      assertExists((result as { error: string }).error, "Should return an error for duplicate recipe name by same author");
      assertEquals((result as { error: string }).error, "A recipe named 'Duplicate Name Test Recipe' already exists for this author.");
    });

    await t.step("should allow the same recipe name for different authors", async () => {
      const result1 = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Shared Recipe Name",
        originalServings: 4,
        ingredients: mockIngredients,
        cookingMethods: mockCookingMethods,
      });
      assertNotEquals("error" in result1, true, `addRecipe for Alice failed with error: ${(result1 as { error: string }).error}`);
      assertExists((result1 as { recipe: Recipe }).recipe);

      const result2 = await recipeConcept.addRecipe({
        author: authorBob, // Different author
        name: "Shared Recipe Name", // Same name
        originalServings: 2,
        ingredients: mockIngredients,
        cookingMethods: mockCookingMethods,
      });
      assertNotEquals("error" in result2, true, `addRecipe for Bob failed with error: ${(result2 as { error: string }).error}`);
      assertExists((result2 as { recipe: Recipe }).recipe);
      // Ensure the IDs are distinct, confirming two separate recipes were created
      assertNotEquals((result1 as { recipe: Recipe }).recipe, (result2 as { recipe: Recipe }).recipe, "Recipes by different authors should have distinct IDs");
    });
  });

  await test.step("removeRecipe action", async (t) => {
    let recipeIdToRemove: Recipe; // Variable to store the ID of the recipe created for testing removal

    // Setup: Add a recipe that will be removed in the following tests
    t.beforeEach(async () => {
      const addResult = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Recipe To Be Removed",
        originalServings: 4,
        ingredients: mockIngredients,
        cookingMethods: mockCookingMethods,
      });
      recipeIdToRemove = (addResult as { recipe: Recipe }).recipe;
      assertExists(recipeIdToRemove, "Recipe should be added successfully before removal tests");
    });

    await t.step("should successfully remove an existing recipe", async () => {
      const removeResult = await recipeConcept.removeRecipe({ recipeId: recipeIdToRemove });
      assertEquals("error" in removeResult, false, `removeRecipe failed with error: ${(removeResult as { error: string }).error}`);
      assertEquals(removeResult, {}, "Should return an empty object on successful removal");

      // Verify the recipe is actually gone
      const fetchedRecipe = await recipeConcept._getRecipeById({ recipeId: recipeIdToRemove });
      assertEquals(fetchedRecipe, null, "The removed recipe should no longer be found");
    });

    await t.step("should return an error if attempting to remove a non-existent recipe", async () => {
      const nonExistentRecipeId = "non-existent-recipe-123" as Recipe;
      const removeResult = await recipeConcept.removeRecipe({ recipeId: nonExistentRecipeId });
      assertExists((removeResult as { error: string }).error, "Should return an error for non-existent recipe");
      assertEquals((removeResult as { error: string }).error, `Recipe with ID ${nonExistentRecipeId} not found.`, "Error message should indicate recipe not found");

      // Verify the pre-existing recipe (recipeIdToRemove) is still there
      const stillExistingRecipe = await recipeConcept._getRecipeById({ recipeId: recipeIdToRemove });
      assertExists(stillExistingRecipe, "Other recipes should remain unaffected by failed removal attempt");
    });
  });

  await test.step("Queries", async (t) => {
    let aliceRecipe1Id: Recipe;
    let aliceRecipe2Id: Recipe;
    let bobRecipe1Id: Recipe;

    // Setup: Add multiple recipes for different authors for query tests
    t.beforeEach(async () => {
      // Alice's recipes
      const r1 = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Alice's Famous Lasagna",
        originalServings: 6,
        ingredients: [{ name: "Pasta", quantity: 500, unit: "g" }],
        cookingMethods: ["Layer", "Bake"],
      });
      aliceRecipe1Id = (r1 as { recipe: Recipe }).recipe;

      const r2 = await recipeConcept.addRecipe({
        author: authorAlice,
        name: "Alice's Quick Salad",
        originalServings: 2,
        ingredients: [{ name: "Lettuce", quantity: 1, unit: "head" }],
        cookingMethods: ["Chop", "Toss"],
      });
      aliceRecipe2Id = (r2 as { recipe: Recipe }).recipe;

      // Bob's recipe
      const r3 = await recipeConcept.addRecipe({
        author: authorBob,
        name: "Bob's Beef Stew",
        originalServings: 8,
        ingredients: [{ name: "Beef", quantity: 1, unit: "kg" }],
        cookingMethods: ["Sear", "Simmer"],
      });
      bobRecipe1Id = (r3 as { recipe: Recipe }).recipe;

      assertExists(aliceRecipe1Id, "Setup: Alice recipe 1 should be added");
      assertExists(aliceRecipe2Id, "Setup: Alice recipe 2 should be added");
      assertExists(bobRecipe1Id, "Setup: Bob recipe 1 should be added");
    });

    await t.step("_getRecipeById should return the correct recipe if it exists", async () => {
      const fetchedRecipe = await recipeConcept._getRecipeById({ recipeId: aliceRecipe1Id });
      assertExists(fetchedRecipe, "Should find Alice's lasagna by ID");
      assertEquals(fetchedRecipe._id, aliceRecipe1Id);
      assertEquals(fetchedRecipe.name, "Alice's Famous Lasagna");
      assertEquals(fetchedRecipe.author, authorAlice);
    });

    await t.step("_getRecipeById should return null if the recipe ID does not exist", async () => {
      const nonExistentId = "non-existent-recipe-id-456" as Recipe;
      const fetchedRecipe = await recipeConcept._getRecipeById({ recipeId: nonExistentId });
      assertEquals(fetchedRecipe, null, "Should return null for a non-existent recipe ID");
    });

    await t.step("_getRecipesByAuthor should return all recipes for a given author", async () => {
      const aliceRecipes = await recipeConcept._getRecipesByAuthor({ author: authorAlice });
      assertEquals(aliceRecipes.length, 2, "Alice should have 2 recipes");
      assert(aliceRecipes.some(r => r._id === aliceRecipe1Id), "Alice's lasagna should be in her list");
      assert(aliceRecipes.some(r => r._id === aliceRecipe2Id), "Alice's salad should be in her list");

      const bobRecipes = await recipeConcept._getRecipesByAuthor({ author: authorBob });
      assertEquals(bobRecipes.length, 1, "Bob should have 1 recipe");
      assert(bobRecipes.some(r => r._id === bobRecipe1Id), "Bob's beef stew should be in his list");
    });

    await t.step("_getRecipesByAuthor should return an empty array if the author has no recipes", async () => {
      const charlieRecipes = await recipeConcept._getRecipesByAuthor({ author: authorCharlie });
      assertEquals(charlieRecipes.length, 0, "Charlie should have 0 recipes");
    });

    await t.step("_getRecipeByName should return the correct recipe when name and author match", async () => {
      const fetchedRecipe = await recipeConcept._getRecipeByName({ recipeName: "Alice's Famous Lasagna", author: authorAlice });
      assertExists(fetchedRecipe, "Should find Alice's lasagna by name and author");
      assertEquals(fetchedRecipe._id, aliceRecipe1Id);
      assertEquals(fetchedRecipe.name, "Alice's Famous Lasagna");
      assertEquals(fetchedRecipe.author, authorAlice);
    });

    await t.step("_getRecipeByName should return null if the name exists but the author does not match", async () => {
      // Attempt to find Alice's recipe by Bob
      const fetchedRecipe = await recipeConcept._getRecipeByName({ recipeName: "Alice's Famous Lasagna", author: authorBob });
      assertEquals(fetchedRecipe, null, "Bob should not find Alice's recipe by name");
    });

    await t.step("_getRecipeByName should return null if the recipe name does not exist", async () => {
      const fetchedRecipe = await recipeConcept._getRecipeByName({ recipeName: "Non Existent Recipe Name", author: authorAlice });
      assertEquals(fetchedRecipe, null, "Should return null for a non-existent recipe name");
    });
  });

  // --- Global Teardown (after all tests in this suite) ---
  Deno.test.afterAll(async () => {
    // This hook ensures the client is closed after all tests in this file complete.
    // The testDb function already handles clearing the database per test or beforeAll as needed.
    if (client) { // Ensure client exists before attempting to close
      console.log("Closing database connection after all RecipeConcept tests...");
      await client.close();
    }
  });
});
```
