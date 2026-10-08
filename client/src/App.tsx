import { motion, type Variants } from "motion/react";
import { useEffect, useState, type MouseEvent } from "react";
import { AboutSection } from "./components/About/AboutSection";
import { ContactSection } from "./components/Contact/ContactSection";
import { EvaluatorSection } from "./components/Evaluator/EvaluatorSection";
import { EducationSection } from "./components/Experience/EducationSection";
import { ExperienceSection } from "./components/Experience/ExperienceSection";
import { BlueprintHero } from "./components/BlueprintHero/BlueprintHero";
import { ProjectShowcase } from "./components/ProjectShowcase/ProjectShowcase";
import { ScrollHint } from "./components/ScrollHint/ScrollHint";
import { useProfile } from "./content/ProfileContext";
import { enableSmoothWheel, isProgrammaticScroll } from "./lib/smoothScroll";

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

/** Logo click: glide to the very top and drop any #section from the address bar. */
function scrollToTop(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  window.scrollTo({ behavior: "smooth", top: 0 });
  history.replaceState(null, "", window.location.pathname + window.location.search);
}

function App() {
  const profile = useProfile();
  const hasExperience = profile.experience.length > 0;
  const hasEducation = profile.education.length > 0 || profile.certifications.length > 0;
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const activeSection = useActiveSection(sectionIds);

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const updateHeaderVisibility = () => {
      const currentScrollY = window.scrollY;
      // Ignore the scroll hint's nudge so the toolbar doesn't flicker.
      if (isProgrammaticScroll()) {
        lastScrollY = currentScrollY;
        ticking = false;
        return;
      }
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

  useEffect(() => enableSmoothWheel(), []);

  return (
    <div className="site-shell">
      <ScrollHint />
      <header
        className={`site-header ${isHeaderHidden ? "site-header--hidden" : ""}`}
      >
        <a aria-label="Mee-folio, back to top" className="brand" href="#home" onClick={scrollToTop}>
          <span aria-hidden="true" className="brand__mark" />
          <span>Mee-folio</span>
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

        <div className="toolbar-actions">
          {profile.contact.linkedinUrl && (
            <a
              aria-label="LinkedIn profile (opens in a new tab)"
              className="toolbar-linkedin"
              href={profile.contact.linkedinUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <svg aria-hidden="true" height="14" viewBox="0 0 24 24" width="14">
                <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
              </svg>
              <span className="toolbar-linkedin__text">LinkedIn</span>
            </a>
          )}
          <a className="toolbar-cta" href="#contact">
            <span aria-hidden="true" className="toolbar-cta__dot" />
            Open to work
          </a>
        </div>
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

        {hasExperience && (
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
        )}

        {hasEducation && (
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
        )}

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
