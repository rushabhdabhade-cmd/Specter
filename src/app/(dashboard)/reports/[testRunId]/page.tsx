export default function ReportPage({ params }: { params: { testRunId: string } }) {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Test Report</h1>
      <p className="text-slate-400">Test Run ID: {params.testRunId}</p>
      <p className="text-slate-400">Heatmaps, narratives, and scores will display here.</p>
    </div>
  );
}
