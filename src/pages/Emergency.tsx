export function EmergencyPage() {
  return (
    <main className="page container narrow prose-page">
      <p className="eyebrow">Emergency</p>
      <h1>If this is an emergency</h1>
      <div className="alert-card" role="alert">
        <strong>
          Erkab is not an emergency service. If you are in immediate
          danger, call your local emergency services first.
        </strong>
      </div>
      <p>
        General emergency number: <strong>911</strong>. Use your local
        emergency number where it differs.
      </p>
      <p>
        No verified Ethiopia crisis line is provided on this site. If you
        know a trusted local crisis service, contact it directly.
      </p>
      <p>
        If you can reach a safe place, go there, and ask someone you
        trust to stay with you until help arrives.
      </p>
    </main>
  );
}
