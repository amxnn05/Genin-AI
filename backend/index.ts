import express from "express";
import type { Request } from "express";
import { groq } from "@ai-sdk/groq";
import { generateText, streamText } from "ai";
import { tavily } from "@tavily/core";
import dotenv from "dotenv";
import { PROMPT_TEMPLATE, SYSTEM_PROMPT } from "./prompt";
import { prisma } from "./db";
import { middleware } from "./middleware";
import cors from "cors";

// Extend Express Request type to include userId
declare global {
      namespace Express {
            interface Request {
                  userId: string;
            }
      }
}

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Health check endpoint for uptime monitoring
app.get("/health", (req, res) => {
      res.status(200).send("OK");
});

const client = tavily({
      apiKey: process.env.TAVILY_API,
});

// to get conversation title in side bar
app.get("/conversations", middleware, async (req: Request, res) => {
      const conversations = await prisma.conversation.findMany({
            where: {
                  userId: req.userId,
            },
            orderBy: {
                  id: "desc",
            },
      });
      res.json({
            conversations,
      });
});

// to get whole conversation
app.get("/conversations/:id", middleware, async (req: Request, res) => {
      const { id } = req.params;
      const conversation = await prisma.conversation.findUnique({
            where: {
                  id: id as string,
                  userId: req.userId,
            },
            include: {
                  messages: {
                        orderBy: {
                              createdAt: "asc",
                        },
                  },
            },
      });

      res.json({
            messages: (conversation as any)?.messages || [],
      });
});

// making endpoint to ask the query
app.post("/ask", middleware, async (req: Request, res) => {
      const { query: user_input, conversationId } = req.body;
      const userId = req.userId;

      try {
            let convId = conversationId;

            if (!convId) {
                  const conversation = await prisma.conversation.create({
                        data: {
                              userId,
                              title: user_input.slice(0, 50),
                              slug: user_input
                                    .slice(0, 50)
                                    .toLowerCase()
                                    .replace(/ /g, "-"),
                        },
                  });
                  convId = conversation.id;
            }

            await prisma.message.create({
                  data: {
                        content: user_input,
                        role: "User",
                        conversationId: convId,
                  },
            });

            const webSearch = await client.search(user_input, {
                  searchDepth: "advanced",
            });
            const webSearchResult = webSearch.results;

            const prompt = PROMPT_TEMPLATE.replace(
                  "{{WEB_SEARCH_RESULTS}}",
                  JSON.stringify(webSearchResult),
            ).replace("{{USER_QUERY}}", user_input);

            const result = await streamText({
                  model: groq("llama-3.3-70b-versatile"),
                  prompt: prompt,
                  system: SYSTEM_PROMPT,
            });

            res.header("Cache-Control", "no-cache");
            res.header("Content-Type", "text/event-stream");
            res.header("X-Conversation-Id", convId);

            let fullResponse = "";
            for await (const textPart of result.textStream) {
                  fullResponse += textPart;
                  res.write(textPart);
            }

            await prisma.message.create({
                  data: {
                        content: fullResponse,
                        role: "Assistant",
                        conversationId: convId,
                  },
            });

            res.write("\n<SOURCES>\n");
            res.write(
                  JSON.stringify(
                        webSearchResult.map((result) => ({
                              url: result.url,
                              title: result.title,
                        })),
                  ),
            );
            res.write("\n</SOURCES>\n");
            res.end();
      } catch (error) {
            console.error(error);
            if (!res.headersSent) {
                  res.status(500).json({ error: "Something went wrong" });
            } else {
                  res.end();
            }
      }
});

// to ask all the follow ups
app.post("/ask_suggestions", middleware, async (req: Request, res) => {
      const { query: user_input } = req.body;

      try {
            const { text } = await generateText({
                  model: groq("llama-3.3-70b-versatile"),
                  prompt: `Based on the following user query, suggest 3 short, relevant follow-up questions that the user might want to ask next.

                  Query: "${user_input}"

                  Return only the questions, each on a new line, without any numbering or extra text.`,
            });

            const suggestions = text
                  .split("\n")
                  .map((s) => s.trim())
                  .filter((s) => s.length > 0)
                  .slice(0, 3);

            res.json({
                  suggestions,
            });
      } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Failed to generate suggestions" });
      }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}!!`);
});
