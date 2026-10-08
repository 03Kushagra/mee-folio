import {
  animate,
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useProfile } from "../../content/ProfileContext";
import "./EvaluatorSection.css";

type Verdict = "pass" | "warn" | "fail";

type Review = {
  annotations: Array<{ line: number; note: string; verdict: Verdict }>;
  file: string;
  id: string;
  lines: string[];
  prompt: string;
  score: number;
  summary: string;
};

const reviews: Review[] = [
  {
    annotations: [
      { line: 2, note: "Mutates the caller's list in place", verdict: "warn" },
      { line: 3, note: "Duplicates break it: [5, 5, 3] → 5", verdict: "fail" },
    ],
    file: "response_b.py",
    id: "second-largest",
    lines: ["def second_largest(nums):", "    nums.sort()", "    return nums[-2]"],
    prompt: "Return the second largest unique number.",
    score: 2,
    summary: "Ranked below response A — fails the uniqueness requirement.",
  },
  {
    annotations: [
      { line: 1, note: "id is not URL-encoded", verdict: "warn" },
      { line: 3, note: "No res.ok check — a 404 body parses as a user", verdict: "fail" },
    ],
    file: "getUser.ts",
    id: "get-user",
    lines: [
      "async function getUser(id: string) {",
      "  const res = await fetch(`/api/users/${id}`);",
      "  return res.json();",
      "}",
    ],
    prompt: "Fetch a user by id and return it.",
    score: 3,
    summary: "Works on the happy path; error handling needs a rewrite.",
  },
  {
    annotations: [
      { line: 2, note: "Guards invalid sizes explicitly", verdict: "pass" },
      { line: 4, note: "O(n), never mutates the input", verdict: "pass" },
    ],
    file: "chunk.ts",
    id: "chunk",
    lines: [
      "function chunk<T>(items: T[], size: number): T[][] {",
      '  if (size < 1) throw new RangeError("size must be >= 1");',
      "  const out: T[][] = [];",
      "  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));",
      "  return out;",
      "}",
    ],
    prompt: "Split an array into chunks of a given size.",
    score: 5,
    summary: "Correct, idiomatic and well-guarded. Preferred response.",
  },
];

const verdictSymbol: Record<Verdict, string> = { fail: "✕", pass: "✓", warn: "!" };

function CountUp({
  prefix,
  suffix,
  value,
}: {
  prefix: string;
  suffix: string;
  value: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { amount: 0.8, once: true });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) {
      return;
    }

    if (reduceMotion) {
      setDisplay(value);
      return;
    }

    const controls = animate(0, value, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });

    return () => controls.stop();
  }, [isInView, reduceMotion, value]);

  return (
    <span ref={ref}>
      {prefix}
      {display.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

function ReviewConsole() {
  const consoleRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(consoleRef, { amount: 0.4 });
  const reduceMotion = useReducedMotion();
  const [reviewIndex, setReviewIndex] = useState(0);
  const [stage, setStage] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);
  const review = reviews[reviewIndex];
  const verdictStage = review.annotations.length + 1;
  const visibleStage = reduceMotion ? verdictStage : stage;

  useEffect(() => {
    if (!isInView || reduceMotion) {
      return;
    }

    if (stage < verdictStage) {
      const timer = window.setTimeout(() => setStage((current) => current + 1), 1150);
      return () => window.clearTimeout(timer);
    }

    if (!isAutoplay) {
      return;
    }

    const timer = window.setTimeout(() => {
      setReviewIndex((current) => (current + 1) % reviews.length);
      setStage(0);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [isAutoplay, isInView, reduceMotion, stage, verdictStage]);

  const selectReview = (index: number) => {
    setIsAutoplay(false);
    setReviewIndex(index);
    setStage(0);
  };

  const shownAnnotations = review.annotations.slice(0, Math.max(0, visibleStage));
  const flaggedLines = new Map(shownAnnotations.map((item) => [item.line, item.verdict]));

  return (
    <div className="review-console" ref={consoleRef}>
      <div className="review-console__bar">
        <span className="review-console__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="review-console__title">eval-session · {review.file}</span>
        <span className="review-console__live">
          <i aria-hidden="true" /> reviewing
        </span>
      </div>

      <div className="review-console__tabs" role="tablist" aria-label="Sample reviews">
        {reviews.map((item, index) => (
          <button
            aria-selected={index === reviewIndex}
            className="review-console__tab"
            key={item.id}
            onClick={() => selectReview(index)}
            role="tab"
            type="button"
          >
            Task {String(index + 1).padStart(2, "0")}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          animate={{ opacity: 1 }}
          className="review-console__body"
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          initial={{ opacity: 0 }}
          key={review.id}
        >
          <p className="review-console__prompt">
            <span>prompt</span> {review.prompt}
          </p>

          <ol className="review-console__code">
            {review.lines.map((line, index) => {
              const lineNumber = index + 1;
              const verdict = flaggedLines.get(lineNumber);

              return (
                <motion.li
                  animate={{ opacity: 1, x: 0 }}
                  className={verdict ? `review-console__line--${verdict}` : undefined}
                  initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                  key={lineNumber}
                  transition={{ delay: index * 0.07, duration: 0.3 }}
                >
                  <span className="review-console__gutter">{lineNumber}</span>
                  <code>{line}</code>
                </motion.li>
              );
            })}
          </ol>

          <ul className="review-console__notes">
            <AnimatePresence>
              {shownAnnotations.map((annotation) => (
                <motion.li
                  animate={{ height: "auto", opacity: 1 }}
                  className={`review-console__note review-console__note--${annotation.verdict}`}
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  key={`${review.id}-${annotation.line}`}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="review-console__badge">
                    {verdictSymbol[annotation.verdict]}
                  </span>
                  <span>
                    <b>L{annotation.line}</b> {annotation.note}
                  </span>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <div
            className={`review-console__verdict ${
              visibleStage >= verdictStage ? "review-console__verdict--shown" : ""
            }`}
          >
            <div className="review-console__score">
              <span>score</span>
              <div className="review-console__meter" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((point) => (
                  <i
                    className={
                      visibleStage >= verdictStage && point <= review.score
                        ? "review-console__pip--on"
                        : undefined
                    }
                    key={point}
                    style={{ transitionDelay: `${point * 90}ms` }}
                  />
                ))}
              </div>
              <strong>{review.score}/5</strong>
            </div>
            <p>{review.summary}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="review-console__footnote">
        Illustrative tasks — real client work is under NDA.
      </p>
    </div>
  );
}

export function EvaluatorSection() {
  const { evaluator } = useProfile();

  return (
    <div className="evaluator">
      <div className="evaluator__intro">
        <p className="eyebrow">Freelance · AI code evaluation</p>
        <h2>I review the code AI writes.</h2>
        <p className="evaluator__lede">
          On {evaluator.platform} I evaluate model-generated code: I run it, break it,
          rank competing responses and write the feedback that trains the next model.
          It&apos;s code review at volume, with a strict rubric.
        </p>

        <dl className="evaluator__stats">
          {evaluator.stats.map((stat) => (
            <div className="evaluator__stat" key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>
                <CountUp prefix={stat.prefix} suffix={stat.suffix} value={stat.value} />
              </dd>
            </div>
          ))}
        </dl>

        <ul className="evaluator__skills" aria-label="What I evaluate">
          {evaluator.skills.map((skill) => (
            <li key={skill}>{skill}</li>
          ))}
        </ul>
      </div>

      <ReviewConsole />
    </div>
  );
}
