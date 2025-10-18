# Test Output: Tips Tests

## Summary
- **Total Tests**: 8
- **Passed**: 8
- **Failed**: 0
- **Duration**: 4 seconds

---

## Test Results

### Principle Tests
- **User adds manual tips, which are then retrieved** ... ✅ Passed (634ms)

### Add Manual Scaling Tip Tests
- **addManualScalingTip: should successfully add a new manual tip** ... ✅ Passed (565ms)
- **addManualScalingTip: should return error for invalid direction** ... ✅ Passed (395ms)
- **addManualScalingTip: should return error for empty cooking method** ... ✅ Passed (504ms)
- **addManualScalingTip: should return error for empty tip text** ... ✅ Passed (450ms)

### Remove Scaling Tip Tests
- **removeScalingTip: should successfully remove an existing tip** ... ✅ Passed (601ms)
- **removeScalingTip: should return error if attempting to remove a non-existent tip** ... ✅ Passed (570ms)

### Get Scaling Tips Tests
- **_getScalingTips: should return tips filtered by cooking method and direction** ... ✅ Passed (660ms)

---

## Final Result
All tests passed successfully! 🎉

# Raw Output
running 8 tests from ./src/concepts/TipsTests.ts
Principle: User adds manual tips, which are then retrieved ... ok (634ms)
addManualScalingTip: should successfully add a new manual tip ... ok (565ms)
addManualScalingTip: should return error for invalid direction ... ok (395ms)
addManualScalingTip: should return error for empty cooking method ... ok (504ms)
addManualScalingTip: should return error for empty tip text ... ok (450ms)
removeScalingTip: should successfully remove an existing tip ... ok (601ms)
removeScalingTip: should return error if attempting to remove a non-existent tip ... ok (570ms)
_getScalingTips: should return tips filtered by cooking method and direction ... ok (660ms)

ok | 8 passed | 0 failed (4s)