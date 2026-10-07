function RoomMark() {
  return (
    <svg viewBox="0 0 140 90" aria-hidden="true">
      <path d="M20 70V29l50-18 50 18v41" />
      <path d="M42 68V49h56v19" />
      <path d="M50 49V39h40v10" />
      <path d="M54 68v10M86 68v10" />
      <path d="M70 12v19" className="pillarAccentLine" />
    </svg>
  );
}

function ProductMark() {
  return (
    <svg viewBox="0 0 140 90" aria-hidden="true">
      <path d="M26 67h67" />
      <path d="M36 66V45h48v21" />
      <path d="M42 45V35h36v10" />
      <path d="M46 67v9M74 67v9" />
      <path d="M100 26h22v22h-22z" className="pillarAccentLine" />
      <path d="M106 37h10M111 32v10" className="pillarAccentLine" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 140 90" aria-hidden="true">
      <path d="M28 18h58v54H28z" />
      <path d="M39 31h34M39 43h26M39 55h30" />
      <path d="M98 22v50M91 31h14M91 43h14M91 55h14" />
      <path d="M94 72l6 6 14-16" className="pillarAccentLine" />
    </svg>
  );
}

const pillars = [
  {
    titleLead: 'Your',
    titleRest: 'Room',
    description: 'We start with the room you actually have, including what stays.',
    icon: <RoomMark />,
  },
  {
    titleLead: 'Real',
    titleRest: 'Products',
    description: 'The design is built around furniture you can actually buy in the UK.',
    icon: <ProductMark />,
  },
  {
    titleLead: 'Checked',
    titleRest: 'Details',
    description: 'Price, dimensions, availability and room fit are checked where the data allows.',
    icon: <CheckMark />,
  },
];

export function RoomfoundPillars() {
  return (
    <section className="roomfoundPillars" aria-labelledby="roomfound-pillars-title">
      <div className="roomfoundPillarsInner">
        <div className="roomfoundPillarsIntro" data-reveal>
          <p className="eyebrow">Why Roomfound</p>
          <h2 id="roomfound-pillars-title">
            <em className="titleGold">What makes us</em> <span>different.</span>
          </h2>
        </div>

        <div className="roomfoundPillarGrid" data-reveal>
          {pillars.map((pillar) => (
            <article className="roomfoundPillar" key={pillar.titleRest}>
              <div className="roomfoundPillarMark">{pillar.icon}</div>
              <h3><em>{pillar.titleLead}</em> {pillar.titleRest}</h3>
              <p>{pillar.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
