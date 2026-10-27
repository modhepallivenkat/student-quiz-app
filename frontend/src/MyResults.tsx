
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface QuizResult {
  _id: string;
  score: number;
  total: number;
  percentage: number;
  createdAt: string;
}

export default function MyResults() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResults() {
      const token = sessionStorage.getItem("quizToken");

      if (!token) {
        setError("Please log in to view your results.");
        setLoading(false);
        return;
      }

      try {
       const response = await fetch("https://student-quiz-backend-z9jt.onrender.com/api/results", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Your session has expired. Please log in again."
              : "Could not load your results."
          );
        }

        const data: QuizResult[] = await response.json();
        setResults(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadResults();
  }, []);

  return (
    <main className="quiz-container">
      <h1>My Quiz Results</h1>
      <p>Review your previous quiz attempts.</p>

      {loading && <p>Loading your results...</p>}

      {error && <p role="alert">{error}</p>}

      {!loading && !error && results.length === 0 && (
        <p>You haven't completed any quizzes yet.</p>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="results-list">
          {results.map((result) => (
            <article className="result-card" key={result._id}>
              <h2>
                Score: {result.score} / {result.total}
              </h2>
              <p>Percentage: {result.percentage}%</p>
              <p>
                Date:{" "}
                {new Date(result.createdAt).toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      )}

      <Link to="/">Back to Quiz</Link>
    </main>
  );
}
