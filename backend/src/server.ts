
import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dns from "node:dns";


import { questions } from "./questions";
import QuizResult from "./QuizResult";
import User from "./User";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from the .env file.");
}

app.use(cors());
app.use(express.json());

// -------------------- AUTHENTICATION MIDDLEWARE --------------------

interface AuthRequest extends Request {
  userId?: string;
}

function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    res.status(401).json({ message: "Please log in first." });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    if (typeof decoded.userId !== "string") {
      res.status(401).json({ message: "Invalid token." });
      return;
    }

    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({
      message: "Your login session is invalid or expired. Please log in again.",
    });
  }
}

// -------------------- REGISTER API --------------------

app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body ?? {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
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
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    // Handles concurrent registrations with the same email.
    if ((error as { code?: number }).code === 11000) {
      res.status(409).json({
        message: "An account with this email already exists.",
      });
      return;
    }

    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed." });
  }
});

// -------------------- LOGIN API --------------------

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      password.length === 0
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
      { userId: user._id.toString() },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed." });
  }
});

// -------------------- GET QUIZ QUESTIONS --------------------

app.get("/api/questions", (_req: Request, res: Response) => {
  const safeQuestions = questions.map(
    ({ correctAnswer, ...question }) => question
  );

  res.json(safeQuestions);
});

// -------------------- SUBMIT QUIZ (LOGIN REQUIRED) --------------------

app.post(
  "/api/submit",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body as {
        answers?: Record<string, unknown>;
      };

      const answers = body?.answers;

      if (
        !answers ||
        typeof answers !== "object" ||
        Array.isArray(answers)
      ) {
        res.status(400).json({
          message: "Please provide valid answers.",
        });
        return;
      }

      // Validate answer IDs and selected option indexes.
      const validQuestionIds = new Set(
        questions.map((question) => String(question.id))
      );

      for (const [questionId, answer] of Object.entries(answers)) {
        if (
          !validQuestionIds.has(questionId) ||
          !Number.isInteger(answer) ||
          (answer as number) < 0 ||
          (answer as number) >=
            questions.find((q) => String(q.id) === questionId)!.options.length
        ) {
          res.status(400).json({
            message: "One or more answers are invalid.",
          });
          return;
        }
      }

      let score = 0;

      questions.forEach((question) => {
        if (answers[String(question.id)] === question.correctAnswer) {
          score++;
        }
      });

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
        resultId: savedResult._id,
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

// -------------------- GET LOGGED-IN USER'S RESULTS --------------------

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

// -------------------- LEADERBOARD --------------------

app.get("/api/leaderboard", async (_req: Request, res: Response) => {
  try {
    const leaderboard = await QuizResult.aggregate([
      {
        $group: {
          _id: "$userId",
          bestScore: { $max: "$score" },
          total: { $max: "$total" },
          bestPercentage: { $max: "$percentage" },
        },
      },
      { $sort: { bestScore: -1, bestPercentage: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: "$student" },
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

// -------------------- START SERVER --------------------

async function startServer() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI ??
        "mongodb://127.0.0.1:27017/studentQuizDB"
    );

    console.log("Connected to MongoDB successfully!");

    app.listen(PORT, () => {
      console.log(`Backend server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
}

void startServer();
