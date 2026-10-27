import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Auth.css";

interface LoginProps {
  onLogin: (token: string, user: { name: string; email: string }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const successMessage = (
    location.state as { message?: string } | null
  )?.message;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      onLogin(data.token, data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      {/* Left-side branding panel */}
      <section className="auth-visual">
        <div className="visual-content">
          <div className="brand-mark">Q.</div>

          <p className="eyebrow">
            WELCOME BACK TO YOUR LEARNING SPACE
          </p>

          <h1>
            Your next
            <br />
            achievement
            <br />
            starts here.
          </h1>

          <p className="visual-description">
            Sign in, challenge your knowledge, and keep moving
            toward your learning goals.
          </p>

          <div className="visual-decoration" aria-hidden="true">
            <div className="decor-circle circle-one" />
            <div className="decor-circle circle-two" />
            <div className="decor-circle circle-three" />

            <div className="floating-card">
              <span className="floating-icon">✓</span>
              <div>
                <strong>Ready to learn?</strong>
                <p>Your next quiz awaits</p>
              </div>
            </div>
          </div>

          <p className="visual-footer">
            STUDENT QUIZ APP · LEARN EVERY DAY
          </p>
        </div>
      </section>

      {/* Right-side login form */}
      <section className="auth-form-section">
        <div className="auth-form-wrap">
          <div className="mobile-brand">
            <span className="brand-mark">Q.</span>
            <span>QuizSpace</span>
          </div>

          <div className="form-heading">
            <span className="form-label">WELCOME BACK</span>
            <h2>Sign in to your account</h2>
            <p>
              Enter your details to continue your learning journey.
            </p>
          </div>

          {successMessage && (
            <div className="auth-success" role="status">
              {successMessage}
            </div>
          )}

          {error && (
            <div className="auth-error" role="alert">
              <span>!</span> {error}
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="login-password">Password</label>

              <div className="password-wrap">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && (
                <span aria-hidden="true">→</span>
              )}
            </button>
          </form>

          <p className="auth-switch">
            Don't have an account?{" "}
            <Link to="/register">Create account</Link>
          </p>

          <p className="auth-terms">
            Welcome back! Keep learning and track your progress.
          </p>
        </div>
      </section>
    </main>
  );
}