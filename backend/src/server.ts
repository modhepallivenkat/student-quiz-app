import dns from "node:dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { questions } from "./questions";
import QuizResult from "./QuizResult";
import User from "./user";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const JWT_SECRET: string = process.env.JWT_SECRET || "";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from the environment variables.");
}

// Middleware
app.use(cors());
app.use(express.json());

// Backend homepage
app.get("/", (_req: Request, res: Response) => {
  res.status(200).send("Student Quiz App Backend is running successfully!");
});

// Health-check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
    message: "Student Quiz App Backend is healthy.",
  });
});

interface AuthRequest extends Request {
  userId?: string;
}

// Authentication middleware
function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Please log in first.",
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    if (typeof decoded.userId !== "string") {
      res.status(401).json({
        message: "Invalid token.",
      });
      return;
    }

    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({
      message:
        "Your login session is invalid or expired. Please log in again.",
    });
  }
}

// Register a new user
app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      password.length < 8 ||
      password.length > 72
    ) {
      res.status(400).json({
        message:
          "Enter a valid name and email. Password must be 8–72 characters.",
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      res.status(409).json({
        message: "An account with this email already exists.",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Registration successful! You can now log in.",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({
        message: "An account with this email already exists.",
      });
      return;
    }

    console.error("Registration error:", error);

    res.status(500).json({
      message: "Registration failed.",
    });
  }
});

// Login
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      res.status(400).json({
        message: "Email and password are required.",
      });
      return;
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({
        message: "Invalid email or password.",
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
      },
      JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Login failed.",
    });
  }
});

// Get questions without revealing correct answers
app.get("/api/questions", (_req: Request, res: Response) => {
  const safeQuestions = questions.map(
    ({ correctAnswer, ...question }) => question
  );

  res.json(safeQuestions);
});

// Submit quiz answers
app.post(
  "/api/submit",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const answers = req.body?.answers;

      if (
        !answers ||
        typeof answers !== "object" ||
        answers === null ||
        Array.isArray(answers)
      ) {
        res.status(400).json({
          message: "Please provide valid answers.",
        });
        return;
      }

      const questionMap = new Map(
        questions.map((question) => [String(question.id), question])
      );

      for (const [questionId, answer] of Object.entries(answers)) {
        const question = questionMap.get(questionId);

        if (
          !question ||
          typeof answer !== "number" ||
          !Number.isInteger(answer) ||
          answer < 0 ||
          answer >= question.options.length
        ) {
          res.status(400).json({
            message: "One or more answers are invalid.",
          });
          return;
        }
      }

      let score = 0;

      for (const question of questions) {
        if (answers[String(question.id)] === question.correctAnswer) {
          score++;
        }
      }

      const total = questions.length;

      const percentage =
        total > 0 ? Math.round((score / total) * 100) : 0;

      const savedResult = await QuizResult.create({
        userId: req.userId,
        score,
        total,
        percentage,
        answers,
      });

      res.status(201).json({
        message: `You scored ${score} out of ${total}!`,
        resultId: savedResult._id.toString(),
        score,
        total,
        percentage,
      });
    } catch (error) {
      console.error("Error saving quiz result:", error);

      res.status(500).json({
        message: "Could not save quiz result.",
      });
    }
  }
);

// Get results for the logged-in user
app.get(
  "/api/results",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const results = await QuizResult.find({
        userId: req.userId,
      })
        .select("score total percentage createdAt")
        .sort({ createdAt: -1 })
        .limit(20);

      res.json(results);
    } catch (error) {
      console.error("Error fetching results:", error);

      res.status(500).json({
        message: "Could not fetch quiz results.",
      });
    }
  }
);

// Leaderboard
app.get("/api/leaderboard", async (_req: Request, res: Response) => {
  try {
    const leaderboard = await QuizResult.aggregate([
      {
        $group: {
          _id: "$userId",
          bestScore: {
            $max: "$score",
          },
          total: {
            $max: "$total",
          },
          bestPercentage: {
            $max: "$percentage",
          },
        },
      },
      {
        $sort: {
          bestScore: -1,
          bestPercentage: -1,
        },
      },
      {
        $limit: 10,
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      {
        $unwind: "$student",
      },
      {
        $project: {
          _id: 0,
          name: "$student.name",
          score: "$bestScore",
          total: 1,
          percentage: "$bestPercentage",
        },
      },
    ]);

    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);

    res.status(500).json({
      message: "Could not fetch leaderboard.",
    });
  }
});

// Connect to MongoDB and start the server
async function startServer(): Promise<void> {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGO_URI is missing from the environment variables."
      );
    }

    await mongoose.connect(mongoUri);

    console.log("Connected to MongoDB successfully!");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

void startServer();
