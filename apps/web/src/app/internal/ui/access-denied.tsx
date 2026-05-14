type AccessDeniedProps = {
  currentRole?: string;
  message?: string;
  requiredPermission?: string;
};

export function AccessDenied({
  currentRole,
  message = "You do not have permission to access this page.",
  requiredPermission,
}: AccessDeniedProps) {
  return (
    <section className="mt-6 rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-normal text-amber-800">
        Access denied
      </p>
      <h2 className="mt-2 text-xl font-semibold text-slate-950">{message}</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md bg-slate-50 p-3">
          <dt className="font-medium text-slate-500">Required permission</dt>
          <dd className="mt-1 font-semibold text-slate-950">
            {requiredPermission ?? "Not specified"}
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 p-3">
          <dt className="font-medium text-slate-500">Current role</dt>
          <dd className="mt-1 font-semibold text-slate-950">
            {currentRole ?? "Unknown"}
          </dd>
        </div>
      </dl>
    </section>
  );
}
