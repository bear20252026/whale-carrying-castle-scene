export const views = [
  {
    id: 'panorama',
    name: 'The panorama',
    shortName: 'Panorama',
    eyebrow: 'SOMEWHERE BEYOND THE CLOUDS',
    title: 'Aetheria',
    subtitle: 'Let your imagination drift.',
    description: 'A gentle giant. A castle in the clouds.\nA little escape from the everyday.',
    focus: [0.5, 0.5],
    zoom: 1,
  },
  {
    id: 'castle',
    name: 'The cloud castle',
    shortName: 'The castle',
    eyebrow: '02 / THE CLOUD CASTLE',
    title: 'Built from\ndaydreams.',
    subtitle: 'Every window holds a little wonder.',
    description: 'Follow the blossom-lined balconies,\nwhere a thousand small stories live.',
    focus: [0.505, 0.55],
    zoom: 2.15,
  },
  {
    id: 'wheel',
    name: 'The sky wheel',
    shortName: 'The sky wheel',
    eyebrow: '03 / THE SKY WHEEL',
    title: 'Around\nand a dream.',
    subtitle: 'The best views have no end.',
    description: 'A slow turn above the cherry trees.\nNothing to do but take it all in.',
    focus: [0.681, 0.69],
    zoom: 3.15,
  },
  {
    id: 'whale',
    name: 'The gentle giant',
    shortName: 'The whale',
    eyebrow: '04 / THE GENTLE GIANT',
    title: 'A softer\nkind of giant.',
    subtitle: 'An entire world, carried with care.',
    description: 'Drift beside our quiet guardian,\none unhurried breath at a time.',
    focus: [0.75, 0.39],
    zoom: 2.25,
  },
] as const;

export type ViewIndex = 0 | 1 | 2 | 3;
export type RenderQuality = 'balanced' | 'high' | 'gentle';

export function getInitialView(): ViewIndex {
  const index = views.findIndex((view) => view.id === window.location.hash.slice(1));
  return (index < 0 ? 0 : index) as ViewIndex;
}