---
timestamp: 'Mon Oct 20 2025 13:51:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251020_135149.b2a6ce3e.md]]'
content_id: c77c4caccad078ec5b2cabeec2715724b622ad73d125507005ffd8b75894d4f4
---

# API Specification: Recipe Concept

**Purpose:** To manage the definition and storage of cooking recipes.

***

## API Endpoints

### POST /api/Recipe/addRecipe

**Description:** Adds a new canonical recipe definition to the system, associating it with an author.

**Requirements:**

* `true` (No explicit preconditions provided in the concept description.)

**Effects:**

* A new recipe record is created in the concept's state.
* The new recipe is associated with the provided author, name, serving size, ingredients, and cooking methods.
* The unique `recipeId` for the new recipe is returned.

**Request Body:**

```json
{
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
```

**Success Response Body (Action):**

```json
{
  "recipeId": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Recipe/removeRecipe

**Description:** Removes a recipe definition from the system using its unique identifier.

**Requirements:**

* `true` (No explicit preconditions provided in the concept description.)

**Effects:**

* The recipe identified by `recipeId` is removed from the concept's state.

**Request Body:**

```json
{
  "recipeId": "string"
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
