import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export type StatusTone = "active" | "info" | "neutral" | "planned" | "warning";

export function StatusLozenge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <span className={`status-lozenge status-${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  status,
}: {
  eyebrow: string;
  title: string;
  description: string;
  status?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-heading-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {status ? <div className="page-header-status">{status}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="empty-state" aria-labelledby={`empty-${toId(title)}`}>
      <span className="empty-mark" aria-hidden="true">
        —
      </span>
      <div>
        <h2 id={`empty-${toId(title)}`}>{title}</h2>
        <div className="empty-copy">{children}</div>
        {action ? <div className="empty-action">{action}</div> : null}
      </div>
    </section>
  );
}

export function Notice({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children: ReactNode;
  tone?: "info" | "warning";
}) {
  return (
    <aside className={`notice notice-${tone}`} aria-label={title}>
      <span className="notice-rule" aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <div>{children}</div>
      </div>
    </aside>
  );
}

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "danger" | "primary" | "quiet" | "secondary";
}) {
  return (
    <button
      className={["button", `button-${variant}`, className].filter(Boolean).join(" ")}
      type={type}
      {...props}
    />
  );
}

export function TextField({
  id,
  label,
  description,
  error,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  description?: string;
  error?: string;
}) {
  const descriptionId = description ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <input
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        id={id}
        {...props}
      />
      {description ? (
        <p className="field-help" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function toId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
