import { useState } from "react";

type FormState = "idle" | "submitted";

interface FormFields {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [fields, setFields] = useState<FormFields>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Stub: real API wiring lands in PR 2
    setState("submitted");
  };

  const handleReset = () => {
    setFields({ name: "", email: "", subject: "", message: "" });
    setState("idle");
  };

  if (state === "submitted") {
    return (
      <div className="cf-notice" role="status" aria-live="polite">
        <div className="cf-notice-icon" aria-hidden="true">✓</div>
        <p className="cf-notice-text">Form submission will be wired up in PR 2</p>
        <button
          type="button"
          className="cf-reset"
          onClick={handleReset}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      className="cf-form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Contact form"
    >
      <div className="cf-row">
        <div className="cf-field">
          <label htmlFor="cf-name" className="cf-label">
            Name <span aria-hidden="true">*</span>
          </label>
          <input
            id="cf-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            value={fields.name}
            onChange={handleChange}
            className="cf-input"
            placeholder="Your name"
            aria-required="true"
          />
        </div>
        <div className="cf-field">
          <label htmlFor="cf-email" className="cf-label">
            Email <span aria-hidden="true">*</span>
          </label>
          <input
            id="cf-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={fields.email}
            onChange={handleChange}
            className="cf-input"
            placeholder="you@example.com"
            aria-required="true"
          />
        </div>
      </div>

      <div className="cf-field">
        <label htmlFor="cf-subject" className="cf-label">
          Subject <span className="cf-optional">(optional)</span>
        </label>
        <input
          id="cf-subject"
          name="subject"
          type="text"
          autoComplete="off"
          value={fields.subject}
          onChange={handleChange}
          className="cf-input"
          placeholder="What's this about?"
        />
      </div>

      <div className="cf-field">
        <label htmlFor="cf-message" className="cf-label">
          Message <span aria-hidden="true">*</span>
        </label>
        <textarea
          id="cf-message"
          name="message"
          required
          rows={6}
          value={fields.message}
          onChange={handleChange}
          className="cf-input cf-textarea"
          placeholder="Tell me what you're working on…"
          aria-required="true"
        />
      </div>

      <button type="submit" className="cf-submit">
        Send message <span aria-hidden="true">→</span>
      </button>

      <style>{`
        .cf-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .cf-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        @media (min-width: 480px) {
          .cf-row {
            grid-template-columns: 1fr 1fr;
          }
        }

        .cf-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .cf-label {
          font-family: var(--font-body);
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-ink-faint);
        }

        .cf-optional {
          font-weight: 400;
          text-transform: none;
          letter-spacing: 0;
          font-size: 0.625rem;
          color: var(--color-ink-faint);
        }

        .cf-input {
          font-family: var(--font-body);
          font-size: 0.9375rem;
          font-weight: 400;
          color: var(--color-ink);
          background: transparent;
          border: none;
          border-bottom: 1.5px solid var(--color-rule);
          padding: 0.625rem 0;
          width: 100%;
          outline: none;
          transition: border-color 0.2s;
          appearance: none;
          -webkit-appearance: none;
          border-radius: 0;
        }

        .cf-input::placeholder {
          color: var(--color-ink-faint);
          font-weight: 300;
        }

        .cf-input:focus {
          border-bottom-color: var(--color-ink);
        }

        .cf-textarea {
          resize: vertical;
          min-height: 7rem;
          line-height: 1.65;
          padding-top: 0.5rem;
          border: 1.5px solid var(--color-rule);
          padding-left: 0.75rem;
          padding-right: 0.75rem;
        }

        .cf-textarea:focus {
          border-color: var(--color-ink);
        }

        .cf-submit {
          align-self: flex-start;
          font-family: var(--font-body);
          font-size: 0.875rem;
          font-weight: 600;
          letter-spacing: 0.03em;
          color: var(--color-paper);
          background: var(--color-ink);
          padding: 0.75rem 1.75rem;
          border: none;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: background 0.2s;
        }

        .cf-submit:hover {
          background: var(--color-accent);
        }

        .cf-submit:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 3px;
        }

        /* Submitted state */
        .cf-notice {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 2.5rem 0;
          border-top: 2px solid var(--color-accent);
        }

        .cf-notice-icon {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          background: var(--color-accent);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 700;
        }

        .cf-notice-text {
          font-family: var(--font-body);
          font-size: 1.0625rem;
          font-weight: 400;
          color: var(--color-ink-muted);
          max-width: 38ch;
          line-height: 1.6;
        }

        .cf-reset {
          font-family: var(--font-body);
          font-size: 0.8125rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--color-accent);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .cf-reset:hover {
          color: var(--color-accent-hover);
        }
      `}</style>
    </form>
  );
}
