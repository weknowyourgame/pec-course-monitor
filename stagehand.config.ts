import type { ConstructorParams } from "@browserbasehq/stagehand";
import dotenv from "dotenv";

dotenv.config();

const StagehandConfig: ConstructorParams = {
  verbose: 1 /* Verbosity level for logging: 0 = silent, 1 = info, 2 = all */,
  domSettleTimeoutMs: 60_000 /* Increased timeout for DOM to settle in milliseconds */,

  // LLM configuration - Using GPT-4o for better CAPTCHA recognition
  modelName: "openai/gpt-4o" /* Using GPT-4o for better vision capabilities */,
  modelClientOptions: {
    apiKey: process.env.OPENAI_API_KEY,
    // Add vision-specific parameters
    temperature: 0.1, // Lower temperature for more deterministic CAPTCHA recognition
    maxCompletionTokens: 50, // Keep responses short for CAPTCHA
  },

  // Extract configuration - Improve vision capabilities
  extractOptions: {
    visionOptions: {
      detail: "high", // Use high detail for better CAPTCHA recognition
      timeout: 30000, // Longer timeout for vision processing
    },
  },

  // Browser configuration
  env: "LOCAL" /* Environment to run in: LOCAL or BROWSERBASE */,
  apiKey: process.env.BROWSERBASE_API_KEY /* API key for authentication */,
  projectId: process.env.BROWSERBASE_PROJECT_ID /* Project identifier */,
  browserbaseSessionID:
    undefined /* Session ID for resuming Browserbase sessions */,
  browserbaseSessionCreateParams: {
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    browserSettings: {
      blockAds: false, // Don't block ads to ensure CAPTCHA loads properly
      viewport: {
        width: 1280, // Wider viewport for better visibility
        height: 800,
      },
    },
  },
  localBrowserLaunchOptions: {
    headless: false, // Use non-headless mode for debugging
    viewport: {
      width: 1280,
      height: 800,
    },
  } /* Configuration options for the local browser */,
};

export default StagehandConfig;
