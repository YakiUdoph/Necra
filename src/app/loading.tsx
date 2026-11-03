export default function Loading() {
  return (
    <main className="state-page" aria-busy="true" aria-live="polite">
      <p className="eyebrow">Loading Necra</p>
      <h1>Preparing the workspace</h1>
      <p>Please wait while this page becomes available.</p>
      <div className="loading-rule" aria-hidden="true" />
    </main>
  );
}
