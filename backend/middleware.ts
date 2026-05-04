import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client";
import { prisma } from "./db";

declare global {
      namespace Express {
            interface Request {
                  userId: string;
            }
      }
}

const client = createSupabaseClient();
export async function middleware(
      req: Request,
      res: Response,
      next: NextFunction,
) {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7)
            : authHeader;

      if (!token) {
            res.status(403).json({ messages: "No token provided" });
            return;
      }

      const data = await client.auth.getUser(token);
      const userId = data.data.user?.id;
      if (userId) {
            try {
                  await prisma.user.create({
                        data: {
                              id: data.data.user!.id,
                              supabaseId: data.data.user!.id,
                              email: data.data.user?.email!,
                              provider:
                                    data.data.user?.app_metadata.provider ===
                                    "google"
                                          ? "Google"
                                          : "Github",
                              name: data.data.user?.user_metadata.full_name,
                        },
                  });
            } catch (e) {}

            req.userId = userId;
            next();
      } else {
            res.status(403).json({
                  messages: "incorrect inputs",
            });
      }
}
