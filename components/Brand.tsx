import Link from 'next/link';
import { site } from '@/lib/site';

export function Brand() {
  return (
    <Link className="brand" href="/" aria-label={`${site.name} home`}>
      <span className="brandMark" aria-hidden="true">R</span>
      <span className="brandWord">{site.name}</span>
    </Link>
  );
}
