---
timestamp: 'Tue Nov 04 2025 17:47:11 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251104_174711.fa4afb8f.md]]'
content_id: b519d2c7a156250a283ad42eaeda13f19bfaefe7e678c72f0dfb2dbf86c3eaeb
---

# response:

The `RequestingConcept` acts as a crucial API gateway, translating external HTTP requests into internal concept actions and waiting for the results to be returned to the client. The core mechanism involves two main actions within `Requesting`:

1. **`Requesting.request`**: Triggered by an incoming HTTP POST request, it logs the request and creates a `PendingRequest` promise. It returns a `request` ID.
2. **`Requesting._awaitResponse`**: Immediately called after `Requesting.request`, this method waits for the `PendingRequest` promise to resolve, up to a timeout.
3. **`Requesting.respond`**: This is the critical internal action that *resolves* the `PendingRequest` promise, effectively sending the response back to `_awaitResponse` and then to the HTTP client.

Therefore, for any concept action or query you want to expose through `RequestingConcept`, you'll typically need a two-part sync (or "recipe"):

* **Part 1 (Triggering the concept action):** Observes `Requesting.request` (filtered by the `path`) and calls the corresponding concept's action or query.
* **Part 2 (Responding to the client):** Observes the *output* of that concept's action/query and calls `Requesting.respond` with the original `request` ID and the result.

Let's break this down for `LikertSurveyConcept` and then generalize for your other concepts.

***

### Syncs for `LikertSurveyConcept`

For each public method (`action` or `query`) in `LikertSurveyConcept`, we'll define a pair of syncs. Note that even queries are handled via POST requests by the `RequestingConcept`.

#### General Structure for a LikertSurvey Sync

```typescript
// Recipe to handle external API request for LikertSurvey.createSurvey
concept.on("Requesting.request", (request) => {
  // Filter for requests specifically targeting 'createSurvey'
  if (request.input.path === "/LikertSurvey/createSurvey") {
    const { author, title, scaleMin, scaleMax } = request.input;
    // Call the actual concept action
    concept.set("LikertSurvey.createSurvey", {
      _requestingId: request._id, // Pass the original requesting ID for later response
      author,
      title,
      scaleMin,
      scaleMax,
    });
  }
});

// Recipe to respond to the client once LikertSurvey.createSurvey completes
concept.on("LikertSurvey.createSurvey", (output) => {
  if (output._requestingId) { // Check if it was initiated by RequestingConcept
    concept.set("Requesting.respond", {
      request: output._requestingId,
      // Map the output to the HTTP response
      ...output,
      _requestingId: undefined, // Clean up internal ID before sending
    });
  }
});
```

***

#### Specific Sync Recommendations for `LikertSurveyConcept`

Here are the specific syncs for each action/query in `LikertSurveyConcept`:

**1. `createSurvey`**

* **API Path:** `/LikertSurvey/createSurvey`
* **Input:** `{ author, title, scaleMin, scaleMax }`
* **Output:** `{ survey: Survey }` or `{ error: string }`

```typescript
// src/recipes/likertSurveyApiRecipes.ts (or similar)

// Sync 1: Requesting.request -> LikertSurvey.createSurvey
concept.on("Requesting.request", (request) => {
  if (request.input.path === "/LikertSurvey/createSurvey") {
    const { author, title, scaleMin, scaleMax } = request.input;
    concept.set("LikertSurvey.createSurvey", {
      _requestingId: request._id, // Preserve original request ID
      author: author as ID,
      title: title as string,
      scaleMin: scaleMin as number,
      scaleMax: scaleMax as number,
    });
  }
});

// Sync 2: LikertSurvey.createSurvey -> Requesting.respond
concept.on("LikertSurvey.createSurvey", (output) => {
  if (output._requestingId) {
    concept.set("Requesting.respond", {
      request: output._requestingId,
      // Pass the actual survey ID or error
      survey: output.survey,
      error: output.error,
      _requestingId: undefined, // Remove internal marker
    });
  }
});
```

**2. `addQuestion`**

* **API Path:** `/LikertSurvey/addQuestion`
* **Input:** `{ survey, text }`
* **Output:** `{ question: Question }` or `{ error: string }`

```typescript
// Sync 1: Requesting.request -> LikertSurvey.addQuestion
concept.on("Requesting.request", (request) => {
  if (request.input.path === "/LikertSurvey/addQuestion") {
    const { survey, text } = request.input;
    concept.set("LikertSurvey.addQuestion", {
      _requestingId: request._id,
      survey: survey as ID,
      text: text as string,
    });
  }
});

// Sync 2: LikertSurvey.addQuestion -> Requesting.respond
concept.on("LikertSurvey.addQuestion", (output) => {
  if (output._requestingId) {
    concept.set("Requesting.respond", {
      request: output._requestingId,
      question: output.question,
      error: output.error,
      _requestingId: undefined,
    });
  }
});
```

**3. `submitResponse`**

* **API Path:** `/LikertSurvey/submitResponse`
* **Input:** `{ respondent, question, value }`
* **Output:** `Empty` (`{}`) or `{ error: string }`

```typescript
// Sync 1: Requesting.request -> LikertSurvey.submitResponse
concept.on("Requesting.request", (request) => {
  if (request.input.path === "/LikertSurvey/submitResponse") {
    const { respondent, question, value } = request.input;
    concept.set("LikertSurvey.submitResponse", {
      _requestingId: request._id,
      respondent: respondent as ID,
      question: question as ID,
      value: value as number,
    });
  }
});

// Sync 2: LikertSurvey.submitResponse -> Requesting.respond
concept.on("LikertSurvey.submitResponse", (output) => {
  if (output._requestingId) {
    concept.set("Requesting.respond", {
      request: output._requestingId,
      // If no error, respond with a success message/status
      message: output.error ? undefined : "Response submitted successfully.",
      error: output.error,
      _requestingId: undefined,
    });
  }
});
```

**4. `updateResponse`**

* **API Path:** `/LikertSurvey/updateResponse`
* **Input:** `{ respondent, question, value }`
* **Output:** `Empty` (`{}`) or `{ error: string }`

```typescript
// Sync 1: Requesting.request -> LikertSurvey.updateResponse
concept.on("Requesting.request", (request) => {
  if (request.input.path === "/LikertSurvey/updateResponse") {
    const { respondent, question, value } = request.input;
    concept.set("LikertSurvey.updateResponse", {
      _requestingId: request._id,
      respondent: respondent as ID,
      question: question as ID,
      value: value as number,
    });
  }
});

// Sync 2: LikertSurvey.updateResponse -> Requesting.respond
concept.on("LikertSurvey.updateResponse", (output) => {
  if (output._requestingId) {
    concept.set("Requesting.respond", {
      request: output._requestingId,
      message: output.error ? undefined : "Response updated successfully.",
      error: output.error,
      _requestingId: undefined,
    });
  }
});
```

**5. `_getSurveyQuestions`** (Query)

* **API Path:** `/LikertSurvey/_getSurveyQuestions`
* **Input:** `{ survey }`
* **Output:** `QuestionDoc[]`

```typescript
// Sync 1: Requesting.request -> LikertSurvey._getSurveyQuestions
concept.on("Requesting.request", (request) => {
  if (request.input.path === "/LikertSurvey/_getSurveyQuestions") {
    const { survey } = request.input;
    concept.set("LikertSurvey._getSurveyQuestions", {
      _requestingId: request._id,
      survey: survey as ID,
    });
  }
});

// Sync 2: LikertSurvey._getSurveyQuestions -> Requesting.respond
concept.on("LikertSurvey._getSurveyQuestions", (output) => {
  if (output._requestingId) {
    concept.set("Requesting.respond", {
      request: output._requestingId,
      questions: output, // The output itself is the array of questions
      _requestingId: undefined,
    });
  }
});
```

**6. `_getSurveyResponses`** (Query)

* **API Path:** `/LikertSurvey/_getSurveyResponses`
* **Input:** `{ survey }`
* **Output:** `ResponseDoc[]`

```typescript
// Sync 1: Requesting.request -> LikertSurvey._getSurveyResponses
concept.on("Requesting.request", (request) => {
  if (request.input.path === "/LikertSurvey/_getSurveyResponses") {
    const { survey } = request.input;
    concept.set("LikertSurvey._getSurveyResponses", {
      _requestingId: request._id,
      survey: survey as ID,
    });
  }
});

// Sync 2: LikertSurvey._getSurveyResponses -> Requesting.respond
concept.on("LikertSurvey._getSurveyResponses", (output) => {
  if (output._requestingId) {
    concept.set("Requesting.respond", {
      request: output._requestingId,
      responses: output, // The output itself is the array of responses
      _requestingId: undefined,
    });
  }
});
```

**7. `_getRespondentAnswers`** (Query)

* **API Path:** `/LikertSurvey/_getRespondentAnswers`
* **Input:** `{ respondent }`
* **Output:** `ResponseDoc[]`

```typescript
// Sync 1: Requesting.request -> LikertSurvey._getRespondentAnswers
concept.on("Requesting.request", (request) => {
  if (request.input.path === "/LikertSurvey/_getRespondentAnswers") {
    const { respondent } = request.input;
    concept.set("LikertSurvey._getRespondentAnswers", {
      _requestingId: request._id,
      respondent: respondent as ID,
    });
  }
});

// Sync 2: LikertSurvey._getRespondentAnswers -> Requesting.respond
concept.on("LikertSurvey._getRespondentAnswers", (output) => {
  if (output._requestingId) {
    concept.set("Requesting.respond", {
      request: output._requestingId,
      answers: output, // The output itself is the array of answers
      _requestingId: undefined,
    });
  }
});
```

***

### General Recommendations for Recipe, RecipeScaler, ScalingTips, and UserAuth Concepts

The same two-part sync pattern applies to your other concepts.

**For each public action or query in `Recipe`, `RecipeScaler`, `ScalingTips`, and `UserAuth`:**

1. **Identify the API Path:** This will typically be `/{ConceptName}/{actionName}` (e.g., `/Recipe/createRecipe`, `/UserAuth/login`).
2. **Determine Inputs:** What arguments does the concept method expect?
3. **Determine Outputs:** What does the concept method return (data, success/error object, `Empty` etc.)?

**Then, create two syncs for each:**

#### **Sync 1: API Request to Concept Action**

```typescript
// Example for a hypothetical Recipe.createRecipe action
concept.on("Requesting.request", (request) => {
  if (request.input.path === "/Recipe/createRecipe") {
    // Extract specific inputs from request.input (which is the HTTP request body + path)
    const { name, ingredients, instructions, authorId } = request.input;
    concept.set("Recipe.createRecipe", {
      _requestingId: request._id, // IMPORTANT: Pass the Requesting ID
      name: name as string,
      ingredients: ingredients as string[],
      instructions: instructions as string,
      authorId: authorId as ID,
    });
  }
  // Add similar blocks for other Recipe actions/queries
  // Add similar blocks for RecipeScaler, ScalingTips, UserAuth actions/queries
  // e.g., if (request.input.path === "/UserAuth/login") { ... }
});
```

#### **Sync 2: Concept Action Output to API Response**

```typescript
// Example for the response from Recipe.createRecipe
concept.on("Recipe.createRecipe", (output) => {
  if (output._requestingId) { // Check if this output is tied to an API request
    concept.set("Requesting.respond", {
      request: output._requestingId, // Use the original Requesting ID
      // Map the output of the Recipe.createRecipe action to the HTTP response
      recipeId: output.recipeId, // If createRecipe returns an ID
      error: output.error, // If createRecipe can return an error
      message: output.error ? undefined : "Recipe created successfully.", // For Empty outputs
      _requestingId: undefined, // Clean up the internal marker
    });
  }
});

// Add similar blocks for other Recipe action/query outputs
// Add similar blocks for RecipeScaler, ScalingTips, UserAuth action/query outputs
// e.g., concept.on("UserAuth.login", (output) => { ... })
```

***

### Important Considerations:

1. **`_requestingId` Convention:** I've used `_requestingId` as a convention to pass the original `Requesting.request` ID through your concept actions/queries. This allows the second sync to know which `Requesting.respond` call to make. Ensure your concept methods can accept and return this extra property if you want to use this pattern. If your concept methods cannot accept arbitrary extra properties, you might need a slightly more complex sync pattern that uses a temporary concept state to store the mapping between concept action inputs/outputs and the `_requestingId`. However, adding `_requestingId` as an optional input/output is generally the simplest.

2. **Input Type Coercion:** The `request.input` will contain raw JSON values. You'll need to cast them to the correct types (`as ID`, `as string`, `as number`, `as string[]`, etc.) before passing them to your concept's methods.

3. **Output Mapping:** Pay attention to what your concept methods return.
   * If they return a specific object (e.g., `{ survey: ID }`), pass that object.
   * If they return an array (e.g., `QuestionDoc[]`), you might want to wrap it in a named property (e.g., `{ questions: output }`).
   * If they return `Empty` (`{}`), you should generally return a success message or a specific status to the client, possibly checking for an `error` property first.
   * Always include `error: output.error` if your concept methods return errors this way.

4. **`passthrough.ts` and Exclusions/Inclusions:**
   The `RequestingConcept` code includes a section for "Passthrough Routes" based on `exclusions` and `inclusions` in `passthrough.ts`.
   * If a route is listed in `exclusions`, `Requesting` will *not* create a direct passthrough route for it. This is good if you want `Requesting` to fully manage that endpoint through your syncs.
   * If a route is *not* in `exclusions` and `Requesting` creates a direct passthrough route (which it does by default for all concept methods), then your custom `Requesting.request` syncs for that route might conflict or be redundant.
   * **Recommendation:** For any route you want `RequestingConcept` to *orchestrate* via these two-part syncs, ensure that the corresponding path (`/ConceptName/methodName`) is either **explicitly excluded** in `passthrough.ts` or that you rely *only* on the `Requesting` path and *do not* want a direct passthrough. The current setup will default to passthrough, so if you want orchestration, you might need to add paths to `exclusions`.

By following this pattern, you can effectively expose all your concept's actions and queries as API endpoints through the `RequestingConcept`, leveraging its request logging, timeout handling, and unified API gateway functionality.
