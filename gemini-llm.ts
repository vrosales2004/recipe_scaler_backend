/**
 * LLM Integration for DayPlanner
 *
 * Handles the requestAssignmentsFromLLM functionality using Google's Gemini API.
 * The LLM prompt is hardwired with user preferences and doesn't take external hints.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Configuration for API access
 */
export interface Config {
  apiKey: string;
}

export class GeminiLLM {
  private apiKey: string;

  constructor(config: Config) {
    this.apiKey = config.apiKey;
  }

  async executeLLM(prompt: string): Promise<string> {
    try {
      // Initialize Gemini AI
      const genAI = new GoogleGenerativeAI(this.apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
          maxOutputTokens: 1000,
        },
      });
      // Execute the LLM
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error) {
      console.error("❌ Error calling Gemini API:", (error as Error).message);
      throw error;
    }
  }
}
// file: src/recipescaler/geminiLLMClient.ts
// import { GoogleGenerativeAI, GenerativeModel } from "npm:@google/generative-ai"; // Deno-compatible import

// /**
//  * Interface for any Large Language Model (LLM) client.
//  * This ensures consistency and allows for dependency injection.
//  * Other LLM implementations (e.g., OpenAI, custom mocks) would implement this.
//  */
// export interface ILLMClient {
//   /**
//    * Executes a given text prompt against the LLM and returns its generated text response.
//    * @param prompt The text prompt to send to the LLM.
//    * @returns A promise that resolves to the LLM's text response.
//    */
//   executeLLM(prompt: string): Promise<string>;
// }

// /**
//  * Configuration for API access (as per your original structure)
//  */
// export interface Config {
//   apiKey: string;
// }

// /**
//  * Encapsulates the interaction with the Google Gemini LLM API.
//  * This class handles API key configuration and making requests to the model,
//  * implementing the ILLMClient interface.
//  */
// export class GeminiLLM implements ILLMClient { // <-- GeminiLLM now implements ILLMClient
//   private model: GenerativeModel;

//   /**
//    * Constructs a new GeminiLLM client.
//    * @param config Configuration object containing the API key.
//    *               This matches your original constructor signature.
//    */
//   constructor(config: Config) {
//     if (!config || !config.apiKey) {
//       throw new Error("Gemini API key is required within the config object to initialize the LLM client.");
//     }
//     const genAI = new GoogleGenerativeAI(config.apiKey);
//     this.model = genAI.getGenerativeModel({
//       model: "gemini-2.5-flash-lite", // Using your specified model
//       generationConfig: {
//         maxOutputTokens: 1000,
//       },
//     });
//   }

//   /**
//    * Executes a prompt against the configured Gemini LLM and returns the generated text.
//    * @param prompt The text prompt to send to the LLM.
//    * @returns A promise that resolves to the LLM's text response.
//    * @throws An error if communication with the Gemini API fails.
//    */
//   async executeLLM(prompt: string): Promise<string> {
//     try {
//       const result = await this.model.generateContent(prompt);
//       const response = await result.response;
//       return response.text();
//     } catch (error) {
//       console.error('❌ Error communicating with Gemini LLM:', error);
//       throw new Error(`Failed to get response from Gemini LLM: ${(error as Error).message}`);
//     }
//   }
// }
