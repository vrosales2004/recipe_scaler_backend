---
timestamp: 'Fri Oct 17 2025 14:06:12 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_140612.347f8c02.md]]'
content_id: 855b3d5dd5d6baca65ea93a4cd6a3d87f72b6c92bd3f91aad66fbe21b67825b4
---

# trace:

The following trace demonstrates how the **principle** of the `Recipe` concept is fulfilled by a sequence of actions, specifically focusing on adding a recipe and then accessing it.

1. **Given**: An author `authorAlice` is ready to add a new recipe to their collection.
2. **Action**: `authorAlice` adds a recipe named "Spicy Chicken Stir-fry" with its original servings, ingredients, and cooking methods.
   ```
   Recipe.addRecipe({
     author: "user:Alice",
     name: "Spicy Chicken Stir-fry",
     originalServings: 4,
     ingredients: [
       { name: "Chicken Breast", quantity: 500, unit: "g", scalingContext: "protein" },
       { name: "Bell Peppers", quantity: 2, unit: "large", scalingContext: "vegetable" },
       { name: "Soy Sauce", quantity: 0.25, unit: "cup", scalingContext: "sauce" },
     ],
     cookingMethods: [
       "Chop chicken and vegetables",
       "Stir-fry chicken until cooked",
       "Add vegetables and sauce, cook until tender-crisp",
     ],
   })
   ```
3. **Result**: The recipe is successfully stored, and its unique ID is returned.
   ```
   { recipe: "recipe:stirfry-abc123" }
   ```
4. **Action**: Later, `authorAlice` (or another system component, like `RecipeScaler` or `ScalingTips`) wants to access this recipe as a complete, definitive record. They retrieve it by its ID.
   ```
   Recipe._getRecipeById({ recipeId: "recipe:stirfry-abc123" })
   ```
5. **Result**: The full recipe details are returned, exactly as they were stored, fulfilling the principle that the recipe is stored and can be accessed later.
   ```
   {
     _id: "recipe:stirfry-abc123",
     author: "user:Alice",
     name: "Spicy Chicken Stir-fry",
     originalServings: 4,
     ingredients: [
       { name: "Chicken Breast", quantity: 500, unit: "g", scalingContext: "protein" },
       { name: "Bell Peppers", quantity: 2, unit: "large", scalingContext: "vegetable" },
       { name: "Soy Sauce", quantity: 0.25, unit: "cup", scalingContext: "sauce" },
     ],
     cookingMethods: [
       "Chop chicken and vegetables",
       "Stir-fry chicken until cooked",
       "Add vegetables and sauce, cook until tender-crisp",
     ],
   }
   ```

This trace confirms that the `addRecipe` action correctly stores the recipe, and the `_getRecipeById` query successfully retrieves it, demonstrating the core functionality of maintaining a recipe collection as per the concept's purpose and principle.
