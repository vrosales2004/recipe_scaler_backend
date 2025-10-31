import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
  assertRejects,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Utility for test database setup
import { ID } from "@utils/types.ts"; // Generic ID type

import UserAuthenticationConcept from "./UserAuthentication/UserAuthenticationConcept.ts";

// Define generic ID type for consistency
type User = ID;

// Test user details
const testUsername = "testuser";
const testPassword = "password123";
const longPassword = "verylongandsecurepassword123!";
const shortPassword = "short";

// Helper function to create a new user for tests that need a pre-registered user
async function registerTestUser(
  concept: UserAuthenticationConcept,
  username: string = testUsername,
  password: string = testPassword,
) {
  const registerResult = await concept.register({ username, password });
  assertNotEquals(
    "error" in registerResult,
    true,
    `Registration failed: ${(registerResult as { error: string }).error}`,
  );
  return (registerResult as { user: User }).user;
}

// Helper function to log in a user for tests that need an active session
async function loginTestUser(
  concept: UserAuthenticationConcept,
  username: string = testUsername,
  password: string = testPassword,
) {
  const loginResult = await concept.login({ username, password });
  assertNotEquals(
    "error" in loginResult,
    true,
    `Login failed: ${(loginResult as { error: string }).error}`,
  );
  return loginResult as { user: User; sessionId: string };
}

// --- Principle Trace Test ---
Deno.test("Principle: User registers, logs in, and is recognized as authenticated", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    // 1. A user registers with a unique username and password
    const registerResult = await authConcept.register({
      username: testUsername,
      password: testPassword,
    });
    assertNotEquals(
      "error" in registerResult,
      true,
      `Registration failed: ${(registerResult as { error: string }).error}`,
    );
    const { user: registeredUserId } = registerResult as { user: User };
    assertExists(
      registeredUserId,
      "A user ID should be returned on successful registration.",
    );

    // Verify user exists in the database
    const fetchedUser = await authConcept._getUserByUsername({
      username: testUsername,
    });
    assertExists(
      fetchedUser,
      "Registered user should be retrievable by username.",
    );
    assertEquals(fetchedUser[0]._id, registeredUserId);
    assertEquals(fetchedUser[0].username, testUsername);

    // 2. The user subsequently logs in with those credentials
    const loginResult = await authConcept.login({
      username: testUsername,
      password: testPassword,
    });
    assertNotEquals(
      "error" in loginResult,
      true,
      `Login failed: ${(loginResult as { error: string }).error}`,
    );
    const { user: loggedInUserId, sessionId } = loginResult as {
      user: User;
      sessionId: string;
    };
    assertExists(
      sessionId,
      "A session ID should be returned on successful login.",
    );
    assertEquals(
      loggedInUserId,
      registeredUserId,
      "Logged in user ID should match registered user ID.",
    );

    // 3. And they will be recognized as an authenticated user
    const activeSession = await authConcept._getActiveSession({ sessionId });
    assertExists(
      activeSession,
      "An active session should exist for the provided session ID.",
    );
    assertEquals(
      activeSession[0].user,
      registeredUserId,
      "Session should link to the correct user.",
    );
    assert(
      activeSession[0].expirationTime > Date.now(),
      "Session should not be expired.",
    );

    // 4. This enables them to access personalized features (implied, not directly tested here, but supported by query)
    // The presence of a valid sessionId and corresponding user ID allows other concepts to grant access.
  } finally {
    await client.close();
  }
});

// --- Action: register specific tests ---
Deno.test("register: should successfully create a new user", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    const registerResult = await authConcept.register({
      username: "newuser",
      password: longPassword,
    });
    assertNotEquals(
      "error" in registerResult,
      true,
      `Registration failed: ${(registerResult as { error: string }).error}`,
    );
    const newUserId = (registerResult as { user: User }).user;
    assertExists(newUserId, "Should return a user ID on success.");

    const fetchedUser = await authConcept._getUserById({ userId: newUserId });
    assertExists(
      fetchedUser,
      "The registered user should be retrievable by ID.",
    );
    assertEquals(fetchedUser[0].username, "newuser");
    assertNotEquals(
      fetchedUser[0].hashedPassword,
      longPassword,
      "Password should be hashed, not stored in plain text.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("register: should return an error if username already exists", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    await registerTestUser(authConcept, testUsername); // Register once
    const registerResult = await authConcept.register({
      username: testUsername,
      password: longPassword,
    }); // Register again with same username
    assertEquals(
      "error" in registerResult,
      true,
      "Should return an error for duplicate username.",
    );
    assertEquals(
      (registerResult as { error: string }).error,
      `Username '${testUsername}' already exists.`,
    );
  } finally {
    await client.close();
  }
});

Deno.test("register: should return an error if password is too short", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    const registerResult = await authConcept.register({
      username: "shortpassuser",
      password: shortPassword,
    });
    assertEquals(
      "error" in registerResult,
      true,
      "Should return an error for short password.",
    );
    assertEquals(
      (registerResult as { error: string }).error,
      "Password must be at least 8 characters long.",
    );
  } finally {
    await client.close();
  }
});

// --- Action: login specific tests ---
Deno.test("login: should successfully log in a registered user", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    const registeredUserId = await registerTestUser(authConcept);
    const loginResult = await authConcept.login({
      username: testUsername,
      password: testPassword,
    });

    assertNotEquals(
      "error" in loginResult,
      true,
      `Login failed: ${(loginResult as { error: string }).error}`,
    );
    const { user: loggedInUserId, sessionId } = loginResult as {
      user: User;
      sessionId: string;
    };
    assertEquals(
      loggedInUserId,
      registeredUserId,
      "Logged in user ID should match registered ID.",
    );
    assertExists(sessionId, "A session ID should be generated.");

    const sessionDoc = await authConcept._getActiveSession({ sessionId });
    assertExists(sessionDoc, "Session should be active in the database.");
    assertEquals(sessionDoc[0].user, registeredUserId);
    assertEquals(sessionDoc[0].sessionId, sessionId);
    assert(
      sessionDoc[0].expirationTime > Date.now(),
      "Session should have a future expiration time.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("login: should return an error for invalid username", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    await registerTestUser(authConcept);
    const loginResult = await authConcept.login({
      username: "nonexistent",
      password: testPassword,
    });
    assertEquals(
      "error" in loginResult,
      true,
      "Should return an error for invalid username.",
    );
    assertEquals(
      (loginResult as { error: string }).error,
      "Invalid username or password.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("login: should return an error for invalid password", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    await registerTestUser(authConcept);
    const loginResult = await authConcept.login({
      username: testUsername,
      password: "wrongpassword",
    });
    assertEquals(
      "error" in loginResult,
      true,
      "Should return an error for invalid password.",
    );
    assertEquals(
      (loginResult as { error: string }).error,
      "Invalid username or password.",
    );
  } finally {
    await client.close();
  }
});

// --- Action: logout specific tests ---
Deno.test("logout: should successfully delete an active session", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    await registerTestUser(authConcept);
    const { sessionId } = await loginTestUser(authConcept);

    const logoutResult = await authConcept.logout({ sessionId });
    assertNotEquals(
      "error" in logoutResult,
      true,
      `Logout failed: ${(logoutResult as { error: string }).error}`,
    );
    assertEquals(
      logoutResult,
      {},
      "Should return an empty object on successful logout.",
    );

    const activeSession = await authConcept._getActiveSession({ sessionId });
    assertEquals(
      activeSession,
      [],
      "Session should no longer be active after logout.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("logout: should return an error for a non-existent or expired session ID", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    const nonExistentSessionId = "fake-session-id-123";
    const logoutResult = await authConcept.logout({
      sessionId: nonExistentSessionId,
    });
    assertEquals(
      "error" in logoutResult,
      true,
      "Should return an error for non-existent session.",
    );
    assertEquals(
      (logoutResult as { error: string }).error,
      "Session not found or already expired.",
    );
  } finally {
    await client.close();
  }
});

// --- Query: _getActiveSession specific tests ---
Deno.test("_getActiveSession: should return the session if active", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    await registerTestUser(authConcept);
    const { sessionId } = await loginTestUser(authConcept);

    const session = await authConcept._getActiveSession({ sessionId });
    assertExists(session, "Should retrieve an active session.");
    assertEquals(session[0].sessionId, sessionId);
    assert(
      session[0].expirationTime > Date.now(),
      "Retrieved session should not be expired.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("_getActiveSession: should return empty list if session is not found", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    const session = await authConcept._getActiveSession({
      sessionId: "nonexistent-session",
    });
    assertEquals(
      session,
      [],
      "Should return empty list for a non-existent session.",
    );
  } finally {
    await client.close();
  }
});

Deno.test("_getActiveSession: should return an empty list if session is expired", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    const userId = await registerTestUser(authConcept);
    const sessionId = "expired-session-id-abc";
    const expirationTime = Date.now() - 1000; // 1 second in the past

    // Manually insert an expired session for testing
    await authConcept.sessions.insertOne({
      _id: "sessiondoc:expired" as ID,
      user: userId,
      sessionId,
      expirationTime,
    });

    const session = await authConcept._getActiveSession({ sessionId });
    assertEquals(
      session,
      [],
      "Should return an empty list for an expired session.",
    );
  } finally {
    await client.close();
  }
});

// --- Query: _getUserByUsername specific tests ---
Deno.test("_getUserByUsername: should return the user if found", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    const userId = await registerTestUser(authConcept);
    const user = await authConcept._getUserByUsername({
      username: testUsername,
    });
    assertExists(user, "Should retrieve the user by username.");
    assertEquals(user[0]._id, userId);
    assertEquals(user[0].username, testUsername);
  } finally {
    await client.close();
  }
});

Deno.test("_getUserByUsername: should return an empty list if user is not found", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    const user = await authConcept._getUserByUsername({
      username: "nonexistentuser",
    });
    assertEquals(
      user,
      [],
      "Should return an empty list for a non-existent username.",
    );
  } finally {
    await client.close();
  }
});

// --- Query: _getUserById specific tests ---
Deno.test("_getUserById: should return the user if found", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    const userId = await registerTestUser(authConcept);
    const user = await authConcept._getUserById({ userId });
    assertExists(user, "Should retrieve the user by ID.");
    assertEquals(user[0]._id, userId);
    assertEquals(user[0].username, testUsername);
  } finally {
    await client.close();
  }
});

Deno.test("_getUserById: should return an empty list if user is not found", async () => {
  const [db, client] = await testDb();
  const authConcept = new UserAuthenticationConcept(db);

  try {
    const nonExistentUserId = "user:fake-id-abc" as User;
    const user = await authConcept._getUserById({ userId: nonExistentUserId });
    assertEquals(
      user,
      [],
      "Should return an empty list for a non-existent user ID.",
    );
  } finally {
    await client.close();
  }
});
