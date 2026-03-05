export default function ProjectSetupPage({ params }: { params: { projectId: string } }) {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">New Test Run</h1>
      <p className="text-slate-400">Project ID: {params.projectId}</p>
      <p className="text-slate-400">Form to input URL and configure personas will go here.</p>
    </div>
  );
}
