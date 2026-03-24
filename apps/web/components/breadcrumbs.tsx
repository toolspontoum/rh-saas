"use client";

import Link from "next/link";

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`}>
          {item.href ? <Link href={item.href}>{item.label}</Link> : <strong>{item.label}</strong>}
          {index < items.length - 1 ? <span className="crumb-sep">/</span> : null}
        </span>
      ))}
    </nav>
  );
}
