import type { JSX } from 'preact/jsx-runtime';

export const UnorderedList = (props: JSX.IntrinsicElements['ul']) => <ul className="list-disc list-inside" {...props} />;

export const OrderedList = (props: JSX.IntrinsicElements['ol']) => <ol className="list-decimal list-inside" {...props} />;

export const ListItem = (props: JSX.IntrinsicElements['li']) => <li className="ml-4 mb-1" {...props} />;