import { model, Schema, type InferSchemaType } from "mongoose";

const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    message: { type: String, default: "", trim: true, maxlength: 1000 },
    source: { type: String, enum: ["resume", "contact"], default: "resume" },
  },
  {
    collection: "leads",
    timestamps: true,
  },
);

export type LeadDocument = InferSchemaType<typeof leadSchema>;

export const Lead = model<LeadDocument>("Lead", leadSchema);
