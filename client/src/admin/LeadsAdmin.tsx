import { useEffect, useState } from "react";
import { api } from "./api";

/* Leads tab: everyone who downloaded the resume (read-only), with a CSV download. */

type Lead = { _id: string; createdAt: string; email: string; name: string; source: string };

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

export function LeadsAdmin({ notify }: { notify: (message: string, kind?: "ok" | "error") => void }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);

  useEffect(() => {
    api<{ data: Lead[] }>("/api/leads")
      .then(({ data }) => setLeads(data))
      .catch((error: Error) => notify(error.message, "error"));
  }, [notify]);

  const downloadCsv = () => {
    if (!leads) return;
    const rows = [["Name", "Email", "Source", "Date"], ...leads.map((lead) => [lead.name, lead.email, lead.source, lead.createdAt])];
    const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mee-folio-leads.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="adm-group adm-group--wide">
      <div className="adm-group__head">
        <h2>Resume downloads</h2>
        <button disabled={!leads?.length} onClick={downloadCsv} type="button">
          Download CSV
        </button>
      </div>
      {leads === null ? (
        <p className="adm-hint">Loading…</p>
      ) : leads.length === 0 ? (
        <p className="adm-empty">Nobody yet.</p>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead._id}>
                  <td>{lead.name}</td>
                  <td>
                    <a href={`mailto:${lead.email}`}>{lead.email}</a>
                  </td>
                  <td>{new Date(lead.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
