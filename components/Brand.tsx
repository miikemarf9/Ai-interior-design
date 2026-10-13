import Link from 'next/link';
import { site } from '@/lib/site';
import { SeemoriWordmark } from './SeemoriWordmark';

export function Brand() {
  return <Link className="brand" href="/" aria-label={`${site.name} home`}><SeemoriWordmark /></Link>;
}
