import { GenerativeModel, GoogleGenerativeAI } from "npm:@google/generative-ai";

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
      throw new Error(
        "Gemini API key is required to initialize the LLM client.",
      );
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    // Using gemini-2.0-flash as it's the current model
    // Alternative models: "gemini-1.5-flash", "gemini-1.5-pro" for other options
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
      console.error("❌ Error communicating with Gemini LLM:", error);
      // Re-throw the error, allowing the calling concept to handle it.
      throw new Error(
        `Failed to get response from Gemini LLM: ${(error as Error).message}`,
      );
    }
  }
}
