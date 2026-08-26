import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import emailRoutes from "./routes/emailRoutes";

export const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[HTTP] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/emails", emailRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[SERVER] Unhandled error:", err);
  res.status(500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

