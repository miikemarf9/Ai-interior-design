import Image from 'next/image';
import beforeAfterImage from '@/public/images/roomfound-before-after.webp';

export function BeforeAfter() {
  return (
    <div className="beforeAfter beforeAfterStatic">
      <Image
        className="beforeAfterComposite"
        src={beforeAfterImage}
        alt="Original unfurnished living room beside an aspirational reimagined version of the same room"
        sizes="(max-width: 900px) 100vw, 1600px"
        quality={82}
      />
    </div>
  );
}
