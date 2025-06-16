import type { JSX } from 'preact/jsx-runtime';

export const Table = (props: JSX.IntrinsicElements['table']) => (
  <div className="overflow-x-auto rounded-lg my-8">
    <table className="border-collapse w-full border border-gray-300/10 rounded-lg" {...props} />
  </div>
);

export const Th = (props: JSX.IntrinsicElements['th']) => (
  <th className="border border-gray-300/10 p-2 bg-gray-100/25 text-left first:rounded-tl-lg last:rounded-tr-lg" {...props} />
);

export const Td = (props: JSX.IntrinsicElements['td']) => (
  <td className="border border-gray-300/10 p-2 text-left last-row:first:rounded-bl-lg last-row:last:rounded-br-lg" {...props} />
);
