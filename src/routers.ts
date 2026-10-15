export const routerChoices = [
  'none',
  'react-router-data',
  'react-router-declarative',
] as const;

export type RouterChoice = (typeof routerChoices)[number];

export const routerCatalog = {
  none: { label: 'No router', skills: [] },
  'react-router-data': {
    label: 'React Router (data mode)',
    skills: ['react-router'],
  },
  'react-router-declarative': {
    label: 'React Router (declarative mode)',
    skills: ['react-router'],
  },
} satisfies Record<RouterChoice, { label: string; skills: readonly string[] }>;
