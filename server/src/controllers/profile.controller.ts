import type { Request, Response } from "express";
import { Profile } from "../models/profile.model.js";

/*
 * GET  /api/profile  → the site's content (public).
 * PUT  /api/profile  → replace it (admin only). Input is cleaned field by field so only
 *                      known fields, of the right type and a sane length, are saved.
 */

const TONES = ["blue", "orange", "purple", "teal", "yellow"];
const MONTH = /^\d{4}-\d{2}$/;

type Raw = Record<string, unknown>;
const obj = (value: unknown): Raw => (value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {});
const str = (value: unknown, max = 300) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0);
const list = <T>(value: unknown, max: number, map: (item: unknown) => T) =>
  (Array.isArray(value) ? value : []).slice(0, max).map(map);
const strings = (value: unknown, max: number, length = 300) =>
  list(value, max, (item) => str(item, length)).filter(Boolean);

function clean(body: unknown) {
  const input = obj(body);
  const contact = obj(input.contact);
  const evaluator = obj(input.evaluator);

  return {
    name: str(input.name, 80),
    photoUrl: str(input.photoUrl, 1000),
    photoAlt: str(input.photoAlt, 200),
    location: str(input.location, 80),
    noticePeriod: str(input.noticePeriod, 40),
    timeZone: str(input.timeZone, 60) || "Asia/Kolkata",
    intro: strings(input.intro, 6, 1200),
    facts: list(input.facts, 8, (item) => ({ label: str(obj(item).label, 40), value: str(obj(item).value, 120) })),
    heroRoles: list(input.heroRoles, 5, (item) => {
      const tone = str(obj(item).tone, 10);
      return { label: str(obj(item).label, 40), tone: TONES.includes(tone) ? tone : "blue" };
    }).filter((role) => role.label),
    contact: {
      email: str(contact.email, 254),
      emailSubject: str(contact.emailSubject, 150),
      linkedinUrl: /^https?:\/\//i.test(str(contact.linkedinUrl, 300)) ? str(contact.linkedinUrl, 300) : "",
      resumeUrl: str(contact.resumeUrl, 1000),
      resumeFileName: str(contact.resumeFileName, 120),
    },
    evaluator: {
      platform: str(evaluator.platform, 60),
      stats: list(evaluator.stats, 4, (item) => {
        const stat = obj(item);
        return { prefix: str(stat.prefix, 6), value: num(stat.value), suffix: str(stat.suffix, 8), label: str(stat.label, 60) };
      }),
      skills: strings(evaluator.skills, 20, 40),
    },
    experience: list(input.experience, 20, (item) => {
      const role = obj(item);
      const end = str(role.end, 7);
      return {
        role: str(role.role, 80),
        company: str(role.company, 80),
        type: str(role.type, 40),
        location: str(role.location, 80),
        start: str(role.start, 7),
        end: end || null,
        highlights: strings(role.highlights, 8, 300),
        stack: strings(role.stack, 12, 40),
      };
    }),
    education: list(input.education, 10, (item) => {
      const study = obj(item);
      return {
        degree: str(study.degree, 120),
        school: str(study.school, 120),
        start: str(study.start, 7),
        end: str(study.end, 7),
        grade: str(study.grade, 40),
        notes: str(study.notes, 400),
      };
    }),
    certifications: list(input.certifications, 30, (item) => {
      const cert = obj(item);
      return {
        name: str(cert.name, 120),
        issuer: str(cert.issuer, 80),
        date: str(cert.date, 7),
        credentialId: str(cert.credentialId, 80),
        url: str(cert.url, 1000),
      };
    }),
  };
}

function problems(profile: ReturnType<typeof clean>) {
  const errors: string[] = [];
  if (!profile.name) errors.push("Name is required.");
  profile.experience.forEach((role, index) => {
    if (!MONTH.test(role.start)) errors.push(`Experience ${index + 1}: start must look like 2024-07.`);
    if (role.end && !MONTH.test(role.end)) errors.push(`Experience ${index + 1}: end must look like 2024-07 (or tick "current").`);
  });
  profile.certifications.forEach((cert, index) => {
    if (cert.date && !MONTH.test(cert.date)) errors.push(`Certification ${index + 1}: date must look like 2024-07.`);
  });
  return errors;
}

export async function getProfile(_request: Request, response: Response) {
  try {
    const profile = await Profile.findOne({ key: "main" }).lean();
    if (!profile) {
      response.status(404).json({ message: "No profile yet. Fill it in from the admin page." });
      return;
    }
    response.json({ data: profile });
  } catch (error) {
    console.error("Failed to load profile:", error);
    response.status(500).json({ message: "Failed to load profile" });
  }
}

export async function updateProfile(request: Request, response: Response) {
  const profile = clean(request.body);
  const errors = problems(profile);
  if (errors.length) {
    response.status(400).json({ errors, message: errors[0] });
    return;
  }

  try {
    const saved = await Profile.findOneAndUpdate(
      { key: "main" },
      { $set: { ...profile, key: "main" } },
      { new: true, upsert: true, runValidators: true },
    ).lean();
    response.json({ data: saved, message: "Saved" });
  } catch (error) {
    console.error("Failed to save profile:", error);
    response.status(500).json({ message: "Failed to save profile" });
  }
}
