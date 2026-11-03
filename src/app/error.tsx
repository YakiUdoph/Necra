"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="state-page">
      <p className="eyebrow">Something went wrong</p>
      <h1>This page could not be opened.</h1>
      <p>Your source information has not been changed. Try loading the page again.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
