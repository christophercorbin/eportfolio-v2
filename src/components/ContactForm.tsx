import { useState } from "react";

type FormState = "idle" | "sending" | "success" | "error";

interface FormFields {
  name: string;
  email: string;
  message: string;
}

/**
 * Contact API endpoint (Lambda Function URL from the Amplify Gen 2 backend).
 * Injected at build time via PUBLIC_CONTACT_API_URL — see amplify.yml,
 * which extracts it from amplify_outputs.json after backend deploy.
 */
const API_URL: string | undefined = import.meta.env.PUBLIC_CONTACT_API_URL;

const FALLBACK_EMAIL = "christophercorbin24@gmail.com";

export default function ContactForm() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (state === "sending") return;

    if (!API_URL) {
      // Backend not deployed yet — fall back to a pre-filled mailto.
      const subject = encodeURIComponent(`Portfolio contact from ${fields.name}`);
      const body = encodeURIComponent(`${fields.message}\n\n— ${fields.name} (${fields.email})`);
      window.location.href = `mailto:${FALLBACK_EMAIL}?subject=${subject}&body=${body}`;
      return;
    }

    setState("sending");
    setErrorMessage("");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }

      setState("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong"
      );
      setState("error");
    }
  };

  const handleReset = () => {
    setFields({ name: "", email: "", message: "" });
    setState("idle");
    setErrorMessage("");
  };

  if (state === "success") {
    return (
      <div className="cf-notice" role="status" aria-live="polite">
        <div className="cf-notice-icon" aria-hidden="true">✓</div>
        <p className="cf-notice-text">
          Thanks for reaching out — your message has been sent. I'll get back
          to you soon.
        </p>
        <button type="button" className="cf-reset" onClick={handleReset}>
          Send another message
        </button>
        <style>{noticeStyles}</style>
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
          disabled={state === "sending"}
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
          disabled={state === "sending"}
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
          disabled={state === "sending"}
        />
      </div>

      {state === "error" && (
        <p className="cf-error" role="alert">
          Couldn't send your message ({errorMessage}). Please try again, or
          email me directly at{" "}
          <a href={`mailto:${FALLBACK_EMAIL}`}>{FALLBACK_EMAIL}</a>.
        </p>
      )}

      <button type="submit" className="cf-submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send Message"}
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

        .cf-input:disabled {
          opacity: 0.6;
        }

        .cf-textarea {
          resize: vertical;
          min-height: 120px;
          line-height: 1.6;
        }

        .cf-error {
          font-size: 0.9rem;
          color: #c0392b;
          line-height: 1.5;
          margin: 0;
        }

        .cf-error a {
          color: #ff9900;
          text-decoration: underline;
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

        .cf-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 40px rgba(255, 153, 0, 0.3);
        }

        .cf-submit:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .cf-submit:focus-visible {
          outline: 2px solid #ff9900;
          outline-offset: 3px;
        }
      `}</style>
    </form>
  );
}

const noticeStyles = `
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
`;
