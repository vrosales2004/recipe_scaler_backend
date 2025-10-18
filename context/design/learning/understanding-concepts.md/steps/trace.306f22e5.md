---
timestamp: 'Fri Oct 17 2025 14:27:55 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_142755.88ac23a9.md]]'
content_id: 306f22e5dd5a4b32cf8aeaac0bc0dcbea3e6db2d1add2697df9df921eb4a3533
---

# trace:

The following trace demonstrates how the **principle** of the `Recipe` concept is fulfilled by a sequence of actions, specifically focusing on adding a recipe and then accessing it.

1. **Given**: An author `user:Alice` is ready to add a new recipe to their collection.
2. **Action**: `user:Alice` adds a recipe named "Spicy Chicken Stir-fry" with its original servings, ingredients, and cooking methods.
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
4. **Action**: Later, `user:Alice` (or another system component, like `RecipeScaler` or `ScalingTips`) wants to access this recipe as a complete, definitive record. They retrieve it by its ID.
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
