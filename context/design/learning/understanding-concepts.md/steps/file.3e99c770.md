---
timestamp: 'Thu Oct 16 2025 21:54:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251016_215445.b7d7dd68.md]]'
content_id: 3e99c77006f41865fd700e86fd7ed288f4fc586fee372b220dacbf449c6b27f0
---

# file: src/recipescaler/geminiLLMClient.ts

```typescript
import { GoogleGenerativeAI, GenerativeModel } from "npm:@google/generative-ai";

/**
 * Encapsulates the interaction with the Google Gemini LLM API.
 * This class handles API key configuration and making requests to the model.
 */
export class GeminiLLM {
  private model: GenerativeModel;

  /**
   * Constructs a new GeminiLLM client.
   * @param apiKey The API key for accessing the Google Gemini API.
   *               This should typically be loaded from environment variables.
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Gemini API key is required to initialize the LLM client.");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    // You can specify different models if needed, e.g., "gemini-1.5-flash", "gemini-1.5-pro"
    this.model = genAI.getGenerativeModel({ model: "gemini-pro" });
  }

  /**
   * Executes a prompt against the configured Gemini LLM and returns the generated text.
   * @param prompt The text prompt to send to the LLM.
   * @returns A promise that resolves to the LLM's text response.
   * @throws An error if communication with the Gemini API fails.
   */
  async executeLLM(prompt: string): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('❌ Error communicating with Gemini LLM:', error);
      // Re-throw or return a specific error message as appropriate for your application
      throw new Error(`Failed to get response from Gemini LLM: ${(error as Error).message}`);
    }
  }
}
```

***

### Step 2: Update `src/recipescaler/RecipeScalerConcept.ts`

Now, let's modify the `RecipeScalerConcept` to use this `GeminiLLM` class directly. We'll update its constructor to accept the Gemini API key, which it will then use to instantiate the `GeminiLLM` client internally.
