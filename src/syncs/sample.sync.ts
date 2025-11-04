/**
 * Sample synchronizations: feel free to delete this entire file!
 */

import {
  LikertSurvey,
  Recipe,
  RecipeScaler,
  Requesting,
  ScalingTips,
  UserAuthentication,
} from "@concepts";
import { actions, Frames, Sync } from "@engine";

// ===== LikertSurvey Syncs =====

export const CreateSurveyRequest: Sync = (
  { request, author, title, scaleMin, scaleMax },
) => ({
  when: actions([
    Requesting.request,
    { path: "/LikertSurvey/createSurvey", author, title, scaleMin, scaleMax },
    { request },
  ]),
  then: actions([LikertSurvey.createSurvey, {
    author,
    title,
    scaleMin,
    scaleMax,
  }]),
});

export const CreateSurveyResponse: Sync = ({ request, survey }) => ({
  when: actions(
    [Requesting.request, { path: "/LikertSurvey/createSurvey" }, { request }],
    [LikertSurvey.createSurvey, {}, { survey }],
  ),
  then: actions([Requesting.respond, { request, survey }]),
});

export const AddQuestionRequest: Sync = ({ request, survey, text }) => ({
  when: actions([
    Requesting.request,
    { path: "/LikertSurvey/addQuestion", survey, text },
    { request },
  ]),
  then: actions([LikertSurvey.addQuestion, { survey, text }]),
});

export const AddQuestionResponse: Sync = ({ request, question }) => ({
  when: actions(
    [Requesting.request, { path: "/LikertSurvey/addQuestion" }, { request }],
    [LikertSurvey.addQuestion, {}, { question }],
  ),
  then: actions([Requesting.respond, { request, question }]),
});

// ===== RecipeScaler Syncs =====

/**
 * Authenticated Recipe Creation
 * Validates that the user has an active session before allowing recipe creation.
 * The frontend should send sessionId in the request body.
 */
export const AuthenticatedRecipeCreation: Sync = ({
  request,
  sessionId,
  name,
  originalServings,
  ingredients,
  cookingMethods,
  authenticatedUser,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/Recipe/addRecipe",
      sessionId,
      name,
      originalServings,
      ingredients,
      cookingMethods,
    },
    { request },
  ]),
  where: async (frames: Frames) => {
    // Validate session and extract user
    // SessionDoc has 'user' property, map it to authenticatedUser symbol
    const withSession = await frames.queryAsync(
      UserAuthentication._getActiveSession,
      { sessionId },
      { user: authenticatedUser },
    );
    // Only proceed if session is valid (user is authenticated)
    return withSession.filter((frame) =>
      frame[authenticatedUser] !== undefined
    );
  },
  then: actions([
    Recipe.addRecipe,
    {
      author: authenticatedUser,
      name,
      originalServings,
      ingredients,
      cookingMethods,
    },
  ]),
});

export const AuthenticatedRecipeCreationResponse: Sync = ({
  request,
  recipe,
}) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/addRecipe" }, { request }],
    [Recipe.addRecipe, {}, { recipe }],
  ),
  then: actions([Requesting.respond, { request, recipe }]),
});

/**
 * Error response for recipe creation (when action returns error)
 */
export const RecipeCreationErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/addRecipe" }, { request }],
    [Recipe.addRecipe, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Authentication Failure Response for Recipe Creation
 * Responds with an error when authentication fails for recipe creation requests.
 * This prevents timeouts when sessionId is invalid or missing.
 */
export const RecipeCreationAuthenticationFailure: Sync = ({
  request,
  sessionId,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/addRecipe", sessionId },
    { request },
  ]),
  where: async (frames: Frames) => {
    // For each frame, check if session is valid
    // If query returns empty, authentication failed
    const withSession = await frames.queryAsync(
      UserAuthentication._getActiveSession,
      { sessionId },
      {},
    );
    // If no valid sessions found, authentication failed - return frames to trigger error
    // If sessions found, authentication succeeded - return empty to let other sync handle
    if (withSession.length === 0 && frames.length > 0) {
      return frames; // Authentication failed
    }
    return new Frames(); // Authentication succeeded, let AuthenticatedRecipeCreation handle
  },
  then: actions([
    Requesting.respond,
    { request, error: "Authentication failed: Invalid or expired session." },
  ]),
});

/**
 * Auto-generate Tips when AI Scaling Completes
 * Automatically generates scaling tips after a recipe is scaled using AI.
 * This chains the scaling action with tip generation.
 * Note: This requires the scaleRecipeAI action to include baseRecipeId and targetServings in its output,
 * or we need to query the scaled recipe to get these values.
 */
export const AutoGenerateTipsOnAIScaling: Sync = ({
  scaledRecipeId,
  baseRecipeId,
  targetServings,
  recipeName,
  originalServings,
  ingredients,
  cookingMethods,
}) => ({
  when: actions([
    RecipeScaler.scaleRecipeAI,
    { baseRecipeId, targetServings },
    { scaledRecipeId },
  ]),
  where: async (frames: Frames) => {
    // Get the scaled recipe to extract baseRecipeId and targetServings
    // ScaledRecipeDoc has 'baseRecipeId' and 'targetServings' properties
    const withScaledRecipe = await frames.queryAsync(
      RecipeScaler._getScaledRecipe,
      { scaledRecipeId },
      { baseRecipeId, targetServings },
    );
    // For each scaled recipe, get the base recipe details
    // RecipeDoc has 'name', 'originalServings', 'ingredients', 'cookingMethods' properties
    const withRecipe = await withScaledRecipe.queryAsync(
      Recipe._getRecipeById,
      { recipeId: baseRecipeId },
      {
        name: recipeName,
        originalServings,
        ingredients,
        cookingMethods,
      },
    );
    return withRecipe;
  },
  then: actions([
    ScalingTips.requestTipGeneration,
    {
      recipeContext: {
        recipeId: baseRecipeId,
        name: recipeName,
        originalServings,
        targetServings,
        ingredients,
        cookingMethods,
      },
    },
  ]),
});

/**
 * Authenticated Recipe Scaling
 * Validates that the user has an active session before allowing recipe scaling.
 * The frontend should send sessionId in the request body.
 */
export const AuthenticatedScaling: Sync = ({
  request,
  sessionId,
  baseRecipeId,
  targetServings,
  authenticatedUser,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/RecipeScaler/scaleManually",
      sessionId,
      baseRecipeId,
      targetServings,
    },
    { request },
  ]),
  where: async (frames: Frames) => {
    // Validate session and extract user
    // SessionDoc has 'user' property, map it to authenticatedUser symbol
    const withSession = await frames.queryAsync(
      UserAuthentication._getActiveSession,
      { sessionId },
      { user: authenticatedUser },
    );
    // Only proceed if session is valid
    return withSession.filter((frame) =>
      frame[authenticatedUser] !== undefined
    );
  },
  then: actions([
    RecipeScaler.scaleManually,
    { baseRecipeId, targetServings },
  ]),
});

// Success response for manual scaling
export const AuthenticatedScalingResponse: Sync = ({
  request,
  scaledRecipeId,
}) => ({
  when: actions(
    [Requesting.request, { path: "/RecipeScaler/scaleManually" }, { request }],
    [RecipeScaler.scaleManually, {}, { scaledRecipeId }],
  ),
  then: actions([Requesting.respond, { request, scaledRecipeId }]),
});

// Error response for manual scaling (when action returns error)
export const ScalingErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/RecipeScaler/scaleManually" }, { request }],
    [RecipeScaler.scaleManually, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Authentication Failure Response for Scaling
 * Responds with an error when authentication fails for scaling requests.
 * This prevents timeouts when sessionId is invalid or missing.
 * Note: This sync fires when the session check fails (no valid session found).
 */
export const ScalingAuthenticationFailure: Sync = ({ request, sessionId }) => ({
  when: actions([
    Requesting.request,
    { path: "/RecipeScaler/scaleManually", sessionId },
    { request },
  ]),
  where: async (frames: Frames) => {
    // For each frame, check if session is valid
    // If query returns empty, authentication failed
    const withSession = await frames.queryAsync(
      UserAuthentication._getActiveSession,
      { sessionId },
      {},
    );
    // If no valid sessions found, authentication failed - return frames to trigger error
    // If sessions found, authentication succeeded - return empty to let other sync handle
    if (withSession.length === 0 && frames.length > 0) {
      return frames; // Authentication failed
    }
    return new Frames(); // Authentication succeeded, let AuthenticatedScaling handle
  },
  then: actions([
    Requesting.respond,
    { request, error: "Authentication failed: Invalid or expired session." },
  ]),
});

/**
 * Authenticated AI Scaling
 * Validates session and then triggers AI scaling.
 */
export const AuthenticatedAIScaling: Sync = ({
  request,
  sessionId,
  baseRecipeId,
  targetServings,
  authenticatedUser,
}) => ({
  when: actions([
    Requesting.request,
    {
      path: "/RecipeScaler/scaleRecipeAI",
      sessionId,
      baseRecipeId,
      targetServings,
    },
    { request },
  ]),
  where: async (frames: Frames) => {
    // Validate session and extract user
    // SessionDoc has 'user' property, map it to authenticatedUser symbol
    const withSession = await frames.queryAsync(
      UserAuthentication._getActiveSession,
      { sessionId },
      { user: authenticatedUser },
    );
    // Only proceed if session is valid
    return withSession.filter((frame) =>
      frame[authenticatedUser] !== undefined
    );
  },
  then: actions([
    RecipeScaler.scaleRecipeAI,
    { baseRecipeId, targetServings },
  ]),
});

// Success response for AI scaling
export const AuthenticatedAIScalingResponse: Sync = ({
  request,
  scaledRecipeId,
}) => ({
  when: actions(
    [Requesting.request, { path: "/RecipeScaler/scaleRecipeAI" }, { request }],
    [RecipeScaler.scaleRecipeAI, {}, { scaledRecipeId }],
  ),
  then: actions([Requesting.respond, { request, scaledRecipeId }]),
});

// Error response for AI scaling (when action returns error)
export const AIScalingErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/RecipeScaler/scaleRecipeAI" }, { request }],
    [RecipeScaler.scaleRecipeAI, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Authentication Failure Response for AI Scaling
 * Responds with an error when authentication fails for AI scaling requests.
 * This prevents timeouts when sessionId is invalid or missing.
 * Note: This sync fires when the session check fails (no valid session found).
 */
export const AIScalingAuthenticationFailure: Sync = ({
  request,
  sessionId,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/RecipeScaler/scaleRecipeAI", sessionId },
    { request },
  ]),
  where: async (frames: Frames) => {
    // For each frame, check if session is valid
    // If query returns empty, authentication failed
    const withSession = await frames.queryAsync(
      UserAuthentication._getActiveSession,
      { sessionId },
      {},
    );
    // If no valid sessions found, authentication failed - return frames to trigger error
    // If sessions found, authentication succeeded - return empty to let other sync handle
    if (withSession.length === 0 && frames.length > 0) {
      return frames; // Authentication failed
    }
    return new Frames(); // Authentication succeeded, let AuthenticatedScaling handle
  },
  then: actions([
    Requesting.respond,
    { request, error: "Authentication failed: Invalid or expired session." },
  ]),
});

/**
 * Authenticated Recipe Deletion
 * Validates that the user owns the recipe before allowing deletion.
 * Requires both session validation and recipe ownership check.
 */
export const AuthenticatedRecipeDeletion: Sync = ({
  request,
  sessionId,
  recipeId,
  authenticatedUser,
  recipeAuthor,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/removeRecipe", sessionId, recipeId },
    { request },
  ]),
  where: async (frames: Frames) => {
    // First validate session
    // SessionDoc has 'user' property, map it to authenticatedUser symbol
    const withSession = await frames.queryAsync(
      UserAuthentication._getActiveSession,
      { sessionId },
      { user: authenticatedUser },
    );
    // Then check recipe ownership
    // RecipeDoc has 'author' property, map it to recipeAuthor symbol
    const withOwnership = await withSession.queryAsync(
      Recipe._getRecipeById,
      { recipeId },
      { author: recipeAuthor },
    );
    // Only proceed if user is authenticated AND owns the recipe
    return withOwnership.filter(
      (frame) =>
        frame[authenticatedUser] !== undefined &&
        frame[recipeAuthor] === frame[authenticatedUser],
    );
  },
  then: actions([Recipe.removeRecipe, { recipeId }]),
});

export const AuthenticatedRecipeDeletionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/removeRecipe" }, { request }],
    [Recipe.removeRecipe, {}, {}],
  ),
  then: actions([Requesting.respond, { request }]),
});

/**
 * Error response for recipe deletion (when action returns error)
 */
export const RecipeDeletionErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Recipe/removeRecipe" }, { request }],
    [Recipe.removeRecipe, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * Authentication Failure Response for Recipe Deletion
 * Responds with an error when authentication fails for recipe deletion requests.
 * This prevents timeouts when sessionId is invalid or missing.
 */
export const RecipeDeletionAuthenticationFailure: Sync = ({
  request,
  sessionId,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/removeRecipe", sessionId },
    { request },
  ]),
  where: async (frames: Frames) => {
    // For each frame, check if session is valid
    // If query returns empty, authentication failed
    const withSession = await frames.queryAsync(
      UserAuthentication._getActiveSession,
      { sessionId },
      {},
    );
    // If no valid sessions found, authentication failed - return frames to trigger error
    // If sessions found, authentication succeeded - return empty to let other sync handle
    if (withSession.length === 0 && frames.length > 0) {
      return frames; // Authentication failed
    }
    return new Frames(); // Authentication succeeded, let AuthenticatedRecipeDeletion handle
  },
  then: actions([
    Requesting.respond,
    { request, error: "Authentication failed: Invalid or expired session." },
  ]),
});

/**
 * Ownership Failure Response for Recipe Deletion
 * Responds with an error when the user doesn't own the recipe they're trying to delete.
 * This prevents timeouts when ownership check fails.
 */
export const RecipeDeletionOwnershipFailure: Sync = ({
  request,
  sessionId,
  recipeId,
  authenticatedUser,
  recipeAuthor,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/Recipe/removeRecipe", sessionId, recipeId },
    { request },
  ]),
  where: async (frames: Frames) => {
    // First check if session is valid
    const withSession = await frames.queryAsync(
      UserAuthentication._getActiveSession,
      { sessionId },
      { user: authenticatedUser },
    );
    // If no session, let authentication failure handler take care of it
    if (withSession.length === 0) {
      return new Frames();
    }
    // Session is valid, now check ownership
    const withOwnership = await withSession.queryAsync(
      Recipe._getRecipeById,
      { recipeId },
      { author: recipeAuthor },
    );
    // Check if user owns the recipe
    // If ownership check returns empty OR user doesn't match author, ownership failed
    const validOwnership = withOwnership.filter((frame) =>
      frame[authenticatedUser] !== undefined &&
      frame[recipeAuthor] !== undefined &&
      frame[authenticatedUser] === frame[recipeAuthor]
    );
    // If no valid ownership found, but we have authenticated frames, ownership failed
    if (validOwnership.length === 0 && withSession.length > 0) {
      return frames; // Ownership failed
    }
    return new Frames(); // Ownership check passed, let AuthenticatedRecipeDeletion handle
  },
  then: actions([
    Requesting.respond,
    {
      request,
      error: "Permission denied: You can only delete your own recipes.",
    },
  ]),
});
