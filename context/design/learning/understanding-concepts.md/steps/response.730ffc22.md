---
timestamp: 'Thu Oct 16 2025 14:05:30 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_140530.7e5155b5.md]]'
content_id: 730ffc22cb9db682356d6cfc04c05e3d5c9914910de70df479dca2f4e04501b9
---

# response:

This is an excellent question and a perfect scenario to demonstrate the power of **concept independence** and **composition by synchronization**!

The `author: Author` field in your `Recipe` concept is designed precisely for this kind of integration. Remember how `Author` is defined as a generic `ID` type (`type Author = ID;`)? This is the polymorphism that the concept design rubric talks about: "the designer of a concept should strive to make the concept as free as possible of any assumptions about the content and interpretation of objects passed as action arguments."

The `Recipe` concept doesn't care *what* an `Author` is, or how it's authenticated, or what other properties it has (like a profile picture or email). It only cares that `Author` is a unique identifier (`ID`) that can be associated with a recipe for purposes of ownership and access control *within the `Recipe` concept's domain*.

Here's how you'd integrate a `UserAuthentication` concept:

***

### Step 1: Define the `UserAuthentication` Concept

You'll need a concept that handles the core user account management.
