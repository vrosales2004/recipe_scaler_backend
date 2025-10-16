---
timestamp: 'Wed Oct 15 2025 21:45:23 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251015_214523.4c455f58.md]]'
content_id: 5790f29aded5a67e3032de85702249f10040a63ea7110a4db12aaa74b682ed9e
---

# question: i also wanted to have a concept to do with cooking tips, could you give some feedback on the basic version i have now: concept tipsPage

purpose stores an increasing number of tips for certain aspects of cooking

principle dynamically changing board of tips for scaled cooking

state 

    a set of Cooking Methods

a scaling up tip (optional)

a scaling down tip (optional)

actions

    addTip (cookingMethod: string, up/down: Boolean, tip: String): ()

effect updates the tip for scaling up or down for a specific cooking method

    requestTip (cookingMethod: string, up/down: Boolean): (tip: String)

effect returns the tip associated with that cooking method for scaling up or down
