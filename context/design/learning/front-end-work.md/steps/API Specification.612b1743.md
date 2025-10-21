---
timestamp: 'Mon Oct 20 2025 13:51:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_135149.b2a6ce3e.md]]'
content_id: 612b1743321b23740b329e0623dabc6de5c17d7acccd0507546b11b5ea5d7b5b
---

# API Specification: ScalingTips Concept

**Purpose:** To store, manage, and generate context-specific practical tips related to scaling recipes, incorporating both manual contributions and AI generation.

***

## API Endpoints

### POST /api/ScalingTips/addManualScalingTip

**Description:** Adds a new scaling tip manually, provided by a user.

**Requirements:**

* `true` (No explicit preconditions provided in the concept description.)

**Effects:**

* A new tip record is created in the concept's state with the provided details.
* The `source` is set to 'manual'.
* The unique `tipId` for the new tip is returned.

**Request Body:**

```json
{
  "cookingMethod": "string",
  "direction": "string",
  "content": "string",
  "addedBy": "string",
  "relatedRecipeId": "string (optional)"
}
```

**Success Response Body (Action):**

```json
{
  "tipId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ScalingTips/requestTipGeneration

**Description:** Requests the generation of context-specific scaling tips using an LLM, based on a provided recipe.

**Requirements:**

* `true` (No explicit preconditions provided in the concept description.)

**Effects:**

* Internally calls the LLM client to generate tips based on the `recipeGenerationContext`.
* Stores the generated tips in the concept's state, marking them with `source: 'generated'`.
* The `relatedRecipeId` and `generatedContextHash` are set for context.
* Returns a list of `tipId`s for the newly generated tips.

**Request Body:**

```json
{
  "recipeGenerationContext": {
    "recipeId": "string",
    "author": "string",
    "name": "string",
    "originalServings": "number",
    "ingredients": [
      {
        "name": "string",
        "quantity": "number",
        "unit": "string",
        "preparation": "string (optional)"
      }
    ],
    "cookingMethods": [
      "string"
    ]
  }
}
```

**Success Response Body (Action):**

```json
{
  "generatedTipIds": [
    "string"
  ]
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/ScalingTips/removeScalingTip

**Description:** Removes a specific scaling tip from the system.

**Requirements:**

* `true` (No explicit preconditions provided in the concept description.)

**Effects:**

* The tip identified by `tipId` is removed from the concept's state.

**Request Body:**

```json
{
  "tipId": "string"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

This API specification adheres to the rules you provided, defining endpoints, HTTP methods, data formats, and response structures for each action and query within your `Recipe`, `RecipeScaler`, and `ScalingTips` concepts.

Let me know if you have any other concepts you'd like me to document, or if you need any adjustments to this output!
