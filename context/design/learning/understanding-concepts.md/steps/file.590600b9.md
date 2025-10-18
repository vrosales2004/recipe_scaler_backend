---
timestamp: 'Fri Oct 17 2025 20:24:48 GMT-0400 (Eastern Daylight Time)'
parent: '[[../20251017_202448.0f6cb245.md]]'
content_id: 590600b99981e481e16eddffa6c2db2a9d9108363d812f2842074e7f0c8174b8
---

# file: src/recipescaler/geminiLLMClient.ts

```typescript
import { GoogleGenerativeAI, GenerativeModel } from "npm:@google/generative-ai";

/**
 * Interface for any Large Language Model (LLM) client.
 * This ensures consistency and allows for dependency injection.
 */
export interface ILLMClient {
  /**
   * Executes a given text prompt against the LLM and returns its generated text response.
   * @param prompt The text prompt to send to the LLM.
   * @returns A promise that resolves to the LLM's text response.
   */
  executeLLM(prompt: string): Promise<string>;
}

/**
 * Encapsulates the interaction with the Google Gemini LLM API.
 * This class handles API key configuration and making requests to the model,
 * implementing the ILLMClient interface.
 */
export class GeminiLLM implements ILLMClient {
  private model: GenerativeModel;

  /**
   * Constructs a new GeminiLLM client.
   * @param apiKey The API key for accessing the Google Gemini API.
   *               This should typically be loaded from environment variables
   *               *before* instantiating this class.
   */
  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Gemini API key is required to initialize the LLM client.");
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    // You can specify different Gemini models here if needed, e.g., "gemini-1.5-flash", "gemini-1.5-pro"
    // "gemini-pro" is a good general-purpose model for text generation tasks.
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
      // Re-throw the error, allowing the calling concept to handle it.
      throw new Error(`Failed to get response from Gemini LLM: ${(error as Error).message}`);
    }
  }
}
```
