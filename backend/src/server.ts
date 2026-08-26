import { app } from "./app";
import { env } from "./config/env";
import { connectPrisma, prisma } from "./db/prisma";
import { reconcileScheduledEmails } from "./services/reconciler";
import { initEmailWorker, stopEmailWorker } from "./queue/emailWorker";
import { emailQueue } from "./queue/emailQueue";
import { redisClient } from "./config/redis";

let server: ReturnType<typeof app.listen> | undefined;

async function bootstrap() {
  try {
    await connectPrisma();
    await reconcileScheduledEmails();
    initEmailWorker();
    server = app.listen(env.PORT, () => {
      console.log(`API listening on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}; shutting down.`);

  if (server) {
    server.close(() => {
    });
  }

  try {
    await stopEmailWorker();
    await emailQueue.close();
    await redisClient.quit();
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Shutdown failed:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

bootstrap();
