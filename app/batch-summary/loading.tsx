export default function Loading() {
  return (
    <div className="w-full animate-pulse">
      <div className="mb-8 space-y-2">
        <div className="h-4 w-32 bg-paper rounded" />
        <div className="h-8 w-96 bg-paper rounded" />
        <div className="h-4 w-128 bg-paper rounded" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-paper rounded-2xl border border-moss/15 shadow-panel" />
        ))}
      </div>
      <div className="mb-4 h-10 w-64 bg-paper rounded" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-paper rounded" />
        ))}
      </div>
    </div>
  );
}
