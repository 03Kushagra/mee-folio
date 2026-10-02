import type { CSSProperties } from "react";

type FakeScreenProps = {
  accent: string;
  className?: string;
  label: string;
  title: string;
  url?: string;
  variant: number;
};

/**
 * Shows the real screenshot when a project has one; otherwise draws a small mock UI
 * (six different layouts) so the samples have something believable to show.
 */
export function FakeScreen({ accent, className = "", label, title, url, variant }: FakeScreenProps) {
  if (url) {
    return <img alt="" className={`fake-screen fake-screen--image ${className}`} draggable={false} src={url} />;
  }

  const layout = variant % 6;

  return (
    <div
      className={`fake-screen fake-screen--v${layout} ${className}`}
      style={{ "--screen-accent": accent } as CSSProperties}
    >
      <div className="fake-screen__top">
        <i />
        <span>{title}</span>
        <em>{label}</em>
      </div>
      <div className="fake-screen__body">
        {layout === 0 ? (
          <>
            <div className="fs-side" />
            <div className="fs-main">
              <div className="fs-row">
                <b />
                <b />
                <b />
              </div>
              <div className="fs-bars">
                {[40, 65, 50, 80, 58, 92, 70].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>
          </>
        ) : null}
        {layout === 1 ? (
          <div className="fs-list">
            {[0, 1, 2, 3, 4].map((row) => (
              <div key={row}>
                <i />
                <span style={{ width: `${45 + ((row * 17) % 35)}%` }} />
                <b />
              </div>
            ))}
          </div>
        ) : null}
        {layout === 2 ? (
          <svg className="fs-chart" preserveAspectRatio="none" viewBox="0 0 100 50">
            <polyline points="0,42 14,36 28,38 42,26 56,28 70,16 84,18 100,6" />
            <polygon points="0,50 0,42 14,36 28,38 42,26 56,28 70,16 84,18 100,6 100,50" />
          </svg>
        ) : null}
        {layout === 3 ? (
          <div className="fs-grid">
            {[0, 1, 2, 3, 4, 5].map((cell) => (
              <span key={cell} />
            ))}
          </div>
        ) : null}
        {layout === 4 ? (
          <div className="fs-form">
            <span />
            <span />
            <span className="fs-form__wide" />
            <b />
          </div>
        ) : null}
        {layout === 5 ? (
          <div className="fs-board">
            {[3, 2, 4].map((cards, column) => (
              <div key={column}>
                {Array.from({ length: cards }, (_, card) => (
                  <span key={card} />
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
