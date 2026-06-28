import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini AI Client (server-side only, secure)
  const geminiApiKey = process.env.GEMINI_API_KEY;
  let ai: GoogleGenAI | null = null;

  if (geminiApiKey) {
    ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  // Instructor Chat Endpoint
  app.post("/api/instructor/chat", async (req, res) => {
    try {
      if (!ai) {
        return res.status(500).json({
          error: "Gemini API key is not configured in the workspace settings. Please configure GEMINI_API_KEY under Secrets."
        });
      }

      const { message, history = [], model = "gemini-2.0-flash" } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Convert client message history format to the Content structure expected by @google/genai Chats
      const formattedHistory = history.map((msg: any) => ({
        role: msg.sender === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      }));

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

      // Create a chat session with history and system instruction
      const chat = ai.chats.create({
        model,
        history: formattedHistory,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const response = await chat.sendMessage({ message });
      const replyText = response.text || "I was unable to formulate a response. Please try striking an alternate groove!";

      res.json({ reply: replyText });
    } catch (error: any) {
      console.error("AI Instructor Chat Error:", error);
      res.status(500).json({ error: error.message || "Something went wrong in the AI training session." });
    }
  });

  // API Health Indicator
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", hasAPIKey: !!geminiApiKey });
  });

  // Available Gemini models
  app.get("/api/models", (_req, res) => {
    res.json({
      models: [
        { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", description: "Fast, efficient — ideal for chat" },
        { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite", description: "Lightest & fastest responses" },
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", description: "Latest balanced model" },
        { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Most capable, slower" },
      ]
    });
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
    // Production static files service
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start fullstack server:", err);
});
