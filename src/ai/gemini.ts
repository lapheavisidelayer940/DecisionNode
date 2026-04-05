import { GoogleGenerativeAI } from '@google/generative-ai';
import { getCloudEmbedding, isProSubscriber } from '../cloud.js';

// Get API key from environment (set by parent process or .env file)
const apiKey = process.env.GEMINI_API_KEY;

// We don't throw yet because the user might just be listing decisions
// We'll check again when they try to use an AI feature

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-embedding-001" }) : null;

/**
 * Get embedding for text.
 * Priority:
 * 1. Pro subscriber -> Cloud embedding (server-side)
 * 2. Local API key -> Local embedding
 * 3. None -> Error
 * 
 * @param text - Text to embed
 * @param projectName - Optional project name for cloud context
 */
export async function getEmbedding(text: string, projectName?: string): Promise<number[]> {
    // 1. Check if user is Pro - use cloud embedding
    // This allows Pro users to use the tool with ZERO config (no local API key)
    try {
        const isPro = await isProSubscriber();
        if (isPro) {
            const cloudEmbedding = await getCloudEmbedding(text, projectName);
            if (cloudEmbedding) {
                return cloudEmbedding;
            }
            // If cloud fails (e.g. network error), fall back to local if available
        }
    } catch {
        // Build/env error, ignore and try local
    }

    // 2. If local API key is available, use it
    if (model) {
        try {
            const result = await model.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            throw error;
        }
    }

    // 3. No key available
    throw new Error(
        "No Gemini API key configured.\n" +
        "Run: decide setup"
    );
}

/**
 * Check if embedding is available (either local or cloud)
 */
export async function isEmbeddingAvailable(): Promise<boolean> {
    if (model) return true;
    return await isProSubscriber();
}

