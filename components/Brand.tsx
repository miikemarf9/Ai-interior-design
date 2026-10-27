import Link from 'next/link';
import { site } from '@/lib/site';

export function Brand() {
  return <Link className="brand transformBrand" href="/" aria-label={`${site.name} home`}>
    <svg className="transformBrandMark" viewBox="0 0 40 44" fill="none" aria-hidden="true" focusable="false">
      <path d="M4 5v34l16-6V12L4 5ZM20 12l16-7v34" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      <path d="M28 15v17l8 7" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
    <span className="transformBrandText" aria-hidden="true"><span>Transform</span><span className="transformBrandAccent">My Room</span></span>
  </Link>;
}
