import 'bootstrap-icons/font/bootstrap-icons.css';

/** Decorative icons come exclusively from the bundled Bootstrap icon font. */
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return <i aria-hidden="true" className={`bi bi-${name} ${className}`} />;
}
