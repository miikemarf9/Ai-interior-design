export const site = {
  name: 'Roomfound',
  workingName: true,
  proposition: 'Design a room you can actually buy.',
  description:
    'A UK-first interior design and commerce platform built around real rooms, real products, real prices and better buying confidence.',
};

export const recommendationReasons = [
  {
    key: 'comfort',
    label: 'Comfort',
    copy: 'Chosen to make the room feel good to live in, not just good in a render.',
  },
  {
    key: 'design',
    label: 'Design',
    copy: 'Supports the room direction without making every item compete for attention.',
  },
  {
    key: 'lasting-style',
    label: 'Lasting style',
    copy: 'A considered choice intended to outlast a short-lived trend.',
  },
  {
    key: 'budget-fit',
    label: 'Budget fit',
    copy: 'Earns its place in the total room budget rather than being judged in isolation.',
  },
  {
    key: 'room-fit',
    label: 'Room fit',
    copy: 'Selected with the room proportions and available dimensions in mind.',
  },
] as const;

export type RecommendationReasonKey = (typeof recommendationReasons)[number]['key'];
