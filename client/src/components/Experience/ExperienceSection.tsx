import { AnimatePresence, motion } from "motion/react";
import { useState, type CSSProperties } from "react";
import { useProfile } from "../../content/ProfileContext";
import { ACCENTS, duration, formatMonth, SectionHeading } from "./shared";
import "./Experience.css";

/**
 * Experience section: a metro line. Each role is a station (oldest on the left), the line
 * changes colour per role, the current role pulses "Current", and a dotted
 * extension points to the next stop.
 */
export function ExperienceSection() {
  const profile = useProfile();
  // Oldest first, so the line reads left to right through time.
  const stations = [...profile.experience].reverse();
  const [selected, setSelected] = useState(stations.length - 1);
  const role = stations[selected];
  const color = (index: number) => ACCENTS[(stations.length - 1 - index) % ACCENTS.length];

  return (
    <div className="xs-m">

      <SectionHeading eyebrow="Experience" title="Where I've worked." />

      <div className="xs-m__map">
        <p aria-hidden="true" className="xs-m__line-name">
          <span>M</span> Career line · {stations.length} stations
        </p>
        <ol className="xs-m__stations" style={{ "--count": stations.length + 1 } as CSSProperties}>
          {stations.map((station, index) => {
            const isCurrent = station.end === null;
            return (
              <li
                className="xs-m__station"
                key={`${station.company}-${station.start}`}
                style={{ "--line": color(index), "--next": index < stations.length - 1 ? color(index + 1) : "#c3c9d6" } as CSSProperties}
              >
                <button
                  aria-pressed={index === selected}
                  className={index === selected ? "xs-m__stop xs-m__stop--active" : "xs-m__stop"}
                  onClick={() => setSelected(index)}
                  type="button"
                >
                  <span className="xs-m__name">{station.company}</span>
                  <span aria-hidden="true" className={isCurrent ? "xs-m__dot xs-m__dot--current" : "xs-m__dot"} />
                  <span className="xs-m__when">{formatMonth(station.start).split(" ")[1]}</span>
                  {isCurrent ? <span className="xs-m__here">Current</span> : null}
                </button>
              </li>
            );
          })}
          <li className="xs-m__station xs-m__station--next">
            <a className="xs-m__stop" href="#contact">
              <span className="xs-m__name">Next stop</span>
              <span aria-hidden="true" className="xs-m__dot xs-m__dot--next" />
              <span className="xs-m__when">Your team?</span>
            </a>
          </li>
        </ol>
      </div>

      <AnimatePresence mode="wait">
        <motion.article
          animate={{ opacity: 1, y: 0 }}
          className="xs-m__board"
          exit={{ opacity: 0, y: -6 }}
          initial={{ opacity: 0, y: 8 }}
          key={selected}
          style={{ "--line": color(selected) } as CSSProperties}
          transition={{ duration: 0.22 }}
        >
          <div className="xs-m__board-head">
            <span className="xs-m__badge">{selected + 1}</span>
            <div>
              <h3>{role.role}</h3>
              <p>
                {role.company} · {role.type} · {role.location}
              </p>
            </div>
            <div className="xs-m__corner">
              {role.end === null && profile.noticePeriod && (
                <span className="xs-m__notice">
                  Notice period <strong>{profile.noticePeriod}</strong>
                </span>
              )}
              <span className="xs-m__time">
                {formatMonth(role.start)} – {formatMonth(role.end)}
                <small>{duration(role.start, role.end)}</small>
              </span>
            </div>
          </div>
          <ul className="xs-m__highlights">
            {role.highlights.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
          <ul className="xs-chips">
            {role.stack.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </motion.article>
      </AnimatePresence>
    </div>
  );
}
