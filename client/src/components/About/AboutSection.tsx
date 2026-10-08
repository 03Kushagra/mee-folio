import { motion, type Variants } from "motion/react";
import { useProfile } from "../../content/ProfileContext";
import { HalftonePortrait } from "./HalftonePortrait";
import "./AboutSection.css";

const listReveal: Variants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.15, staggerChildren: 0.08 } },
};

const itemReveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    y: 0,
  },
};

export function AboutSection() {
  const profile = useProfile();
  return (
    <div className="about">
      <div className="about__copy">
        <p className="eyebrow">About</p>
        <h2>
          Hi, I&apos;m {profile.name}.
          <span className="about__headline-accent">I build interfaces people remember.</span>
        </h2>

        {profile.intro.map((paragraph) => (
          <p className="about__paragraph" key={paragraph.slice(0, 24)}>
            {paragraph}
          </p>
        ))}

        <motion.dl
          className="about__facts"
          initial="hidden"
          variants={listReveal}
          viewport={{ amount: 0.6, once: true }}
          whileInView="visible"
        >
          {profile.facts.map((fact) => (
            <motion.div className="about__fact" key={fact.label} variants={itemReveal}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </motion.div>
          ))}
        </motion.dl>
      </div>

      <HalftonePortrait alt={profile.photoAlt} src={profile.photoUrl} />
    </div>
  );
}
