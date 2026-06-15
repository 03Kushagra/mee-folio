import { HeroParticles } from "./components/HeroParticles/HeroParticles";
import { RoleBoard } from "./components/RoleBoard/RoleBoard";

function App() {
  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="brand" href="#home" aria-label="Mee-folio home">
          Mee-folio
        </a>

        <nav aria-label="Main navigation">
          <a href="#about">About</a>
          <a href="#work">Work</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <main>
        <section className="hero" id="home">
          <HeroParticles />
          <RoleBoard />
        </section>

        <section className="content-section" id="about">
          <p className="eyebrow">About</p>
          <h2>A short introduction will live here.</h2>
        </section>

        <section className="content-section" id="work">
          <p className="eyebrow">Selected work</p>
          <h2>Projects are coming soon.</h2>
        </section>

        <section className="content-section" id="contact">
          <p className="eyebrow">Contact</p>
          <h2>Let&apos;s build something thoughtful.</h2>
        </section>
      </main>

      <footer>
        <p>Built with TypeScript, React, Node.js, and MongoDB.</p>
      </footer>
    </div>
  );
}

export default App;
