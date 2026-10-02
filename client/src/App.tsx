import { motion, type Variants } from "motion/react";
import { useEffect, useState } from "react";
import { AboutSection } from "./components/About/AboutSection";
import { ContactSection } from "./components/Contact/ContactSection";
import { EvaluatorSection } from "./components/Evaluator/EvaluatorSection";
import { EducationSection } from "./components/Experience/EducationSection";
import { ExperienceSection } from "./components/Experience/ExperienceSection";
import { BlueprintHero } from "./components/BlueprintHero/BlueprintHero";
import { ProjectShowcase } from "./components/ProjectShowcase/ProjectShowcase";

const sectionReveal: Variants = {
  hidden: {
    filter: "blur(10px)",
    opacity: 0,
    y: 48,
  },
  visible: {
    filter: "blur(0px)",
    opacity: 1,
    transition: {
      duration: 0.72,
      ease: [0.22, 1, 0.36, 1],
    },
    y: 0,
  },
};

const navItems = [
  { href: "#about", id: "about", label: "About" },
  { href: "#work", id: "work", label: "Work" },
  { href: "#contact", id: "contact", label: "Contact" },
];

const sectionIds = ["home", "about", "work", "ai-work", "experience", "education", "contact"];

// File-style names shown in the toolbar breadcrumb for each section.
const sectionFiles: Record<string, string> = {
  "ai-work": "ai-work.tsx",
  about: "about.tsx",
  contact: "contact.tsx",
  education: "education.tsx",
  experience: "experience.tsx",
  home: "hero.tsx",
  work: "projects.tsx",
};

function useActiveSection(ids: string[]) {
  const [activeId, setActiveId] = useState(ids[0]);

  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let best = "";
        let bestRatio = 0;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        }
        if (bestRatio > 0) setActiveId(best);
      },
      { threshold: [0, 0.15, 0.3, 0.5, 0.7, 1] },
    );

    for (const id of ids) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [ids]);

  return activeId;
}

function App() {
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const activeSection = useActiveSection(sectionIds);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateHeaderVisibility = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;

      if (currentScrollY <= 12) {
        setIsHeaderHidden(false);
      } else if (scrollDelta > 8) {
        setIsHeaderHidden(true);
      } else if (scrollDelta < -8) {
        setIsHeaderHidden(false);
      }

      lastScrollY = currentScrollY;
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateHeaderVisibility);
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="site-shell">
      <header
        className={`site-header ${isHeaderHidden ? "site-header--hidden" : ""}`}
      >
        <a className="brand" href="#home" aria-label="Mee-folio home">
          <span aria-hidden="true" className="brand__mark" />
          <span>Mee-folio</span>
          <span aria-hidden="true" className="brand__path">
            / {sectionFiles[activeSection] ?? "hero.tsx"}
          </span>
        </a>

        <nav aria-label="Main navigation">
          {navItems.map((item) => (
            <a
              aria-current={activeSection === item.id ? "true" : undefined}
              className={activeSection === item.id ? "nav-link nav-link--active" : "nav-link"}
              href={item.href}
              key={item.id}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a className="toolbar-cta" href="#contact">
          <span aria-hidden="true" className="toolbar-cta__dot" />
          Open to work
        </a>
      </header>

      <motion.main
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="hero"
          id="home"
          initial={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <BlueprintHero />
        </motion.section>

        <motion.section
          className="content-section"
          id="about"
          initial="hidden"
          variants={sectionReveal}
          viewport={{ amount: 0.2, once: true }}
          whileInView="visible"
        >
          <AboutSection />
        </motion.section>

        <motion.section
          className="content-section content-section--work"
          id="work"
          initial="hidden"
          variants={sectionReveal}
          viewport={{ amount: 0.2, once: true }}
          whileInView="visible"
        >
          <ProjectShowcase />
        </motion.section>

        <motion.section
          className="content-section"
          id="ai-work"
          initial="hidden"
          variants={sectionReveal}
          viewport={{ amount: 0.15, once: true }}
          whileInView="visible"
        >
          <EvaluatorSection />
        </motion.section>

        <motion.section
          className="content-section"
          id="experience"
          initial="hidden"
          variants={sectionReveal}
          viewport={{ amount: 0.15, once: true }}
          whileInView="visible"
        >
          <ExperienceSection />
        </motion.section>

        <motion.section
          className="content-section"
          id="education"
          initial="hidden"
          variants={sectionReveal}
          viewport={{ amount: 0.15, once: true }}
          whileInView="visible"
        >
          <EducationSection />
        </motion.section>

        <motion.section
          className="content-section"
          id="contact"
          initial="hidden"
          variants={sectionReveal}
          viewport={{ amount: 0.15, once: true }}
          whileInView="visible"
        >
          <ContactSection />
        </motion.section>
      </motion.main>

      <motion.footer
        initial="hidden"
        variants={sectionReveal}
        viewport={{ amount: 0.4, once: true }}
        whileInView="visible"
      >
        <p>Built with TypeScript, React, Node.js, and MongoDB.</p>
      </motion.footer>
    </div>
  );
}

export default App;
