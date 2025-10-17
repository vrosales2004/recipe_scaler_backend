---
timestamp: 'Thu Oct 16 2025 14:05:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_140530.7e5155b5.md]]'
content_id: 96723b81cd604dfe33d5308ac2b79b46d429e9d2b567b8550a543785f0e59f26
---

# concept: UserAuthentication

* **concept**: UserAuthentication \[User]
* **purpose**: To provide secure mechanisms for users to register, log in, and log out of the application, establishing their identity.
* **principle**: If a user registers with a unique username and password, and then subsequently logs in with those credentials, they will be recognized as an authenticated user, enabling them to access personalized features.
* **state**:
  * A set of `Users` with
    * a `username` of type `String`
    * a `hashedPassword` of type `String`
  * A set of `ActiveSessions` with
    * a `user` of type `User`
    * a `sessionId` of type `String` (e.g., a token, or just the user's ID for simplicity here)
    * an `expiryTime` of type `Number` (Unix timestamp)
* **actions**:
  * `register (username: String, password: String): (user: User) | (error: String)`
    * **requires**: `username` must be unique. `password` must meet complexity requirements (implementation detail).
    * **effects**: Creates a new `User` record, stores a hashed password, and returns the new `User` ID.
  * `login (username: String, password: String): (user: User, sessionId: String) | (error: String)`
    * **requires**: `username` and `password` must match an existing user.
    * **effects**: If credentials are valid, creates a new `ActiveSession` for the `User` and returns the `User` ID and `sessionId`.
  * `logout (sessionId: String)`
    * **requires**: `sessionId` must correspond to an active session.
    * **effects**: Deletes the `ActiveSession` record.

*(For brevity, I won't provide the full `UserAuthenticationConcept.ts` implementation, but it would follow the `LikertSurveyConcept` pattern for collections, actions, and error handling.)*

***

### Step 2: Understand the Connection

The `UserAuthentication` concept will issue `User` IDs (which are `ID` type). Your `Recipe` concept expects an `Author` (also `ID` type). **These are compatible!**

When a user logs in via `UserAuthentication`, they get back a `User` ID. This `User` ID is exactly what you will pass as the `Author` ID to the `Recipe` concept's actions (`addRecipe`, `editRecipe`).

***

### Step 3: Compose with Synchronizations (Syncs)

Now, to make them work together, you'll use `syncs`. Let's imagine a `Request` concept (or a pseudo-concept representing direct user input) that captures what a user *wants* to do.

#### Example 1: A User Adds a Recipe

This sync connects the user's intention (via a `Request`) with their authenticated identity (from `UserAuthentication`) to the `Recipe` concept.

```
sync AuthenticatedRecipeAddition
when
    Request.addRecipe (sessionId: String, name: String, originalServings: Number, ingredients: IngredientData[], cookingMethods: String[])
where
    // Check if the sessionId is valid and retrieve the associated User
    in UserAuthentication:
        user of ActiveSession with sessionId is authenticatedUser
then
    Recipe.addRecipe (
        author: authenticatedUser,
        name: name,
        originalServings: originalServings,
        ingredients: ingredients,
        cookingMethods: cookingMethods
    )
```

**Explanation:**

* `Request.addRecipe`: This is the user's intent to add a recipe. It provides all the recipe details and the `sessionId` from their current login.
* `where in UserAuthentication`: This clause *queries the state* of the `UserAuthentication` concept. It checks if there's an `ActiveSession` matching the `sessionId` provided in the request, and if so, it extracts the `user` ID associated with that session. This `user` ID becomes `authenticatedUser`.
* `then Recipe.addRecipe`: If the `where` clause is satisfied (meaning the user is authenticated), the `addRecipe` action of the `Recipe` concept is triggered. The `authenticatedUser` ID (which is of type `User` from `UserAuthentication`) is passed directly as the `author` (which is of type `Author` from `Recipe`). Since `User` and `Author` are both `ID`, this works seamlessly.

#### Example 2: A User Edits Their Own Recipe

This sync combines authentication with ownership verification.

```
sync AuthenticatedRecipeEdit
when
    Request.editRecipe (sessionId: String, recipeId: Recipe, newName: String?, newOriginalServings: Number?, newIngredients: IngredientData[]?, newCookingMethods: String[]?)
where
    // 1. Check if the sessionId is valid and retrieve the associated User
    in UserAuthentication:
        user of ActiveSession with sessionId is authenticatedUser
    // 2. Check if the authenticated user is the author of the recipe
    in Recipe:
        author of recipeId is authenticatedUser // This is the crucial ownership check
then
    Recipe.editRecipe (
        recipeId: recipeId,
        newName: newName,
        newOriginalServings: newOriginalServings,
        newIngredients: newIngredients,
        newCookingMethods: newCookingMethods
    )
```

**Explanation:**

* The `where` clause now has two conditions:
  1. It verifies the user's `sessionId` to ensure they are logged in, just like before.
  2. It then queries the `Recipe` concept's state (`author of recipeId is authenticatedUser`) to ensure that the currently authenticated user (`authenticatedUser`) is indeed the `author` of the `recipeId` they are trying to edit.
* Only if *both* conditions are met (authenticated AND owns the recipe) will the `Recipe.editRecipe` action be called.

***

### Key Takeaways for this Integration:

1. **Polymorphic IDs:** By using generic `ID` types for `Author` in `Recipe` and `User` in `UserAuthentication`, you achieve complete independence. `Recipe` doesn't need to know `UserAuthentication` exists to define its own behavior.
2. **Separation of Concerns:**
   * `UserAuthentication` manages *who* a user is and if they're logged in. It doesn't know about recipes.
   * `Recipe` manages the *definition and ownership* of recipes. It doesn't know about login credentials.
3. **Composition by Synchronization:** `Syncs` are the glue that connect these independent concepts, providing the necessary contextual information (like the authenticated `User` ID and ownership checks) to trigger actions in a controlled and meaningful way.
4. **Completeness:** Each concept remains complete within its own domain. `UserAuthentication` completely handles authentication. `Recipe` completely handles recipe definition and its inherent ownership. The interaction logic resides in the `syncs`, not scattered within the concepts themselves.

This approach allows you to build a highly modular application where individual features are encapsulated in concepts, and their interactions are clearly defined and centralized in syncs.
