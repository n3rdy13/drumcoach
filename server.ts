import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

// Model preference order: most reliable first, then quality-descending
const MODEL_PREFERENCE = [
  "gemini-3.1-flash",
  "gemini-3.1-pro",
];

// Per-model quota exhaustion cache: tracks when each model's quota expires
const quotaExpiresAt = new Map<string, number>();

function isQuotaExhausted(model: string): boolean {
  const exp = quotaExpiresAt.get(model);
  if (!exp) return false;
  if (Date.now() > exp) {
    quotaExpiresAt.delete(model);
    return false;
  }
  return true;
}

function markQuotaExhausted(model: string, retryAfterMs: number) {
  quotaExpiresAt.set(model, Date.now() + retryAfterMs);
}

function parseRetryMs(errorMsg: string): number {
  const match = errorMsg.match(/retry in (\d+(?:\.\d+)?)s/i);
  if (match) return Math.ceil(parseFloat(match[1]) * 1000);
  return 60_000; // default 60s if no hint
}

function getAI(): GoogleGenAI | null {
  dotenv.config({ path: envPath, override: true });
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({});
}

interface ChatPayload {
  message: string;
  formattedHistory: { role: string; parts: { text: string }[] }[];
  systemInstruction: string;
}

async function tryModel(
  ai: GoogleGenAI,
  model: string,
  payload: ChatPayload
): Promise<string> {
  const chat = ai.chats.create({
    model,
    history: payload.formattedHistory,
    config: { systemInstruction: payload.systemInstruction, temperature: 0.7 },
  });
  const response = await chat.sendMessage({ message: payload.message });
  return response.text || "I was unable to formulate a response.";
}

// Attempts requested model first, then falls back through MODEL_PREFERENCE.
// Returns { reply, modelUsed }.
async function tryWithFallback(
  ai: GoogleGenAI,
  requestedModel: string,
  payload: ChatPayload
): Promise<{ reply: string; modelUsed: string }> {
  // Build ordered list: requested model first (if not exhausted), then others
  const ordered = [
    requestedModel,
    ...MODEL_PREFERENCE.filter((m) => m !== requestedModel),
  ];

  let lastError: any = null;

  for (const model of ordered) {
    if (isQuotaExhausted(model)) {
      console.log(`[model-fallback] Skipping ${model} — quota cached as exhausted`);
      continue;
    }

    try {
      console.log(`[model-fallback] Trying ${model}...`);
      const reply = await tryModel(ai, model, payload);
      console.log(`[model-fallback] Success with ${model}`);
      return { reply, modelUsed: model };
    } catch (err: any) {
      const msg: string = err.message || "";
      const isQuota =
        err.status === 429 ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota");

      if (isQuota) {
        const retryMs = parseRetryMs(msg);
        console.warn(`[model-fallback] ${model} quota exhausted — caching for ${retryMs}ms`);
        markQuotaExhausted(model, retryMs);
        lastError = err;
        continue; // try next
      }

      // Non-quota error — re-throw immediately (wrong key, bad request, etc.)
      throw err;
    }
  }

  // All models exhausted
  const retryHints = Array.from(quotaExpiresAt.entries())
    .map(([m, exp]) => `${m} in ${Math.ceil((exp - Date.now()) / 1000)}s`)
    .join(", ");

  throw Object.assign(
    new Error(
      `All Gemini models are quota-limited right now. Retry windows: ${retryHints || "unknown"}. ` +
        "Please wait and try again, or upgrade your Google AI Studio plan."
    ),
    { status: 429 }
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const systemInstruction = `You are "BeatBuddy AI" (or "Coach Dave"), an elite drumming instructor, multi-instrumentalist, and groove coach. Your mission is to provide encouraging, actionable, and visually clear drumming guidance.

Keep your tone engaging, energetic, highly supportive, and professional. Use markdown to format your replies (with bolding, bullets, and short code snippets for rhythmic patterns).

You possess deep knowledge of:
1. Drum rudiments (Single stroke, double stroke, paradiddles, flams, drags, and how to practice them with speed ramping).
2. Groove patterns (Classic rock, hip-hop boom bap, four-on-the-floor, trap, jazz waltz).
3. MIDI controller setup, drum kit hardware, ergonomics, stick selection, and timing science.

CRITICAL FEATURE - SPEED-RAMPING METRONOME & INSTRUCTION COUPLING:
- If the user asks about a specific rudiment, explain it, and suggest a focus speed (BPM).
- Encourage them to practice slowly first before ramping up.
- You can recommend a BPM.

Keep responses concise, clear, and focused on technique. Avoid overly verbose explanations of music theory unless requested; prioritize tips on physical feel, counts (e.g. "1 e & a 2 e & a"), and motivation.`;

  // Instructor Chat Endpoint
  app.post("/api/instructor/chat", async (req, res) => {
    try {
      const ai = getAI();
      if (!ai) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not set. Add it to the .env file in the project root.",
        });
      }

      const { message, history = [], model = "gemini-3.1-flash" } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const formattedHistory = history.map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }],
      }));

      const { reply, modelUsed } = await tryWithFallback(ai, model, {
        message,
        formattedHistory,
        systemInstruction,
      });

      res.json({ reply, modelUsed });
    } catch (error: any) {
      console.error("AI Instructor Chat Error:", error);

      const rawMsg: string = error.message || "";
      let userMessage = "Something went wrong in the AI training session.";

      if (
        error.status === 429 ||
        rawMsg.includes("RESOURCE_EXHAUSTED") ||
        rawMsg.includes("quota") ||
        rawMsg.includes("quota-limited")
      ) {
        userMessage = rawMsg.includes("All Gemini models")
          ? rawMsg
          : `Gemini API quota exceeded. Please wait a moment and try again, or upgrade your Google AI Studio plan.`;
      } else if (rawMsg.includes("API_KEY_INVALID") || rawMsg.includes("invalid api key")) {
        userMessage = "The Gemini API key is invalid. Please check GEMINI_API_KEY in your .env file.";
      } else if (rawMsg.includes("MODEL_NOT_FOUND") || rawMsg.includes("not found")) {
        userMessage = "The selected model is not available. The app will try other models automatically.";
      } else if (rawMsg) {
        userMessage = rawMsg;
      }

      res.status(error.status === 429 ? 429 : 500).json({ error: userMessage });
    }
  });

  // Quota status endpoint — lets the UI know which models are currently available
  app.get("/api/models/status", (_req, res) => {
    const now = Date.now();
    const status = MODEL_PREFERENCE.map((id) => {
      const exp = quotaExpiresAt.get(id);
      const exhausted = exp ? now < exp : false;
      return {
        id,
        exhausted,
        retryInMs: exhausted && exp ? Math.max(0, exp - now) : 0,
      };
    });
    res.json({ status });
  });

  // Available Gemini models
  app.get("/api/models", (_req, res) => {
    res.json({
      models: [
        { id: "gemini-3.1-flash", label: "Gemini 3.1 Flash", description: "Latest balanced — best availability" },
        { id: "gemini-3.1-pro",   label: "Gemini 3.1 Pro",   description: "Most capable, slower" },
      ],
    });
  });

  // API Health Indicator
  app.get("/api/health", (_req, res) => {
    dotenv.config({ path: envPath, override: true });
    const key = process.env.GEMINI_API_KEY;
    res.json({ status: "ok", hasAPIKey: !!key });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Started Vite Dev Server middleware inside custom Express Server");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler — always returns JSON so the frontend never gets an HTML error page
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    res.setHeader("Content-Type", "application/json");
    res.status(500).json({ error: err?.message || "An unexpected server error occurred." });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start fullstack server:", err);
});
