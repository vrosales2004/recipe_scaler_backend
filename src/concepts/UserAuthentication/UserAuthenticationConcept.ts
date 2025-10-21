import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { generate as generateUuidV4 } from "jsr:@std/uuid/unstable-v7"; // Using uuid-v7 for session IDs

// Collection prefix to ensure namespace separation in MongoDB
const PREFIX = "UserAuthentication" + ".";

// Generic type for User (external reference)
type User = ID;
// Internal ID type for a session document (distinct from the sessionId string itself)
type SessionDocId = ID;

/**
 * @interface UserDoc
 * Represents the structure of a user document stored in MongoDB.
 * Corresponds to "a set of Users" in the concept state.
 */
interface UserDoc {
  _id: User; // Unique ID for the user
  username: string;
  hashedPassword: string; // Storing hashed password for security
}

/**
 * @interface SessionDoc
 * Represents the structure of an active session document stored in MongoDB.
 * Corresponds to "a set of Sessions" in the concept state.
 */
interface SessionDoc {
  _id: SessionDocId; // Unique ID for the session document itself (internal)
  user: User; // Reference to the User ID
  sessionId: string; // The actual session token string passed to the client
  expirationTime: number; // Unix timestamp for when the session expires
}

/**
 * Helper function to hash a password using Deno's crypto.subtle.
 * In a real app, use a robust library like bcrypt for password hashing.
 */
async function hashPassword(password: string): Promise<string> {
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedPassword = hashArray.map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashedPassword;
}

/**
 * Helper function to compare a plain password with a hashed password.
 */
async function comparePassword(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  const textEncoder = new TextEncoder();
  const data = textEncoder.encode(plainPassword);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const newHashedPassword = hashArray.map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
  return newHashedPassword === hashedPassword;
}

/**
 * @concept UserAuthentication
 * @purpose To provide secure mechanisms for users to register, log in, and log out of the application,
 *          establishing their identity.
 *
 * @principle A user registers with a unique username and password. The user subsequently logs in with
 *            those credentials, and they will be recognized as an authenticated user, which enables
 *            them to access personalized features.
 */
export default class UserAuthenticationConcept {
  users: Collection<UserDoc>;
  sessions: Collection<SessionDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection<UserDoc>(PREFIX + "users");
    this.sessions = this.db.collection<SessionDoc>(PREFIX + "sessions");
  }

  /**
   * Action: Registers a new user with a unique username and password.
   *
   * @param {Object} params - The parameters for registration.
   * @param {string} params.username - The desired username.
   * @param {string} params.password - The user's chosen password.
   * @returns {Promise<{user: User} | {error: string}>} The ID of the newly registered user on success, or an error.
   *
   * @requires username must be unique.
   * @requires password must meet complexity requirements (e.g., min 8 chars).
   * @effects Creates a new User document with the given details and a hashed password.
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Precondition: Username must be unique
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `Username '${username}' already exists.` };
    }

    // Precondition: Password complexity (example: min 8 characters)
    if (password.length < 8) {
      return { error: "Password must be at least 8 characters long." };
    }

    // Effect: Create a new user
    const userId = freshID() as User;
    const hashedPassword = await hashPassword(password);

    await this.users.insertOne({ _id: userId, username, hashedPassword });

    return { user: userId };
  }

  /**
   * Action: Logs in a user with their username and password.
   *
   * @param {Object} params - The parameters for login.
   * @param {string} params.username - The user's username.
   * @param {string} params.password - The user's password.
   * @returns {Promise<{user: User, sessionId: string} | {error: string}>} The user's ID and a new session ID on success, or an error.
   *
   * @requires username and password must match an existing user.
   * @effects Creates an active Session for the user with a unique sessionId and an expirationTime.
   */
  async login(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User; sessionId: string } | { error: string }> {
    // Find the user by username
    const userDoc = await this.users.findOne({ username });
    if (!userDoc) {
      return { error: "Invalid username or password." };
    }

    // Compare provided password with stored hashed password
    const passwordMatches = await comparePassword(
      password,
      userDoc.hashedPassword,
    );
    if (!passwordMatches) {
      return { error: "Invalid username or password." };
    }

    // Effect: Create a new active session
    const sessionId = generateUuidV4(); // Generate a UUID for the session token
    const expirationTime = Date.now() + (1000 * 60 * 60); // Session expires in 1 hour (example)

    const sessionDocId = freshID() as SessionDocId;
    await this.sessions.insertOne({
      _id: sessionDocId,
      user: userDoc._id,
      sessionId,
      expirationTime,
    });

    return { user: userDoc._id, sessionId };
  }

  /**
   * Action: Logs out a user by invalidating their session.
   *
   * @param {Object} params - The parameters for logout.
   * @param {string} params.sessionId - The session ID to invalidate.
   * @returns {Promise<Empty | {error: string}>} An empty object on success, or an error.
   *
   * @requires sessionId must correspond to an active session.
   * @effects Deletes the active Session record.
   */
  async logout(
    { sessionId }: { sessionId: string },
  ): Promise<Empty | { error: string }> {
    // Effect: Delete the active session
    const result = await this.sessions.deleteOne({ sessionId });

    if (result.deletedCount === 0) {
      return { error: "Session not found or already expired." };
    }

    return {};
  }

  /**
   * Query: Retrieves an active session by its session ID.
   * Useful for internal checks in syncs or middleware.
   * @param {Object} params - The query parameters.
   * @param {string} params.sessionId - The session ID to look up.
   * @returns {Promise<SessionDoc | null>} The active session document if found and not expired, otherwise null.
   */
  async _getActiveSession(
    { sessionId }: { sessionId: string },
  ): Promise<SessionDoc | null> {
    const session = await this.sessions.findOne({ sessionId });
    if (session && session.expirationTime > Date.now()) {
      return session;
    }
    // If found but expired, or not found, return null.
    // Optionally, you might want to delete expired sessions here.
    return null;
  }

  /**
   * Query: Finds a user by their username.
   * @param {Object} params - The query parameters.
   * @param {string} params.username - The username to search for.
   * @returns {Promise<UserDoc | null>} The user document if found, otherwise null.
   */
  async _getUserByUsername(
    { username }: { username: string },
  ): Promise<UserDoc | null> {
    return await this.users.findOne({ username });
  }

  /**
   * Query: Finds a user by their User ID.
   * @param {Object} params - The query parameters.
   * @param {User} params.userId - The user ID to search for.
   * @returns {Promise<UserDoc | null>} The user document if found, otherwise null.
   */
  async _getUserById({ userId }: { userId: User }): Promise<UserDoc | null> {
    return await this.users.findOne({ _id: userId });
  }
}
