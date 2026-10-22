import type { JSX } from 'preact/jsx-runtime';

export const UnorderedList = (props: JSX.IntrinsicElements['ul']) => <ul className="dory-ul my-3 space-y-1.5" {...props} />;

export const OrderedList = (props: JSX.IntrinsicElements['ol']) => <ol className="dory-ol my-3 space-y-1.5" {...props} />;

export const ListItem = (props: JSX.IntrinsicElements['li']) => <li className="relative pl-7" {...props} />;
