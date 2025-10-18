# Test Output: User Authentication Tests

## Summary
- **Total Tests**: 16
- **Passed**: 16
- **Failed**: 0
- **Duration**: 10 seconds

---

## Test Results

### Principle Tests
- **User registers, logs in, and is recognized as authenticated** ... ✅ Passed (741ms)

### Register Tests
- **register: should successfully create a new user** ... ✅ Passed (818ms)
- **register: should return an error if username already exists** ... ✅ Passed (701ms)
- **register: should return an error if password is too short** ... ✅ Passed (569ms)

### Login Tests
- **login: should successfully log in a registered user** ... ✅ Passed (600ms)
- **login: should return an error for invalid username** ... ✅ Passed (610ms)
- **login: should return an error for invalid password** ... ✅ Passed (802ms)

### Logout Tests
- **logout: should successfully delete an active session** ... ✅ Passed (711ms)
- **logout: should return an error for a non-existent or expired session ID** ... ✅ Passed (604ms)

### Session Tests
- **_getActiveSession: should return the session if active** ... ✅ Passed (768ms)
- **_getActiveSession: should return null if session is not found** ... ✅ Passed (503ms)
- **_getActiveSession: should return null if session is expired** ... ✅ Passed (658ms)

### User Retrieval Tests
- **_getUserByUsername: should return the user if found** ... ✅ Passed (790ms)
- **_getUserByUsername: should return null if user is not found** ... ✅ Passed (504ms)
- **_getUserById: should return the user if found** ... ✅ Passed (647ms)
- **_getUserById: should return null if user is not found** ... ✅ Passed (552ms)

---

## Final Result
All tests passed successfully! 🎉

# Raw Output:
running 16 tests from ./src/concepts/UserAuthenticationTests.ts
Principle: User registers, logs in, and is recognized as authenticated ... ok (741ms)
register: should successfully create a new user ... ok (818ms)
register: should return an error if username already exists ... ok (701ms)
register: should return an error if password is too short ... ok (569ms)
login: should successfully log in a registered user ... ok (600ms)
login: should return an error for invalid username ... ok (610ms)
login: should return an error for invalid password ... ok (802ms)
logout: should successfully delete an active session ... ok (711ms)
logout: should return an error for a non-existent or expired session ID ... ok (604ms)
_getActiveSession: should return the session if active ... ok (768ms)
_getActiveSession: should return null if session is not found ... ok (503ms)
_getActiveSession: should return null if session is expired ... ok (658ms)
_getUserByUsername: should return the user if found ... ok (790ms)
_getUserByUsername: should return null if user is not found ... ok (504ms)
_getUserById: should return the user if found ... ok (647ms)
_getUserById: should return null if user is not found ... ok (552ms)

ok | 16 passed | 0 failed (10s)