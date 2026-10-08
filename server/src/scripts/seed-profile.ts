/**
 * One-time setup: puts starter content into the database so the site has something
 * to show. After this, edit everything from the /admin page.
 *
 *   npm run seed:profile --workspace server            (only if there is no profile yet)
 *   npm run seed:profile --workspace server -- --force (overwrite the current profile)
 *
 * The content below is placeholder text (marked TODO) — replace it in the admin page.
 */
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Profile } from "../models/profile.model.js";

const starter = {
  name: "Kushagra",
  heroRoles: [
    { label: "AI Code Evaluator", tone: "purple" },
    { label: "Frontend Engineer", tone: "blue" },
    { label: "Full-stack Developer", tone: "orange" },
    { label: "Creative Technologist", tone: "teal" },
    { label: "Product-minded Engineer", tone: "yellow" },
  ],
  // TODO: drop your photo into client/public/images/ and point this at it
  // (a portrait-ish crop with a plain background works best for the halftone effect).
  photoUrl: "/images/portrait-placeholder.svg",
  photoAlt: "Portrait of Kushagra",
  location: "India",
  noticePeriod: "15 days",
  timeZone: "Asia/Kolkata",

  // TODO: rewrite in your own voice.
  intro: [
    "I'm a full-stack developer who cares about the last 10% — the motion, the edge cases and the small details that make software feel considered.",
    "Most days I'm building React and Node products end to end. On the side I evaluate AI-generated code, which has made me a sharper reviewer of my own work: I read code the way a model would get it wrong.",
  ],
  facts: [
    { label: "Focus", value: "Frontend & full-stack" },
    { label: "Stack", value: "TypeScript · React · Node · MongoDB" },
    { label: "Also", value: "AI code evaluation" },
    { label: "Currently", value: "Open to freelance & full-time" },
  ],

  contact: {
    email: "agrawal.kushagra@outlook.com",
    emailSubject: "Hello from your portfolio",
    // TODO: your LinkedIn profile, e.g. https://www.linkedin.com/in/your-name
    linkedinUrl: "",
    // TODO: replace client/public/resume.pdf with your real resume
    resumeUrl: "/resume.pdf",
    resumeFileName: "Kushagra-Resume.pdf",
  },

  evaluator: {
    platform: "Alignerr",
    // TODO: real numbers.
    stats: [
      { prefix: "", value: 200, suffix: "+", label: "AI code tasks reviewed" },
      { prefix: "", value: 600, suffix: "+", label: "hours of evaluation" },
      { prefix: "", value: 8, suffix: " mo", label: "and counting" },
    ],
    skills: [
      "Python",
      "TypeScript",
      "SQL",
      "Correctness",
      "Edge cases",
      "Rubric writing",
      "Response ranking",
    ],
  },

  // TODO: all placeholder — replace with your real roles (newest first).
  // Dates are "YYYY-MM"; end: null means "present".
  experience: [
    {
      company: "Alignerr",
      end: null,
      highlights: [
        "Review and rank AI-generated code against strict, project-specific rubrics",
        "Write detailed feedback that is used to train the next generation of models",
        "Specialise in correctness and edge-case testing for Python and TypeScript",
      ],
      location: "Remote",
      role: "AI Code Evaluator",
      stack: ["Python", "TypeScript", "SQL"],
      start: "2025-02",
      type: "Freelance",
    },
    {
      company: "Company Name",
      end: "2025-01",
      highlights: [
        "Built and shipped customer-facing dashboards used by thousands of people",
        "Cut page load time by 40% by splitting bundles and caching API data",
        "Set up a shared component library used across three products",
      ],
      location: "City, India",
      role: "Frontend Engineer",
      stack: ["React", "TypeScript", "Node"],
      start: "2023-07",
      type: "Full-time",
    },
    {
      company: "Startup Name",
      end: "2023-06",
      highlights: [
        "Built landing pages and internal tools end to end",
        "Added the first automated tests to the codebase",
      ],
      location: "Remote",
      role: "Web Developer Intern",
      stack: ["JavaScript", "Express", "MongoDB"],
      start: "2023-01",
      type: "Internship",
    },
  ],

  // TODO: placeholder — your studies (newest first).
  education: [
    {
      degree: "B.Tech, Computer Science & Engineering",
      end: "2023",
      grade: "CGPA 8.4 / 10",
      notes: "Coursework: data structures, databases, operating systems, computer networks.",
      school: "Your University",
      start: "2019",
    },
    {
      degree: "Senior Secondary (Class XII), Science",
      end: "2019",
      grade: "92%",
      notes: "Physics, Chemistry, Mathematics, Computer Science.",
      school: "Your School",
      start: "2017",
    },
  ],

  // TODO: placeholder — your certifications. `url` should point to the verification page.
  certifications: [
    {
      credentialId: "ABC123XYZ",
      date: "2024-08",
      issuer: "Meta",
      name: "Front-End Developer Professional Certificate",
      url: "#",
    },
    {
      credentialId: "AWS-CP-0000",
      date: "2024-03",
      issuer: "Amazon Web Services",
      name: "Cloud Practitioner",
      url: "#",
    },
    {
      credentialId: "MDB-0000",
      date: "2023-11",
      issuer: "MongoDB",
      name: "Associate Developer (Node.js)",
      url: "#",
    },
    {
      credentialId: "GPE-0000",
      date: "2025-05",
      issuer: "Google",
      name: "Prompting Essentials",
      url: "#",
    },
  ],
};

const force = process.argv.includes("--force");

if (!env.mongoUri) {
  console.error("MONGO_URI / MONGODB_URI is not set in server/.env");
  process.exit(1);
}

await mongoose.connect(env.mongoUri);
try {
  const existing = await Profile.findOne({ key: "main" });
  if (existing && !force) {
    console.log("A profile already exists. Nothing changed (use --force to overwrite).");
  } else {
    await Profile.findOneAndUpdate({ key: "main" }, { $set: { ...starter, key: "main" } }, { upsert: true });
    console.log(existing ? "Profile overwritten with starter content." : "Starter profile created.");
  }
} finally {
  await mongoose.disconnect();
}
