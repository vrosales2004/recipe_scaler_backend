# Test Output: Recipe Tests

## Summary
- **Total Tests**: 16
- **Passed**: 16
- **Failed**: 0
- **Duration**: 8 seconds

---

## Test Results

### Principle Tests
- **Recipe manually inputted, stored, and accessed later** ... ✅ Passed (610ms)

### Add Recipe Tests
- **addRecipe: should successfully add a new recipe** ... ✅ Passed (582ms)
- **addRecipe: should return an error if originalServings is 0 or less** ... ✅ Passed (458ms)
- **addRecipe: should return an error if originalServings is not an integer** ... ✅ Passed (504ms)
- **addRecipe: should return an error if ingredients list is empty** ... ✅ Passed (433ms)
- **addRecipe: should return an error if recipe name already exists for the same author** ... ✅ Passed (491ms)
- **addRecipe: should allow the same recipe name for different authors** ... ✅ Passed (605ms)

### Remove Recipe Tests
- **removeRecipe: should successfully remove an existing recipe** ... ✅ Passed (606ms)
- **removeRecipe: should return an error if attempting to remove a non-existent recipe** ... ✅ Passed (443ms)

### Get Recipe By ID Tests
- **_getRecipeById: should return the correct recipe if it exists** ... ✅ Passed (530ms)
- **_getRecipeById: should return null if the recipe ID does not exist** ... ✅ Passed (504ms)

### Get Recipes By Author Tests
- **_getRecipesByAuthor: should return all recipes for a given author** ... ✅ Passed (654ms)
- **_getRecipesByAuthor: should return an empty array if the author has no recipes** ... ✅ Passed (481ms)

### Get Recipe By Name Tests
- **_getRecipeByName: should return the correct recipe when name and author match** ... ✅ Passed (586ms)
- **_getRecipeByName: should return null if the name exists but the author does not match** ... ✅ Passed (573ms)
- **_getRecipeByName: should return null if the recipe name does not exist** ... ✅ Passed (446ms)

---

## Final Result
All tests passed successfully! 🎉

---

## Raw Output
running 16 tests from ./src/concepts/RecipeTests.ts
Principle: Recipe manually inputted, stored, and accessed later ... ok (610ms)
addRecipe: should successfully add a new recipe ... ok (582ms)
addRecipe: should return an error if originalServings is 0 or less ... ok (458ms)
addRecipe: should return an error if originalServings is not an integer ... ok (504ms)
addRecipe: should return an error if ingredients list is empty ... ok (433ms)
addRecipe: should return an error if recipe name already exists for the same author ... ok (491ms)
addRecipe: should allow the same recipe name for different authors ... ok (605ms)
removeRecipe: should successfully remove an existing recipe ... ok (606ms)
removeRecipe: should return an error if attempting to remove a non-existent recipe ... ok (443ms)
_getRecipeById: should return the correct recipe if it exists ... ok (530ms)
_getRecipeById: should return null if the recipe ID does not exist ... ok (504ms)
_getRecipesByAuthor: should return all recipes for a given author ... ok (654ms)
_getRecipesByAuthor: should return an empty array if the author has no recipes ... ok (481ms)
_getRecipeByName: should return the correct recipe when name and author match ... ok (586ms)
_getRecipeByName: should return null if the name exists but the author does not match ... ok (573ms)
_getRecipeByName: should return null if the recipe name does not exist ... ok (446ms)

ok | 16 passed | 0 failed (8s)