import { motion, type Variants } from "motion/react";
import { useEffect, useState } from "react";
import { HeroParticles } from "./components/HeroParticles/HeroParticles";
import { ProjectShowcase } from "./components/ProjectShowcase/ProjectShowcase";
import { RoleBoard } from "./components/RoleBoard/RoleBoard";

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

function App() {
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);

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
          Mee-folio
        </a>

        <nav aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#work">Work</a>
          <a href="#contact">Contact</a>
        </nav>
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
          <HeroParticles />
          <RoleBoard />
        </motion.section>

        <motion.section
          className="content-section"
          id="about"
          initial="hidden"
          variants={sectionReveal}
          viewport={{ amount: 0.35, once: true }}
          whileInView="visible"
        >
          <p className="eyebrow">About</p>
          <h2>A short introduction will live here.</h2>
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
          id="contact"
          initial="hidden"
          variants={sectionReveal}
          viewport={{ amount: 0.35, once: true }}
          whileInView="visible"
        >
          <p className="eyebrow">Contact</p>
          <h2>Let&apos;s build something thoughtful.</h2>
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
