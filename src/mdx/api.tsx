/** Inline code element kept for MDX content that uses <API>. */
export function API({ children, ...props }: React.ComponentPropsWithoutRef<'code'>) {
  return <code {...props}>{children}</code>
}
