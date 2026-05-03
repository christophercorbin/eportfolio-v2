import { useState } from "react";

type FormState = "idle" | "submitted";

interface FormFields {
  name: string;
  email: string;
  message: string;
}

export default function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [fields, setFields] = useState<FormFields>({
    name: "",
    email: "",
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
    setFields({ name: "", email: "", message: "" });
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
          Send another message
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
      <div className="cf-field">
        <label htmlFor="cf-name" className="cf-label">
          Your Name
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
          placeholder="Your Name"
          aria-required="true"
        />
      </div>

      <div className="cf-field">
        <label htmlFor="cf-email" className="cf-label">
          Your Email
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

      <div className="cf-field">
        <label htmlFor="cf-message" className="cf-label">
          Your Message
        </label>
        <textarea
          id="cf-message"
          name="message"
          required
          rows={5}
          value={fields.message}
          onChange={handleChange}
          className="cf-input cf-textarea"
          placeholder="Your Message"
          aria-required="true"
        />
      </div>

      <button type="submit" className="cf-submit">
        Send Message
      </button>

      <style>{`
        .cf-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .cf-field {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .cf-label {
          display: none;
        }

        .cf-input {
          width: 100%;
          padding: 1rem;
          border: 2px solid #e9ecef;
          border-radius: 12px;
          font-family: inherit;
          font-size: 1rem;
          color: #333;
          background: white;
          outline: none;
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
          appearance: none;
          -webkit-appearance: none;
        }

        .cf-input::placeholder {
          color: #999;
        }

        .cf-input:focus {
          border-color: #ff9900;
          box-shadow: 0 0 0 3px rgba(255, 153, 0, 0.1);
        }

        .cf-textarea {
          resize: vertical;
          min-height: 120px;
          line-height: 1.6;
        }

        .cf-submit {
          align-self: flex-start;
          font-family: inherit;
          font-size: 1rem;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #ff9900 0%, #146eb4 100%);
          padding: 14px 28px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s ease;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          width: 100%;
          justify-content: center;
        }

        .cf-submit:hover {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(255, 153, 0, 0.3);
        }

        .cf-submit:focus-visible {
          outline: 2px solid #ff9900;
          outline-offset: 3px;
        }

        /* Submitted state */
        .cf-notice {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
          padding: 2rem 0;
        }

        .cf-notice-icon {
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff9900 0%, #146eb4 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(255, 153, 0, 0.3);
        }

        .cf-notice-text {
          font-size: 1rem;
          font-weight: 400;
          color: #666;
          line-height: 1.6;
        }

        .cf-reset {
          font-size: 0.9rem;
          font-weight: 600;
          color: #ff9900;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.2s;
        }

        .cf-reset:hover {
          color: #146eb4;
        }
      `}</style>
    </form>
  );
}
