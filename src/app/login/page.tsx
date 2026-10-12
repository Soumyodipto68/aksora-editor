import Link from "next/link";
import { signIn } from "@/auth";
import Logo from "@/components/Logo";

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="login-shell">
        <header className="login-header">
          <Link href="/" aria-label="Benglish home" className="login-brand">
            <Logo textClassName="login-brand-name" />
          </Link>
          <span className="login-header-note">
            <span className="login-status-dot" aria-hidden="true" />
            Your writing space awaits
          </span>
        </header>

        <section className="login-story" aria-labelledby="login-story-title">
          <div className="login-story-copy">
            <span className="login-eyebrow">
              <span className="brand-accent-rule login-eyebrow-mark" />
              A little room to think
            </span>
            <h1 id="login-story-title">
              Good ideas
              <br />
              deserve <span>good space.</span>
            </h1>
            <p>
              A calm, thoughtful place to turn scattered thoughts into
              something worth sharing.
            </p>
          </div>

          <div className="login-preview" aria-label="A preview of the writing workspace">
            <div className="login-preview-top">
              <span className="login-preview-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>untitled thought</span>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className="login-preview-edit"
              >
                <path
                  d="m12.8 3.2 4 4M3.5 16.5l3.6-.7L16 6.9a1.4 1.4 0 0 0-2-2l-8.9 9-.7 2.6Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="login-preview-body">
              <span className="login-preview-label">A note to begin</span>
              <p>
                Start anywhere.
                <br />
                The words will find their way.
              </p>
              <span className="login-preview-cursor" aria-hidden="true" />
            </div>
            <div className="login-preview-footer">
              <span>Just you and the page.</span>
              <span className="login-preview-count">A fresh start</span>
            </div>
            <span className="login-orbit login-orbit-one" aria-hidden="true" />
            <span className="login-orbit login-orbit-two" aria-hidden="true" />
          </div>

          <div className="login-story-foot">
            <span className="login-story-line" />
            <span>Make space for what you want to say.</span>
          </div>
        </section>

        <section className="login-card-wrap" aria-labelledby="login-title">
          <div className="login-card">
            <div className="login-card-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.5 4.75h8.2l4.8 4.8v9.7H5.5A1.5 1.5 0 0 1 4 17.75V6.25a1.5 1.5 0 0 1 1.5-1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M13.5 5v4.5H18M8 13h8M8 16.5h5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span className="login-card-kicker">YOUR WORKSPACE, REIMAGINED</span>
            <h2 id="login-title">Welcome back.</h2>
            <p className="login-card-description">
              Sign in to pick up where your ideas left off.
            </p>

            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/dashboard" });
              }}
            >
              <button type="submit" className="login-google-button">
                <svg
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0"
                >
                  <path
                    fill="#EA4335"
                    d="M24 11.9c3 0 5.7 1 7.8 3l5.8-5.8C34.1 5.9 29.5 4 24 4 16 4 9.1 8.5 5.8 15.1l6.8 5.2c1.6-4.8 6.1-8.4 11.4-8.4z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v9.02h12.88c-.58 2.96-2.24 5.46-4.7 7.15l7.28 5.65c4.25-3.92 6.7-9.69 6.7-17.27Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M12.6 27.7A12 12 0 0 1 12 24c0-1.3.2-2.5.6-3.7v-5.2H5.8A20 20 0 0 0 4 24c0 3.2.7 6.3 1.8 8.9l6.8-5.2z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5c-1.8 1.2-4.1 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.2C9.1 39.5 16 44 24 44Z"
                  />
                </svg>
                <span>Continue with Google</span>
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className="login-google-arrow h-4 w-4"
                >
                  <path
                    d="M4 10h12m-5-5 5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>

            <div className="login-divider" aria-hidden="true">
              <span />
              <i className="brand-accent-rule" />
              <span />
            </div>

            <div className="login-reassurance">
              <svg
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <path
                  d="M10 2.5 3.5 5v4.3c0 4 2.8 6.7 6.5 8.2 3.7-1.5 6.5-4.2 6.5-8.2V5L10 2.5Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="m7.5 9.8 1.7 1.7 3.5-3.6"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Quick, secure sign-in with your Google account</span>
            </div>
          </div>
          <p className="login-card-footnote">
            New to Benglish? Your workspace will be ready when you sign in.
          </p>
        </section>

        <footer className="login-footer">
          <span>Thoughtfully made for the way you write.</span>
          <Link href="/" className="login-home-link">
            Back to home
            <svg
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="h-3.5 w-3.5"
            >
              <path
                d="M10 3 5 8l5 5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </footer>
      </div>
    </main>
  );
}
