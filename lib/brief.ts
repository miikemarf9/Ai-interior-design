export type IntakeForBrief = {
  roomType?: 'living_room' | 'bedroom';
  projectGoal?: 'furnish' | 'refresh';
  retainedFurniture?: Array<{ id: string; label: string; x: number; y: number }>;
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
    accuracy?: 'measured' | 'approximate' | 'unknown';
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
  const room = intake.roomType === 'bedroom' ? 'bedroom' : 'living room';
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
    title: `Your ${room} brief`,
    direction: `${intake.projectGoal === 'furnish' ? 'Furnish' : 'Refresh'} your ${room} in ${style.toLowerCase()} style, with ${colour.toLowerCase()}.`,
    keep: `Retain ${keeps.toLowerCase()}.${intake.retainedFurniture?.length ? ` Photo markers: ${intake.retainedFurniture.map((item, index) => `${index + 1}: ${item.label}`).join('; ')}.` : ''}`,
    change: `Focus on ${changes.toLowerCase()}.`,
    palette: colour,
    materials: materials,
    function: `Make space for ${uses.toLowerCase()}.`,
    avoid: intake.dislikes.trim()
      ? `Avoid: ${intake.dislikes.trim()}`
      : 'No explicit dislikes were supplied. Avoid short-lived trends unless they clearly strengthen the overall scheme.',
    measurements: measureParts.length
      ? `Customer-supplied ${intake.measurements.accuracy === 'measured' ? 'measured' : 'approximate / unconfirmed'} dimensions: ${measureParts.join(', ')}. Missing dimensions remain unknown; fit is not verified.${intake.measurements.notes ? ` Restrictions: ${intake.measurements.notes}` : ''}`
      : `No room dimensions have been supplied yet.${intake.measurements.notes ? ` Known constraint: ${intake.measurements.notes}` : ' Product fit should therefore remain provisional until measurements are added.'}`,
    creativeFreedom:
      intake.freedom === 'Safe'
        ? 'Stay close to the customer’s stated preferences. Refine rather than reinvent.'
        : intake.freedom === 'Surprise me'
          ? 'Respect the practical constraints, but introduce confident ideas the customer may not have considered.'
          : 'Use a balanced designer approach: respect the brief, but make confident choices where they improve the room.',
    budget: `Furniture and accessories allowance: £${intake.budget.toLocaleString('en-GB')}. Delivery is to be confirmed separately. Any Roomfound image-generation charge is separate.`,
    designerNote: 'The first render should prioritise accuracy to this agreed direction over novelty. Product selection should favour real UK availability, coherent proportions and long-term usability.',
  };
}
