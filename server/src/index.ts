import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/database";
import vocabularyRoutes from "./routes/vocabulary";
import deckRoutes from "./routes/deck";
import progressRoutes from "./routes/progress";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/vocabulary", vocabularyRoutes);
app.use("/api/decks", deckRoutes);
app.use("/api/progress", progressRoutes);

// Health check route
app.get("/api/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Connect to MongoDB then start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  });
});
