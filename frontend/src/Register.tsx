
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password.length > 72) {
      setError("Password must be 72 characters or fewer.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      navigate("/login", {
        replace: true,
        state: { message: "Account created successfully. Please log in." },
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="visual-content">
          <div className="brand-mark">Q.</div>
          <p className="eyebrow">YOUR LEARNING JOURNEY STARTS HERE</p>
          <h1>Learn more.<br />Achieve more.</h1>
          <p className="visual-description">
            Challenge yourself, track your progress, and discover
            what you can achieve with every quiz.
          </p>

          <div className="visual-decoration" aria-hidden="true">
            <div className="decor-circle circle-one" />
            <div className="decor-circle circle-two" />
            <div className="decor-circle circle-three" />
            <div className="floating-card">
              <span className="floating-icon">✓</span>
              <div>
                <strong>Keep improving</strong>
                <p>One quiz at a time</p>
              </div>
            </div>
          </div>

          <p className="visual-footer">STUDENT QUIZ APP · LEARN EVERY DAY</p>
        </div>
      </section>

      <section className="auth-form-section">
        <div className="auth-form-wrap">
          <div className="mobile-brand">
            <span className="brand-mark">Q.</span>
            <span>QuizSpace</span>
          </div>

          <div className="form-heading">
            <span className="form-label">CREATE YOUR ACCOUNT</span>
            <h2>Get started today</h2>
            <p>Join us and start testing your knowledge.</p>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              <span>!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="auth-form">
            <div className="field-group">
              <label htmlFor="register-name">Full name</label>
              <input
                id="register-name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                minLength={2}
              />
            </div>

            <div className="field-group">
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="register-password">Password</label>
              <div className="password-wrap">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="field-hint">Use at least 8 characters.</p>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>

          <p className="auth-terms">
            By creating an account, you agree to use the platform responsibly.
          </p>
        </div>
      </section>
    </main>
  );
}
