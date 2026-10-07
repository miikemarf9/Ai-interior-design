import Link from 'next/link';

function DesignMark() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true">
      <path d="M25 97V37l55-24 55 24v60" />
      <path d="M48 94V68c0-9 7-16 16-16h32c9 0 16 7 16 16v26" />
      <path d="M43 75h74" />
      <path d="M57 94v-19M103 94v-19" />
      <path d="M79 13v27" className="pillarAccentLine" />
    </svg>
  );
}

function ProductMark() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true">
      <path d="M36 92h88" />
      <path d="M50 90V63h60v27" />
      <path d="M57 63V51c0-8 6-14 14-14h18c8 0 14 6 14 14v12" />
      <path d="M61 92v12M99 92v12" />
      <circle cx="119" cy="34" r="18" className="pillarAccentLine" />
      <path d="M112 34l5 5 10-12" className="pillarAccentLine" />
    </svg>
  );
}

function VerifyMark() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true">
      <path d="M30 24h68v72H30z" />
      <path d="M42 36h44M42 49h28M42 72h42M42 84h30" />
      <path d="M116 28v68M107 36h18M107 52h18M107 68h18M107 84h18" />
      <path d="M105 101l8 8 17-20" className="pillarAccentLine" />
    </svg>
  );
}

const pillars = [
  {
    href: '#reimagined',
    titleLead: 'Interior',
    titleRest: 'Design',
    description: 'Built around your room, taste and budget.',
    icon: <DesignMark />,
  },
  {
    href: '#shop-room',
    titleLead: 'Real',
    titleRest: 'Products',
    description: 'Furniture and finishing pieces you can actually buy.',
    icon: <ProductMark />,
  },
  {
    href: '#verified-room',
    titleLead: 'Verified',
    titleRest: 'Room',
    description: 'Key product and room details checked before you commit.',
    icon: <VerifyMark />,
  },
];

export function RoomfoundPillars() {
  return (
    <section className="roomfoundPillars" aria-labelledby="roomfound-pillars-title">
      <div className="shellWide">
        <div className="roomfoundPillarsIntro" data-reveal>
          <p className="eyebrow">What Roomfound brings together</p>
          <h2 id="roomfound-pillars-title">
            <em className="titleGold">From an idea</em>
            <span> to a room you can buy.</span>
          </h2>
        </div>

        <div className="roomfoundPillarGrid" data-reveal>
          {pillars.map((pillar) => (
            <Link className="roomfoundPillar" href={pillar.href} key={pillar.titleRest}>
              <div className="roomfoundPillarMark">{pillar.icon}</div>
              <h3><em>{pillar.titleLead}</em> {pillar.titleRest}</h3>
              <p>{pillar.description}</p>
              <span className="roomfoundPillarArrow" aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
