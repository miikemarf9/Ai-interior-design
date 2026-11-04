import { Brand } from '@/components/Brand';
import Link from 'next/link';
import { RoomReviewExperience } from '@/components/RoomReviewExperience';

export default function ReviewPage() {
  return <main className="productSelectionPage">
    <header className="designHeader shellWide">
      <Brand />
      <span className="designHeaderNote">Step 3 of 4 · Room review</span>
      <Link className="textLink" href="/products">Back to Step 2 · Furniture</Link>
    </header>
    <RoomReviewExperience />
  </main>;
}
