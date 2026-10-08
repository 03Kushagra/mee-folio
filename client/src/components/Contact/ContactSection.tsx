import { motion, type Variants } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useProfile } from "../../content/ProfileContext";
import type { Profile } from "../../content/types";
import { looksLikePlaceholderName } from "./nameCheck";
import "./ContactSection.css";

const RESUME_KEY = "mee-folio:resume-visitor";
const PROVIDER_KEY = "mee-folio:mail-provider";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type ProviderId = "gmail" | "outlook" | "yahoo" | "app";

const cardsReveal: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardReveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    y: 0,
  },
};

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); everything still works without it.
  }
}

function providerForEmail(email: string): ProviderId | null {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (/^(gmail|googlemail)\./.test(domain)) return "gmail";
  if (/^(outlook|hotmail|live|msn)\./.test(domain)) return "outlook";
  if (/^(yahoo|ymail|rocketmail)\./.test(domain)) return "yahoo";
  return null;
}

function mailProviders(to: string, subject: string) {
  const t = encodeURIComponent(to);
  const s = encodeURIComponent(subject);
  return [
    { href: `https://mail.google.com/mail/?view=cm&fs=1&to=${t}&su=${s}`, id: "gmail", label: "Gmail" },
    { href: `https://outlook.live.com/mail/0/deeplink/compose?to=${t}&subject=${s}`, id: "outlook", label: "Outlook" },
    { href: `https://compose.mail.yahoo.com/?to=${t}&subject=${s}`, id: "yahoo", label: "Yahoo" },
    { href: `mailto:${to}?subject=${s}`, id: "app", label: "Mail app" },
  ] as const satisfies ReadonlyArray<{ href: string; id: ProviderId; label: string }>;
}

function triggerResumeDownload(contact: Profile["contact"]) {
  const link = document.createElement("a");
  link.href = contact.resumeUrl;
  link.download = contact.resumeFileName || "Resume.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function useLocalTime(timeZone: string) {
  const [time, setTime] = useState(() => formatTime(timeZone));

  useEffect(() => {
    const timer = window.setInterval(() => setTime(formatTime(timeZone)), 30_000);
    return () => window.clearInterval(timer);
  }, [timeZone]);

  return time;
}

function formatTime(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(
    new Date(),
  );
}

/* ---------------- Email card ---------------- */

function EmailCard({ visitorEmail }: { visitorEmail: string }) {
  const { email, emailSubject } = useProfile().contact;
  const [copied, setCopied] = useState(false);
  const [lastUsed, setLastUsed] = useState<ProviderId | null>(
    () => readStorage(PROVIDER_KEY) as ProviderId | null,
  );
  // Prefer the service matching the email they typed in the form, then what they used last time.
  const suggested = providerForEmail(visitorEmail) ?? lastUsed;

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <motion.div className="contact-card contact-card--email" variants={cardReveal}>
      <span className="contact-card__index">01</span>
      <h3>Send an email</h3>
      <div className="contact-card__address">
        <span>{email}</span>
        <button aria-live="polite" className="contact-card__copy" onClick={copyEmail} type="button">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>

      <p className="contact-card__hint">Open a new message in</p>
      <div className="mail-options">
        {mailProviders(email, emailSubject).map((provider) => (
          <a
            className={
              suggested === provider.id ? "mail-option mail-option--suggested" : "mail-option"
            }
            href={provider.href}
            key={provider.id}
            onClick={() => {
              setLastUsed(provider.id);
              writeStorage(PROVIDER_KEY, provider.id);
            }}
            rel="noreferrer"
            target={provider.id === "app" ? undefined : "_blank"}
          >
            <span aria-hidden="true" className={`mail-option__icon mail-option__icon--${provider.id}`}>
              {provider.id === "app" ? "✉" : provider.label[0]}
            </span>
            {provider.label}
          </a>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------------- Resume card ---------------- */

type Visitor = { name: string };
type Status = "idle" | "submitting";

function ResumeCard({ onEmailChange }: { onEmailChange: (email: string) => void }) {
  const { contact } = useProfile();
  const [visitor, setVisitor] = useState<Visitor | null>(() => {
    const saved = readStorage(RESUME_KEY);
    try {
      return saved ? (JSON.parse(saved) as Visitor) : null;
    } catch {
      return null;
    }
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [nameNote, setNameNote] = useState(false);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [justDownloaded, setJustDownloaded] = useState(false);
  // Bumping a counter remounts that field's LED sweep, so it replays on every failed attempt.
  const [ledCount, setLedCount] = useState({ email: 0, name: 0 });
  const flash = (field: "name" | "email") =>
    setLedCount((current) => ({ ...current, [field]: current[field] + 1 }));
  const nameInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const isSuspicious = name.trim().length > 0 && looksLikePlaceholderName(name);

  const submit = async (confirmed = nameConfirmed) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    const website = String(new FormData(formRef.current ?? undefined).get("website") ?? "");

    if (!cleanName) {
      setError("Please add your name.");
      flash("name");
      return;
    }

    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError("That email doesn't look quite right.");
      flash("email");
      return;
    }

    if (looksLikePlaceholderName(cleanName) && !confirmed) {
      setError("");
      setNameNote(true);
      flash("name");
      return;
    }

    setError("");
    setStatus("submitting");

    try {
      const response = await fetch("/api/leads", {
        body: JSON.stringify({ email: cleanEmail, name: cleanName, source: "resume", website }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (response.status === 400) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setError(payload.message ?? "Please check the form and try again.");
        flash(/email/i.test(payload.message ?? "") ? "email" : "name");
        setStatus("idle");
        return;
      }

      if (!response.ok) {
        // Don't block the visitor if the API is down — log it and hand over the resume.
        console.warn(`Lead capture failed with status ${response.status}.`);
      }
    } catch (requestError) {
      console.warn("Lead capture request failed:", requestError);
    }

    const saved = { name: cleanName };
    writeStorage(RESUME_KEY, JSON.stringify(saved));
    setVisitor(saved);
    setJustDownloaded(true);
    setStatus("idle");
    triggerResumeDownload(contact);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit();
  };

  if (visitor) {
    const firstName = visitor.name.split(" ")[0];
    return (
      <motion.div className="contact-card contact-card--resume" variants={cardReveal}>
        <span className="contact-card__index">02</span>
        <h3>{justDownloaded ? `Thanks, ${firstName}!` : `Welcome back, ${firstName}`}</h3>
        <p className="contact-card__text">
          {justDownloaded
            ? "Your download has started. If nothing happened, use the button below. I'll be in touch."
            : "The resume is yours whenever you need it."}
        </p>
        <button className="resume-form__submit" onClick={() => triggerResumeDownload(contact)} type="button">
          Download resume <span aria-hidden="true">↓</span>
        </button>
        <button
          className="resume-form__switch"
          onClick={() => {
            writeStorage(RESUME_KEY, null);
            setVisitor(null);
            setJustDownloaded(false);
          }}
          type="button"
        >
          Not {firstName}?
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div className="contact-card contact-card--resume" variants={cardReveal}>
      <span className="contact-card__index">02</span>
      <h3>Download my resume</h3>
      <p className="contact-card__text">
        Just your name and email, so I know who to follow up with. No newsletters, promise. I
        don&apos;t have time to write them <span aria-label="sweat smile" role="img">😅</span>
      </p>

      <form className="resume-form" noValidate onSubmit={handleSubmit} ref={formRef}>
        <label>
          <span>Name</span>
          <input
            aria-describedby={nameNote && isSuspicious ? "name-note" : undefined}
            autoComplete="name"
            maxLength={100}
            name="name"
            onBlur={() => {
              if (isSuspicious && !nameConfirmed) {
                setNameNote(true);
                flash("name");
              }
            }}
            onChange={(event) => {
              setName(event.target.value);
              setNameConfirmed(false);
              setNameNote(false);
            }}
            placeholder="Your full name"
            ref={nameInputRef}
            required
            type="text"
            value={name}
          />
          {ledCount.name > 0 ? <span aria-hidden="true" className="field-led" key={ledCount.name} /> : null}
        </label>

        {nameNote && isSuspicious && !nameConfirmed ? (
          <p className="resume-form__note" id="name-note" role="status">
            Hmm, “{name.trim()}” doesn&apos;t look like a real name. Is it yours?{" "}
            <button
              onClick={() => {
                setNameConfirmed(true);
                setNameNote(false);
                void submit(true);
              }}
              type="button"
            >
              Yes, that&apos;s me
            </button>
            <span aria-hidden="true"> · </span>
            <button
              onClick={() => {
                setNameNote(false);
                nameInputRef.current?.select();
              }}
              type="button"
            >
              Let me fix it
            </button>
          </p>
        ) : null}

        <label>
          <span>Email</span>
          <input
            autoComplete="email"
            maxLength={254}
            name="email"
            onChange={(event) => {
              setEmail(event.target.value);
              onEmailChange(event.target.value);
            }}
            placeholder="you@company.com"
            required
            type="email"
            value={email}
          />
          {ledCount.email > 0 ? <span aria-hidden="true" className="field-led" key={ledCount.email} /> : null}
        </label>

        {/* Honeypot: hidden from people, often filled in by bots. */}
        <label aria-hidden="true" className="resume-form__trap">
          Website
          <input autoComplete="off" name="website" tabIndex={-1} type="text" />
        </label>

        {error ? (
          <p className="resume-form__error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="resume-form__submit" disabled={status === "submitting"} type="submit">
          {status === "submitting" ? "Preparing…" : "Download resume"} <span aria-hidden="true">↓</span>
        </button>
      </form>
    </motion.div>
  );
}

/* ---------------- Section ---------------- */

export function ContactSection() {
  const profile = useProfile();
  const localTime = useLocalTime(profile.timeZone);
  const [visitorEmail, setVisitorEmail] = useState("");

  return (
    <div className="contact">
      <div className="contact__header">
        <p className="eyebrow">Contact</p>
        <h2>Let&apos;s build something thoughtful.</h2>
        <p className="contact__lede">
          Freelance project, full-time role or an AI evaluation gig: email me directly, or grab my
          resume first.
        </p>
        <p className="contact__status">
          <i aria-hidden="true" />
          It&apos;s {localTime} for me in {profile.location} · I usually reply within a day
        </p>
      </div>

      <motion.div
        className="contact__cards"
        initial="hidden"
        variants={cardsReveal}
        viewport={{ amount: 0.25, once: true }}
        whileInView="visible"
      >
        <EmailCard visitorEmail={visitorEmail} />
        <ResumeCard onEmailChange={setVisitorEmail} />
      </motion.div>
    </div>
  );
}
