
import { useCallback, useEffect, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
} from "react-router-dom";
import "./App.css";
import Login from "./Login";
import Register from "./Register";
import MyResults from "./MyResults";

interface Question {
  id: number;
  question: string;
  options: string[];
}

interface QuizResult {
  score: number;
  total: number;
  percentage?: number;
}

interface User {
  name: string;
  email: string;
}

interface QuizProps {
  token: string;
  user: User;
  onLogout: () => void;
}

const API_URL = "https://student-quiz-backend-z9jt.onrender.com";

function App() {
  const [token, setToken] = useState(
    () => sessionStorage.getItem("quizToken") || ""
  );

  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = sessionStorage.getItem("quizUser");
      return savedUser ? JSON.parse(savedUser) as User : null;
    } catch {
      return null;
    }
  });

  const handleLogin = (newToken: string, newUser: User) => {
    sessionStorage.setItem("quizToken", newToken);
    sessionStorage.setItem("quizUser", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("quizToken");
    sessionStorage.removeItem("quizUser");
    setToken("");
    setUser(null);
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={
          token && user ? (
            <Navigate to="/" replace />
          ) : (
            <Login onLogin={handleLogin} />
          )
        }
      />

      <Route
        path="/register"
        element={
          token && user ? (
            <Navigate to="/" replace />
          ) : (
            <Register />
          )
        }
      />

      <Route
        path="/"
        element={
          token && user ? (
            <Quiz
              token={token}
              user={user}
              onLogout={handleLogout}
            />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route
        path="/results"
        element={
          token && user ? (
            <MyResults />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Quiz({ token, user, onLogout }: QuizProps) {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(120);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/api/questions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load questions.");
        }

        setQuestions(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not connect to the server."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [token]);

  const submitQuiz = useCallback(async () => {
    if (submitting || result !== null || questions.length === 0) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not submit the quiz.");
      }

      setResult({
        score: data.score,
        total: data.total,
        percentage:
          data.percentage ??
          (data.total > 0
            ? Math.round((data.score / data.total) * 100)
            : 0),
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not submit your answers."
      );
    } finally {
      setSubmitting(false);
    }
  }, [answers, questions.length, result, submitting, token]);

  useEffect(() => {
    if (loading || result !== null || questions.length === 0) {
      return;
    }

    if (timeLeft <= 0) {
      void submitQuiz();
      return;
    }

    const timer = window.setTimeout(() => {
      setTimeLeft((previous) => previous - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [timeLeft, loading, result, questions.length, submitQuiz]);

  const restartQuiz = () => {
    setAnswers({});
    setCurrent(0);
    setResult(null);
    setTimeLeft(120);
    setError("");

    // Reload the questions and start a fresh attempt.
    window.location.reload();
  };

  const progress =
    questions.length > 0
      ? Math.round((Object.keys(answers).length / questions.length) * 100)
      : 0;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <main className="quiz-container">
        <h2>Loading quiz...</h2>
      </main>
    );
  }

  if (error && questions.length === 0) {
    return (
      <main className="quiz-container">
        <h2>Unable to load quiz</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
        <button onClick={onLogout}>Logout</button>
      </main>
    );
  }

  if (questions.length === 0) {
    return (
      <main className="quiz-container">
        <h2>No questions available.</h2>
        <button onClick={onLogout}>Logout</button>
      </main>
    );
  }

  return (
    <main className="quiz-container">
      <header className="quiz-header">
        <div>
          <h1>Student Quiz App</h1>
          <p>Welcome, {user.name}!</p>
        </div>

        <nav className="quiz-navigation">
          <Link to="/results">My Results</Link>
          <button onClick={onLogout}>Logout</button>
        </nav>
      </header>

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

      {result === null ? (
        <>
          <section className="quiz-info">
            <p>
              Question {current + 1} of {questions.length}
            </p>

            <p>
              Time left: <strong>{formatTime(timeLeft)}</strong>
            </p>
          </section>

          <div
            className="progress-track"
            aria-label={`Answered ${Object.keys(answers).length} of ${questions.length} questions`}
          >
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p>
            Answered {Object.keys(answers).length} of {questions.length}
            questions
          </p>

          <section className="question-card">
            <h2>{questions[current].question}</h2>

            <div className="options-list">
              {questions[current].options.map((option, index) => (
                <label
                  key={index}
                  className="option-item"
                >
                  <input
                    type="radio"
                    name={`question-${questions[current].id}`}
                    checked={answers[questions[current].id] === index}
                    onChange={() =>
                      setAnswers((previous) => ({
                        ...previous,
                        [questions[current].id]: index,
                      }))
                    }
                  />

                  <span>{option}</span>
                </label>
              ))}
            </div>
          </section>

          <div className="quiz-controls">
            <button
              onClick={() => setCurrent((previous) => previous - 1)}
              disabled={current === 0 || submitting}
            >
              Previous
            </button>

            {current < questions.length - 1 ? (
              <button
                onClick={() => setCurrent((previous) => previous + 1)}
                disabled={submitting}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => void submitQuiz()}
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            )}
          </div>
        </>
      ) : (
        <section className="result-card">
          <h2>Quiz Completed!</h2>

          <p>
            Your Score:{" "}
            <strong>
              {result.score} / {result.total}
            </strong>
          </p>

          <p>
            Percentage:{" "}
            <strong>
              {result.percentage ??
                Math.round((result.score / result.total) * 100)}
              %
            </strong>
          </p>

          <p>Your result has been submitted.</p>

          <div className="quiz-controls">
            <button onClick={() => navigate("/results")}>
              View My Results
            </button>

            <button onClick={restartQuiz}>
              Try Again
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
