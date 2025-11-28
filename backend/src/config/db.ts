import mongoose from "mongoose";
import logger from "../utils/logger";
import { addSentryBreadcrumb, captureException } from "./sentry";

const connectDB = async () => {
  try {
    addSentryBreadcrumb("Attempting to connect to MongoDB", "database", "info");
    
    await mongoose.connect(process.env.MONGO_URI as string);
    logger.info("MongoDB connected", {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    });

    addSentryBreadcrumb("MongoDB connected successfully", "database", "info", {
      host: mongoose.connection.host,
      database: mongoose.connection.name,
    });
  } catch (error) {
    logger.error("MongoDB connection failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    if (error instanceof Error) {
      captureException(error, {
        database: {
          operation: "connect",
          uri: process.env.MONGO_URI ? "configured" : "missing",
        }
      });
    }

    process.exit(1);
  }
};

export default connectDB;
