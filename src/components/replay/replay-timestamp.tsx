"use client";

import { useEffect, useState } from "react";

export function ReplayTimestamp({ value }: { value: string }) {
  const [local, setLocal] = useState<string | null>(null);

  useEffect(() => {
    setLocal(
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "long",
      }).format(new Date(value)),
    );
  }, [value]);

  return (
    <span className="replay-time">
      <time dateTime={value}>{value.replace("T", " ").replace("Z", " UTC")}</time>
      {local ? <small>Local: {local}</small> : null}
    </span>
  );
}
