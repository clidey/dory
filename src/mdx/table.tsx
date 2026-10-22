import type { JSX } from 'preact/jsx-runtime';

export const Table = (props: JSX.IntrinsicElements['table']) => (
  <div className="dory-table my-5 overflow-x-auto rounded-lg border border-[var(--border)] bg-card">
    <table className="w-full border-collapse text-left" {...props} />
  </div>
);

export const Th = (props: JSX.IntrinsicElements['th']) => (
  <th className="bg-muted px-3.5 py-2 font-mono text-[11px] font-normal uppercase tracking-[0.16em] text-muted-foreground" {...props} />
);

export const Td = (props: JSX.IntrinsicElements['td']) => (
  <td className="border-t border-[var(--border)] px-3.5 py-2.5 align-top text-[13px] text-muted-foreground first:font-semibold first:text-foreground" {...props} />
);
