import { motion, type Variants } from "motion/react";
import type { CSSProperties } from "react";
import { useProfile } from "../../content/ProfileContext";
import { ACCENTS, formatMonth, initials, SectionHeading } from "./shared";
import "./Experience.css";

const listReveal: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const badgeReveal: Variants = {
  hidden: { opacity: 0, scale: 0.85, y: 14 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
    y: 0,
  },
};

/** Education & certifications section: studies as levels completed, certifications as unlocked achievements. */
export function EducationSection() {
  const profile = useProfile();
  // Oldest first: level 1 is where it started.
  const levels = [...profile.education].reverse();
  const certifications = [...profile.certifications].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="xs-g">

      <SectionHeading eyebrow="Education & certifications" title="What I've studied." />

      <div className="xs-g__layout">
        <div className="xs-g__levels">
          <p className="xs-g__group">Levels</p>
          {levels.map((study, index) => (
            <article className="xs-g__level" key={study.degree}>
              <span className="xs-g__level-number">
                <small>LVL</small>
                {index + 1}
              </span>
              <div className="xs-g__level-body">
                <h3>{study.degree}</h3>
                <p>
                  {study.school} · {study.start}–{study.end}
                </p>
                <div aria-hidden="true" className="xs-g__bar">
                  <motion.span
                    initial={{ width: "0%" }}
                    transition={{ delay: 0.2 + index * 0.2, duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    viewport={{ once: true }}
                    whileInView={{ width: "100%" }}
                  />
                </div>
                <p className="xs-g__level-meta">
                  <span>✓ Completed</span>
                  <b>{study.grade}</b>
                </p>
              </div>
            </article>
          ))}
          <article aria-label="Next level: always learning" className="xs-g__level xs-g__level--next">
            <span className="xs-g__level-number">
              <small>LVL</small>
              {levels.length + 1}
            </span>
            <div className="xs-g__level-body">
              <h3>Always learning</h3>
              <p>Courses, side projects and reviewing a lot of code</p>
              <div aria-hidden="true" className="xs-g__bar xs-g__bar--loading">
                <span />
              </div>
              <p className="xs-g__level-meta">
                <span>In progress…</span>
              </p>
            </div>
          </article>
        </div>

        <div>
          <p className="xs-g__group">
            Achievements <span>{certifications.length} unlocked</span>
          </p>
          <motion.div
            className="xs-g__achievements"
            initial="hidden"
            variants={listReveal}
            viewport={{ amount: 0.3, once: true }}
            whileInView="visible"
          >
            {certifications.map((cert, index) => (
              <motion.a
                className="xs-g__achievement"
                href={cert.url}
                key={cert.name}
                rel="noreferrer"
                style={{ "--metal": ACCENTS[index % ACCENTS.length] } as CSSProperties}
                target="_blank"
                variants={badgeReveal}
              >
                <span aria-hidden="true" className="xs-g__badge">
                  <span>{initials(cert.issuer)}</span>
                </span>
                <span className="xs-g__achievement-text">
                  <span className="xs-g__unlocked">Achievement unlocked · {formatMonth(cert.date)}</span>
                  <strong>{cert.name}</strong>
                  <span className="xs-g__issuer">
                    {cert.issuer} <em>Verify ↗</em>
                  </span>
                </span>
              </motion.a>
            ))}
            <motion.div className="xs-g__achievement xs-g__achievement--locked" variants={badgeReveal}>
              <span aria-hidden="true" className="xs-g__badge">
                <span>?</span>
              </span>
              <span className="xs-g__achievement-text">
                <span className="xs-g__unlocked">Locked</span>
                <strong>Next certification</strong>
                <span className="xs-g__issuer">In progress</span>
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
