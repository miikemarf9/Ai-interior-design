export type IntakeForBrief = {
  keep: string[];
  change: string[];
  styles: string[];
  colours: string[];
  materials: string[];
  dislikes: string;
  uses: string[];
  budget: number;
  measurements: {
    width: string;
    length: string;
    height: string;
    notes: string;
  };
  freedom: 'Safe' | 'Balanced' | 'Surprise me';
};

export type DesignBrief = {
  title: string;
  direction: string;
  keep: string;
  change: string;
  palette: string;
  materials: string;
  function: string;
  avoid: string;
  measurements: string;
  creativeFreedom: string;
  budget: string;
  designerNote: string;
};

function naturalList(values: string[], fallback: string) {
  if (!values.length) return fallback;
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}

export function buildFallbackBrief(intake: IntakeForBrief): DesignBrief {
  const style = naturalList(intake.styles, 'a considered contemporary direction');
  const colour = naturalList(intake.colours, 'a restrained palette chosen to suit the room');
  const materials = naturalList(intake.materials, 'a balanced mix of tactile, durable materials');
  const uses = naturalList(intake.uses, 'comfortable everyday living');
  const keeps = naturalList(intake.keep, 'the strongest existing features');
  const changes = naturalList(intake.change, 'the furniture and styling that will make the biggest difference');

  const measureParts = [
    intake.measurements.width ? `${intake.measurements.width} cm wide` : '',
    intake.measurements.length ? `${intake.measurements.length} cm long` : '',
    intake.measurements.height ? `${intake.measurements.height} cm ceiling height` : '',
  ].filter(Boolean);

  return {
    title: 'Your living-room direction',
    direction: `Create a ${style.toLowerCase()} living room with ${colour.toLowerCase()}. The finished scheme should feel cohesive, comfortable and intentionally put together rather than over-styled.`,
    keep: `Work around and retain ${keeps.toLowerCase()}.`,
    change: `Prioritise ${changes.toLowerCase()}. Every new piece should earn its place in the room rather than being added for decoration alone.`,
    palette: `Build the colour story around ${colour.toLowerCase()}, keeping enough visual quiet for the room to feel calm and liveable.`,
    materials: `Favour ${materials.toLowerCase()}, balancing appearance with longevity and day-to-day practicality.`,
    function: `The room needs to support ${uses.toLowerCase()}. Layout and product choices should respond to those real-life needs before purely decorative decisions.`,
    avoid: intake.dislikes.trim()
      ? `Avoid: ${intake.dislikes.trim()}`
      : 'No explicit dislikes were supplied. Avoid short-lived trends unless they clearly strengthen the overall scheme.',
    measurements: measureParts.length
      ? `Use the supplied room dimensions: ${measureParts.join(', ')}.${intake.measurements.notes ? ` Also account for: ${intake.measurements.notes}` : ''}`
      : `No room dimensions have been supplied yet.${intake.measurements.notes ? ` Known constraint: ${intake.measurements.notes}` : ' Product fit should therefore remain provisional until measurements are added.'}`,
    creativeFreedom:
      intake.freedom === 'Safe'
        ? 'Stay close to the customer’s stated preferences. Refine rather than reinvent.'
        : intake.freedom === 'Surprise me'
          ? 'Respect the practical constraints, but introduce confident ideas the customer may not have considered.'
          : 'Use a balanced designer approach: respect the brief, but make confident choices where they improve the room.',
    budget: `Target total product spend: £${intake.budget.toLocaleString('en-GB')}. Treat this as a whole-room budget and preserve enough headroom to complete the scheme.`,
    designerNote: 'The first render should prioritise accuracy to this agreed direction over novelty. Product selection should favour real UK availability, coherent proportions and long-term usability.',
  };
}
