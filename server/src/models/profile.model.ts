import { model, Schema } from "mongoose";

/*
 * All the personal content shown on the site, stored as ONE document (key: "main").
 * Edited from the /admin page. Projects and leads live in their own collections.
 */

const noId = { _id: false };

const profileSchema = new Schema(
  {
    key: { type: String, default: "main", unique: true },
    name: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    photoAlt: { type: String, default: "" },
    location: { type: String, default: "" },
    noticePeriod: { type: String, default: "" },
    timeZone: { type: String, default: "Asia/Kolkata" },
    intro: { type: [String], default: [] },
    facts: { type: [new Schema({ label: String, value: String }, noId)], default: [] },
    heroRoles: { type: [new Schema({ label: String, tone: String }, noId)], default: [] },
    contact: {
      type: new Schema({ email: String, emailSubject: String, linkedinUrl: String, resumeUrl: String, resumeFileName: String }, noId),
      default: {},
    },
    evaluator: {
      type: new Schema(
        {
          platform: String,
          stats: { type: [new Schema({ prefix: String, value: Number, suffix: String, label: String }, noId)], default: [] },
          skills: { type: [String], default: [] },
        },
        noId,
      ),
      default: {},
    },
    experience: {
      type: [
        new Schema(
          {
            role: String,
            company: String,
            type: String,
            location: String,
            start: String,
            end: { type: String, default: null },
            highlights: { type: [String], default: [] },
            stack: { type: [String], default: [] },
          },
          noId,
        ),
      ],
      default: [],
    },
    education: {
      type: [new Schema({ degree: String, school: String, start: String, end: String, grade: String, notes: String }, noId)],
      default: [],
    },
    certifications: {
      type: [new Schema({ name: String, issuer: String, date: String, credentialId: String, url: String }, noId)],
      default: [],
    },
  },
  { collection: "profile", timestamps: true },
);

export const Profile = model("Profile", profileSchema);
