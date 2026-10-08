import type { Certification, HeroRole, Profile, Role, RoleTone, Stat, Study } from "../content/types";
import { Checkbox, ListEditor, Row, Text, TextList } from "./fields";

/* The editable parts of the profile document, one component per admin tab. */

type FormProps = { profile: Profile; update: (patch: Partial<Profile>) => void };

export function AboutForm({ profile, update }: FormProps) {
  const contact = profile.contact;
  const setContact = (patch: Partial<Profile["contact"]>) => update({ contact: { ...contact, ...patch } });

  return (
    <>
      <section className="adm-group">
        <h2>About you</h2>
        <Row>
          <Text label="Name" onChange={(name) => update({ name })} value={profile.name} />
          <Text label="Location" onChange={(location) => update({ location })} placeholder="India" value={profile.location} />
          <Text
            hint="Used for the local time on Contact, e.g. Asia/Kolkata."
            label="Time zone"
            onChange={(timeZone) => update({ timeZone })}
            value={profile.timeZone}
          />
        </Row>
        <TextList
          hint="Each line is one paragraph."
          label="Intro"
          onChange={(intro) => update({ intro })}
          rows={6}
          value={profile.intro}
        />
      </section>

      <section className="adm-group">
        <h2>Photo</h2>
        <Row>
          <Text
            hint={<>Put the file in <code>client/public/images/</code> and enter <code>/images/me.jpg</code>, or paste any image link.</>}
            label="Photo URL"
            onChange={(photoUrl) => update({ photoUrl })}
            value={profile.photoUrl}
          />
          <Text label="Photo description (for screen readers)" onChange={(photoAlt) => update({ photoAlt })} value={profile.photoAlt} />
        </Row>
        {profile.photoUrl && <img alt="" className="adm-photo" src={profile.photoUrl} />}
      </section>

      <section className="adm-group">
        <h2>Quick facts</h2>
        <ListEditor
          addLabel="Add fact"
          items={profile.facts}
          newItem={() => ({ label: "", value: "" })}
          onChange={(facts) => update({ facts })}
          render={(fact, set) => (
            <Row>
              <Text label="Label" onChange={(label) => set({ label })} placeholder="Focus" value={fact.label} />
              <Text label="Value" onChange={(value) => set({ value })} placeholder="Frontend & full-stack" value={fact.value} />
            </Row>
          )}
          title={(fact) => fact.label}
        />
      </section>

      <section className="adm-group">
        <h2>Contact</h2>
        <Row>
          <Text label="Email" onChange={(email) => setContact({ email })} type="email" value={contact.email} />
          <Text label="Email subject" onChange={(emailSubject) => setContact({ emailSubject })} value={contact.emailSubject} />
        </Row>
        <Text
          hint="Shows a LinkedIn button in the top bar (opens in a new tab). Leave empty to hide it."
          label="LinkedIn profile URL"
          onChange={(linkedinUrl) => setContact({ linkedinUrl })}
          placeholder="https://www.linkedin.com/in/your-name"
          type="url"
          value={contact.linkedinUrl}
        />
        <Row>
          <Text
            hint={<>Put the PDF in <code>client/public/</code> and enter <code>/resume.pdf</code>, or paste a link.</>}
            label="Resume URL"
            onChange={(resumeUrl) => setContact({ resumeUrl })}
            value={contact.resumeUrl}
          />
          <Text
            label="Downloaded file name"
            onChange={(resumeFileName) => setContact({ resumeFileName })}
            placeholder="Kushagra-Resume.pdf"
            value={contact.resumeFileName}
          />
        </Row>
      </section>
    </>
  );
}

const TONES: RoleTone[] = ["purple", "blue", "orange", "teal", "yellow"];

export function HeroForm({ profile, update }: FormProps) {
  return (
    <section className="adm-group adm-group--wide">
      <h2>Hero role cards</h2>
      <p className="adm-hint">The cards that cycle in the hero, first one on top. Up to 5.</p>
      <ListEditor<HeroRole>
        addLabel="Add role"
        items={profile.heroRoles}
        newItem={() => ({ label: "", tone: TONES[profile.heroRoles.length % TONES.length] })}
        onChange={(heroRoles) => update({ heroRoles: heroRoles.slice(0, 5) })}
        render={(role, set) => (
          <Row>
            <Text label="Role" onChange={(label) => set({ label })} placeholder="Frontend Engineer" value={role.label} />
            <div className="adm-field">
              <span className="adm-label">Colour</span>
              <div className="adm-tones">
                {TONES.map((tone) => (
                  <button
                    aria-label={`${tone[0].toUpperCase()}${tone.slice(1)}`}
                    aria-pressed={role.tone === tone}
                    title={tone}
                    className={`adm-tone adm-tone--${tone}`}
                    key={tone}
                    onClick={() => set({ tone })}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </Row>
        )}
        title={(role) => role.label}
      />
    </section>
  );
}

export function AiWorkForm({ profile, update }: FormProps) {
  const evaluator = profile.evaluator;
  const set = (patch: Partial<Profile["evaluator"]>) => update({ evaluator: { ...evaluator, ...patch } });

  return (
    <section className="adm-group adm-group--wide">
      <h2>AI Work</h2>
      <Text label="Platform" onChange={(platform) => set({ platform })} placeholder="Alignerr" value={evaluator.platform} />
      <h3>Stats</h3>
      <ListEditor<Stat>
        addLabel="Add stat"
        items={evaluator.stats}
        newItem={() => ({ label: "", prefix: "", suffix: "+", value: 0 })}
        onChange={(stats) => set({ stats })}
        render={(stat, setStat) => (
          <Row>
            <Text label="Number" onChange={(value) => setStat({ value: Number(value) || 0 })} type="number" value={String(stat.value)} />
            <Text label="Before" onChange={(prefix) => setStat({ prefix })} placeholder="$" value={stat.prefix} />
            <Text label="After" onChange={(suffix) => setStat({ suffix })} placeholder="+" value={stat.suffix} />
            <Text label="Label" onChange={(label) => setStat({ label })} placeholder="AI code tasks reviewed" value={stat.label} />
          </Row>
        )}
        title={(stat) => `${stat.prefix}${stat.value}${stat.suffix} ${stat.label}`.trim()}
      />
      <TextList commas label="Skills" onChange={(skills) => set({ skills })} value={evaluator.skills} />
    </section>
  );
}

export function ExperienceForm({ profile, update }: FormProps) {
  return (
    <section className="adm-group adm-group--wide">
      <h2>Experience</h2>
      <p className="adm-hint">Newest first. The site shows them oldest → newest on the metro line.</p>
      <div className="adm-narrow">
        <Text
          hint="Shown in the corner of your current role. Leave empty to hide it."
          label="Notice period"
          onChange={(noticePeriod) => update({ noticePeriod })}
          placeholder="15 days"
          value={profile.noticePeriod}
        />
      </div>
      <ListEditor<Role>
        addLabel="Add role"
        items={profile.experience}
        newItem={() => ({ company: "", end: null, highlights: [], location: "", role: "", stack: [], start: "", type: "Full-time" })}
        onChange={(experience) => update({ experience })}
        render={(role, set) => (
          <>
            <Row>
              <Text label="Role" onChange={(value) => set({ role: value })} value={role.role} />
              <Text label="Company" onChange={(company) => set({ company })} value={role.company} />
            </Row>
            <Row>
              <Text label="Type" onChange={(type) => set({ type })} placeholder="Full-time, Freelance…" value={role.type} />
              <Text label="Location" onChange={(location) => set({ location })} placeholder="Remote" value={role.location} />
            </Row>
            <Row>
              <Text label="Start" onChange={(start) => set({ start })} type="month" value={role.start} />
              {role.end === null ? (
                <div className="adm-field">
                  <span className="adm-label">End</span>
                  <p className="adm-present">Present</p>
                </div>
              ) : (
                <Text label="End" onChange={(end) => set({ end })} type="month" value={role.end} />
              )}
            </Row>
            <Checkbox checked={role.end === null} label="I currently work here" onChange={(current) => set({ end: current ? null : "" })} />
            <TextList label="Highlights" onChange={(highlights) => set({ highlights })} value={role.highlights} />
            <TextList commas label="Tools" onChange={(stack) => set({ stack })} value={role.stack} />
          </>
        )}
        title={(role) => [role.role, role.company].filter(Boolean).join(" · ")}
      />
    </section>
  );
}

export function EducationForm({ profile, update }: FormProps) {
  return (
    <>
      <section className="adm-group">
        <h2>Education</h2>
        <p className="adm-hint">Newest first. The oldest becomes LVL 1 on the site.</p>
        <ListEditor<Study>
          addLabel="Add study"
          items={profile.education}
          newItem={() => ({ degree: "", end: "", grade: "", notes: "", school: "", start: "" })}
          onChange={(education) => update({ education })}
          render={(study, set) => (
            <>
              <Row>
                <Text label="Degree" onChange={(degree) => set({ degree })} value={study.degree} />
                <Text label="School / university" onChange={(school) => set({ school })} value={study.school} />
              </Row>
              <Row>
                <Text label="Start year" onChange={(start) => set({ start })} placeholder="2019" value={study.start} />
                <Text label="End year" onChange={(end) => set({ end })} placeholder="2023" value={study.end} />
                <Text label="Grade" onChange={(grade) => set({ grade })} placeholder="CGPA 8.4 / 10" value={study.grade} />
              </Row>
              <Text label="Notes" multiline onChange={(notes) => set({ notes })} rows={2} value={study.notes} />
            </>
          )}
          title={(study) => study.degree}
        />
      </section>

      <section className="adm-group">
        <h2>Certifications</h2>
        <p className="adm-hint">Shown newest first by date, whatever the order here.</p>
        <ListEditor<Certification>
          addLabel="Add certification"
          items={profile.certifications}
          newItem={() => ({ credentialId: "", date: "", issuer: "", name: "", url: "" })}
          onChange={(certifications) => update({ certifications })}
          render={(cert, set) => (
            <>
              <Row>
                <Text label="Name" onChange={(name) => set({ name })} value={cert.name} />
                <Text label="Issuer" onChange={(issuer) => set({ issuer })} value={cert.issuer} />
              </Row>
              <Row>
                <Text label="Date" onChange={(date) => set({ date })} type="month" value={cert.date} />
                <Text label="Credential ID" onChange={(credentialId) => set({ credentialId })} value={cert.credentialId} />
              </Row>
              <Text label="Verification link" onChange={(url) => set({ url })} type="url" value={cert.url} />
            </>
          )}
          title={(cert) => [cert.name, cert.issuer].filter(Boolean).join(" · ")}
        />
      </section>
    </>
  );
}
