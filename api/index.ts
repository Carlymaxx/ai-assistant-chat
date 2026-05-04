import express from "express";
import cors from "cors";
import OpenAI from "openai";
import type { Request, Response } from "express";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

app.post("/api/chat", async (req: Request, res: Response) => {
  const { messages } = req.body as { messages: Message[] };

  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: "Messages are required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are maxx-XMD AI, a helpful and knowledgeable assistant. Be concise, clear, and friendly.",
        },
        ...messages,
      ],
      stream: true,
      max_tokens: 8192,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) {
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error("OpenAI error:", err);
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: "AI request failed" })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: "AI request failed" });
    }
  }
});

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
