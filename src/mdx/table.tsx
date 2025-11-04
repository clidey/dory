import type { JSX } from 'preact/jsx-runtime';
import {
  Table as UXTable,
  TableHead,
  TableCell
} from '@clidey/ux'

export const Table = (props: JSX.IntrinsicElements['table']) => (
  <div className="overflow-x-auto rounded-lg my-8">
    <UXTable {...props} />
  </div>
);

export const Th = (props: JSX.IntrinsicElements['th']) => (
  <TableHead {...props} />
);

export const Td = (props: JSX.IntrinsicElements['td']) => (
  <TableCell {...props} />
);
