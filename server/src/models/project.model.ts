import { model, Schema, type InferSchemaType } from "mongoose";

const projectSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    techStack: {
      type: [String],
      default: [],
    },
    // What each technology was used for in this project, e.g. { "React": "Built the dashboard UI" }.
    stackUsage: {
      type: Schema.Types.Mixed,
      default: {},
    },
    githubUrl: {
      type: String,
      default: "",
      trim: true,
    },
    liveUrl: {
      type: String,
      default: "",
      trim: true,
    },
    featuredImageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrls: {
      type: [String],
      default: [],
      validate: {
        message: "A project can have at most 6 images including the featured image.",
        validator(value: string[]) {
          return value.length <= 5;
        },
      },
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    // Display order on the site: lower numbers first. Projects with the same order
    // (0 by default) show newest first.
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    collection: "projects",
    timestamps: true,
  },
);

export type ProjectDocument = InferSchemaType<typeof projectSchema>;

export const Project = model<ProjectDocument>("Project", projectSchema);
