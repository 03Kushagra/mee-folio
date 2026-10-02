import { profile } from "../../content/profile";

export type Role = (typeof profile.experience)[number];
export type Study = (typeof profile.education)[number];
export type Certification = (typeof profile.certifications)[number];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(value: string | null) {
  if (!value) return "Present";
  const [year, month] = value.split("-").map(Number);
  return month ? `${MONTHS[month - 1]} ${year}` : String(year);
}

function toMonths(value: string | null) {
  const date = value ? new Date(`${value}-01T00:00:00`) : new Date();
  return date.getFullYear() * 12 + date.getMonth();
}

/** "1 yr 8 mos" style duration, inclusive of the start month. */
export function duration(start: string, end: string | null) {
  const total = toMonths(end) - toMonths(start) + 1;
  const years = Math.floor(total / 12);
  const months = total % 12;
  const parts = [];
  if (years) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (months) parts.push(`${months} mo${months > 1 ? "s" : ""}`);
  return parts.join(" ") || "1 mo";
}

export function initials(text: string) {
  return text
    .split(/[\s&,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export const ACCENTS = ["#2056d8", "#8a33f5", "#1fa58a", "#f17835", "#d8a20d", "#ff4d7d"];

export function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="xs-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  );
}
