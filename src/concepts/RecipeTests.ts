import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "jsr:@std/assert";
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
      name: "Apple Pie",
      originalServings: 8,
      ingredients: [
        {
          name: "Apples",
          quantity: 6,
          unit: "medium",
          scalingContext: "fruit",
        },
        {
          name: "Pie Crust",
          quantity: 2,
          unit: "sheets",
          scalingContext: "base",
        },
        { name: "Cinnamon", quantity: 1, unit: "tsp", scalingContext: "spice" },
      ],
      cookingMethods: [
        "Prepare pie crust",
        "Slice apples and mix with cinnamon",
        "Fill crust and bake",
      ],
    });
    assertNotEquals(
      "error" in addResult,
      true,
      `addRecipe failed with error: ${(addResult as { error: string }).error}`,
    );
    const { recipe: applePieId } = addResult as { recipe: Recipe };
    assertExists(applePieId, "A recipe ID should be returned.");

    // Principle Step 2: Stores recipes to be accessed by scaler or tipsPage (implies retrievable)
    // Access the recipe by its ID
    const fetchedRecipeById = await recipeConcept._getRecipeById({
      recipeId: applePieId,
    });
    assertExists(
      fetchedRecipeById,
      "Apple Pie should be retrievable by its ID.",
    );
    assertEquals(fetchedRecipeById.name, "Apple Pie");
    assertEquals(fetchedRecipeById.author, authorAlice);
    assertEquals(fetchedRecipeById.originalServings, 8);
    assertEquals(fetchedRecipeById.ingredients.length, 3);
    assertEquals(fetchedRecipeById.cookingMethods.length, 3);

    // Access the recipe by name and author
    const fetchedRecipeByName = await recipeConcept._getRecipeByName({
      recipeName: "Apple Pie",
      author: authorAlice,
    });
    assertExists(
      fetchedRecipeByName,
      "Apple Pie should be retrievable by name and author.",
    );
    assertEquals(fetchedRecipeByName._id, applePieId);

    // Access all recipes by the author (should include only the apple pie)
    const fetchedRecipeByAuthor = await recipeConcept._getRecipesByAuthor({
      author: authorAlice,
    });
    assert(
      fetchedRecipeByAuthor.some((r) => r._id === applePieId),
      "Apple Pie should be in Alice's list of recipes.",
    );
    assertEquals(
      fetchedRecipeByAuthor.length,
      1,
      "Alice should have exactly one recipe stored.",
    );
  } finally {
    await client.close(); // Close the database connection for this test
  }
});

// --- Action: addRecipe specific tests ---
Deno.test("addRecipe: should successfully add a new recipe", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const result = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Classic Chocolate Chip Cookies",
      originalServings: 12,
      ingredients: mockIngredients,
      cookingMethods: mockCookingMethods,
    });

    assertNotEquals(
      "error" in result,
      true,
      `addRecipe failed with error: ${(result as { error: string }).error}`,
    );
    const newRecipeId = (result as { recipe: Recipe }).recipe;
    assertExists(newRecipeId, "Should return a recipe ID on success");

    const fetchedRecipe = await recipeConcept._getRecipeById({
      recipeId: newRecipeId,
    });
    assertExists(
      fetchedRecipe,
      "The added recipe should be retrievable by its ID",
    );
    assertEquals(fetchedRecipe.name, "Classic Chocolate Chip Cookies");
    assertEquals(fetchedRecipe.author, authorAlice);
    assertEquals(fetchedRecipe.originalServings, 12);
    assertEquals(fetchedRecipe.ingredients.length, mockIngredients.length);
    assertEquals(
      fetchedRecipe.cookingMethods.length,
      mockCookingMethods.length,
    );
  } finally {
    await client.close();
  }
});

Deno.test("addRecipe: should return an error if originalServings is 0 or less", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const resultZero = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Zero Servings Test",
      originalServings: 0,
      ingredients: mockIngredients,
      cookingMethods: mockCookingMethods,
    });
    assertExists(
      (resultZero as { error: string }).error,
      "Should return an error for 0 servings",
    );
    assertEquals(
      (resultZero as { error: string }).error,
      "originalServings must be greater than 0.",
    );

    const resultNegative = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Negative Servings Test",
      originalServings: -5,
      ingredients: mockIngredients,
      cookingMethods: mockCookingMethods,
    });
    assertExists(
      (resultNegative as { error: string }).error,
      "Should return an error for negative servings",
    );
    assertEquals(
      (resultNegative as { error: string }).error,
      "originalServings must be greater than 0.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("addRecipe: should return an error if originalServings is not an integer", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const result = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Non-Integer Servings Test",
      originalServings: 8.5,
      ingredients: mockIngredients,
      cookingMethods: mockCookingMethods,
    });
    assertExists(
      (result as { error: string }).error,
      "Should return an error for non-integer servings",
    );
    assertEquals(
      (result as { error: string }).error,
      "originalServings must be an integer.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("addRecipe: should return an error if ingredients list is empty", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const result = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Empty Ingredients Test",
      originalServings: 4,
      ingredients: [], // Empty ingredients list
      cookingMethods: mockCookingMethods,
    });
    assertExists(
      (result as { error: string }).error,
      "Should return an error for empty ingredients",
    );
    assertEquals(
      (result as { error: string }).error,
      "Recipe must have at least one ingredient.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("addRecipe: should return an error if recipe name already exists for the same author", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Duplicate Name Test Recipe",
      originalServings: 4,
      ingredients: mockIngredients,
      cookingMethods: mockCookingMethods,
    });

    const result = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Duplicate Name Test Recipe", // Same name
      originalServings: 6,
      ingredients: mockIngredients,
      cookingMethods: ["Another method"],
    });
    assertExists(
      (result as { error: string }).error,
      "Should return an error for duplicate recipe name by same author",
    );
    assertEquals(
      (result as { error: string }).error,
      "A recipe named 'Duplicate Name Test Recipe' already exists for this author.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("addRecipe: should allow the same recipe name for different authors", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const result1 = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Shared Recipe Name",
      originalServings: 4,
      ingredients: mockIngredients,
      cookingMethods: mockCookingMethods,
    });
    assertNotEquals(
      "error" in result1,
      true,
      `addRecipe for Alice failed with error: ${
        (result1 as { error: string }).error
      }`,
    );
    assertExists((result1 as { recipe: Recipe }).recipe);

    const result2 = await recipeConcept.addRecipe({
      author: authorBob, // Different author
      name: "Shared Recipe Name", // Same name
      originalServings: 2,
      ingredients: mockIngredients,
      cookingMethods: mockCookingMethods,
    });
    assertNotEquals(
      "error" in result2,
      true,
      `addRecipe for Bob failed with error: ${
        (result2 as { error: string }).error
      }`,
    );
    assertExists((result2 as { recipe: Recipe }).recipe);
    assertNotEquals(
      (result1 as { recipe: Recipe }).recipe,
      (result2 as { recipe: Recipe }).recipe,
      "Recipes by different authors should have distinct IDs",
    );
  } finally {
    await client.close();
  }
});

// --- Action: removeRecipe specific tests ---
Deno.test("removeRecipe: should successfully remove an existing recipe", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const addResult = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Recipe To Be Removed",
      originalServings: 4,
      ingredients: mockIngredients,
      cookingMethods: mockCookingMethods,
    });
    const recipeIdToRemove = (addResult as { recipe: Recipe }).recipe;
    assertExists(
      recipeIdToRemove,
      "Recipe should be added successfully before removal test",
    );

    const removeResult = await recipeConcept.removeRecipe({
      recipeId: recipeIdToRemove,
    });
    assertEquals(
      "error" in removeResult,
      false,
      `removeRecipe failed with error: ${
        (removeResult as { error: string }).error
      }`,
    );
    assertEquals(
      removeResult,
      {},
      "Should return an empty object on successful removal",
    );

    const fetchedRecipe = await recipeConcept._getRecipeById({
      recipeId: recipeIdToRemove,
    });
    assertEquals(
      fetchedRecipe,
      null,
      "The removed recipe should no longer be found",
    );
  } finally {
    await client.close();
  }
});

Deno.test("removeRecipe: should return an error if attempting to remove a non-existent recipe", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const nonExistentRecipeId = "non-existent-recipe-123" as Recipe;
    const removeResult = await recipeConcept.removeRecipe({
      recipeId: nonExistentRecipeId,
    });
    assertExists(
      (removeResult as { error: string }).error,
      "Should return an error for non-existent recipe",
    );
    assertEquals(
      (removeResult as { error: string }).error,
      `Recipe with ID ${nonExistentRecipeId} not found.`,
      "Error message should indicate recipe not found",
    );
  } finally {
    await client.close();
  }
});

// --- Query: _getRecipeById specific tests ---
Deno.test("_getRecipeById: should return the correct recipe if it exists", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const addResult = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Alice's Famous Lasagna",
      originalServings: 6,
      ingredients: [{ name: "Pasta", quantity: 500, unit: "g" }],
      cookingMethods: ["Layer", "Bake"],
    });
    const aliceRecipeId = (addResult as { recipe: Recipe }).recipe;
    assertExists(aliceRecipeId, "Setup: Alice's recipe should be added");

    const fetchedRecipe = await recipeConcept._getRecipeById({
      recipeId: aliceRecipeId,
    });
    assertExists(fetchedRecipe, "Should find Alice's lasagna by ID");
    assertEquals(fetchedRecipe._id, aliceRecipeId);
    assertEquals(fetchedRecipe.name, "Alice's Famous Lasagna");
    assertEquals(fetchedRecipe.author, authorAlice);
  } finally {
    await client.close();
  }
});

Deno.test("_getRecipeById: should return null if the recipe ID does not exist", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const nonExistentId = "non-existent-recipe-id-456" as Recipe;
    const fetchedRecipe = await recipeConcept._getRecipeById({
      recipeId: nonExistentId,
    });
    assertEquals(
      fetchedRecipe,
      null,
      "Should return null for a non-existent recipe ID",
    );
  } finally {
    await client.close();
  }
});

// --- Query: _getRecipesByAuthor specific tests ---
Deno.test("_getRecipesByAuthor: should return all recipes for a given author", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const r1 = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Alice's Famous Lasagna",
      originalServings: 6,
      ingredients: [{ name: "Pasta", quantity: 500, unit: "g" }],
      cookingMethods: ["Layer", "Bake"],
    });
    const aliceRecipe1Id = (r1 as { recipe: Recipe }).recipe;
    const r2 = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Alice's Quick Salad",
      originalServings: 2,
      ingredients: [{ name: "Lettuce", quantity: 1, unit: "head" }],
      cookingMethods: ["Chop", "Toss"],
    });
    const aliceRecipe2Id = (r2 as { recipe: Recipe }).recipe;
    const r3 = await recipeConcept.addRecipe({
      author: authorBob,
      name: "Bob's Beef Stew",
      originalServings: 8,
      ingredients: [{ name: "Beef", quantity: 1, unit: "kg" }],
      cookingMethods: ["Sear", "Simmer"],
    });
    const bobRecipe1Id = (r3 as { recipe: Recipe }).recipe;

    assertExists(aliceRecipe1Id, "Setup: Alice recipe 1 should be added");
    assertExists(aliceRecipe2Id, "Setup: Alice recipe 2 should be added");
    assertExists(bobRecipe1Id, "Setup: Bob recipe 1 should be added");

    const aliceRecipes = await recipeConcept._getRecipesByAuthor({
      author: authorAlice,
    });
    assertEquals(aliceRecipes.length, 2, "Alice should have 2 recipes");
    assert(
      aliceRecipes.some((r) => r._id === aliceRecipe1Id),
      "Alice's lasagna should be in her list",
    );
    assert(
      aliceRecipes.some((r) => r._id === aliceRecipe2Id),
      "Alice's salad should be in her list",
    );

    const bobRecipes = await recipeConcept._getRecipesByAuthor({
      author: authorBob,
    });
    assertEquals(bobRecipes.length, 1, "Bob should have 1 recipe");
    assert(
      bobRecipes.some((r) => r._id === bobRecipe1Id),
      "Bob's beef stew should be in his list",
    );
  } finally {
    await client.close();
  }
});

Deno.test("_getRecipesByAuthor: should return an empty array if the author has no recipes", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const charlieRecipes = await recipeConcept._getRecipesByAuthor({
      author: authorCharlie,
    });
    assertEquals(charlieRecipes.length, 0, "Charlie should have 0 recipes");
  } finally {
    await client.close();
  }
});

// --- Query: _getRecipeByName specific tests ---
Deno.test("_getRecipeByName: should return the correct recipe when name and author match", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const addResult = await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Alice's Famous Lasagna",
      originalServings: 6,
      ingredients: [{ name: "Pasta", quantity: 500, unit: "g" }],
      cookingMethods: ["Layer", "Bake"],
    });
    const aliceRecipeId = (addResult as { recipe: Recipe }).recipe;
    assertExists(aliceRecipeId, "Setup: Alice's recipe should be added");

    const fetchedRecipe = await recipeConcept._getRecipeByName({
      recipeName: "Alice's Famous Lasagna",
      author: authorAlice,
    });
    assertExists(
      fetchedRecipe,
      "Should find Alice's lasagna by name and author",
    );
    assertEquals(fetchedRecipe._id, aliceRecipeId);
    assertEquals(fetchedRecipe.name, "Alice's Famous Lasagna");
    assertEquals(fetchedRecipe.author, authorAlice);
  } finally {
    await client.close();
  }
});

Deno.test("_getRecipeByName: should return null if the name exists but the author does not match", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    await recipeConcept.addRecipe({
      author: authorAlice,
      name: "Alice's Famous Lasagna",
      originalServings: 6,
      ingredients: [],
      cookingMethods: [],
    });

    // Attempt to find Alice's recipe by Bob
    const fetchedRecipe = await recipeConcept._getRecipeByName({
      recipeName: "Alice's Famous Lasagna",
      author: authorBob,
    });
    assertEquals(
      fetchedRecipe,
      null,
      "Bob should not find Alice's recipe by name",
    );
  } finally {
    await client.close();
  }
});

Deno.test("_getRecipeByName: should return null if the recipe name does not exist", async () => {
  const [db, client] = await testDb();
  const recipeConcept = new RecipeConcept(db);
  try {
    const fetchedRecipe = await recipeConcept._getRecipeByName({
      recipeName: "Non Existent Recipe Name",
      author: authorAlice,
    });
    assertEquals(
      fetchedRecipe,
      null,
      "Should return null for a non-existent recipe name",
    );
  } finally {
    await client.close();
  }
});
