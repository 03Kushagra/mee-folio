/** Shape of the site content stored in MongoDB (GET /api/profile). Edited at /admin. */

export type RoleTone = "blue" | "orange" | "purple" | "teal" | "yellow";

export type HeroRole = { label: string; tone: RoleTone };

export type Role = {
  company: string;
  /** "YYYY-MM", or null for a current role. */
  end: string | null;
  highlights: string[];
  location: string;
  role: string;
  stack: string[];
  /** "YYYY-MM" */
  start: string;
  type: string;
};

export type Study = {
  degree: string;
  end: string;
  grade: string;
  notes: string;
  school: string;
  start: string;
};

export type Certification = {
  credentialId: string;
  /** "YYYY-MM" */
  date: string;
  issuer: string;
  name: string;
  url: string;
};

export type Stat = { label: string; prefix: string; suffix: string; value: number };

export type Profile = {
  certifications: Certification[];
  contact: { email: string; emailSubject: string; linkedinUrl: string; resumeFileName: string; resumeUrl: string };
  education: Study[];
  evaluator: { platform: string; skills: string[]; stats: Stat[] };
  experience: Role[];
  facts: Array<{ label: string; value: string }>;
  heroRoles: HeroRole[];
  intro: string[];
  location: string;
  name: string;
  /** Shown on the current role in Experience, e.g. "15 days". Empty hides it. */
  noticePeriod: string;
  photoAlt: string;
  photoUrl: string;
  timeZone: string;
};

export const emptyProfile: Profile = {
  certifications: [],
  contact: { email: "", emailSubject: "", linkedinUrl: "", resumeFileName: "", resumeUrl: "" },
  education: [],
  evaluator: { platform: "", skills: [], stats: [] },
  experience: [],
  facts: [],
  heroRoles: [],
  intro: [],
  location: "",
  name: "",
  noticePeriod: "",
  photoAlt: "",
  photoUrl: "",
  timeZone: "Asia/Kolkata",
};

/** Fills in anything missing so components can rely on every field existing. */
export function normalizeProfile(raw: Partial<Profile> | null | undefined): Profile {
  const data = raw ?? {};
  return {
    ...emptyProfile,
    ...data,
    contact: { ...emptyProfile.contact, ...(data.contact ?? {}) },
    evaluator: { ...emptyProfile.evaluator, ...(data.evaluator ?? {}) },
  };
}
