/** Stable profile-color IDs and display hues shared by browser and Lambda code. */
export const ProfileColor = {
  pine: 'PINE',
  fern: 'FERN',
  moss: 'MOSS',
  clay: 'CLAY',
  cedar: 'CEDAR',
  marigold: 'MARIGOLD',
  lake: 'LAKE',
  dusk: 'DUSK',
} as const;

export type ProfileColorId = (typeof ProfileColor)[keyof typeof ProfileColor];

export const ProfileColorHex = {
  [ProfileColor.pine]: '#2F6B4F',
  [ProfileColor.fern]: '#4D7C3F',
  [ProfileColor.moss]: '#6B7A3A',
  [ProfileColor.clay]: '#B85C3F',
  [ProfileColor.cedar]: '#8A5A44',
  [ProfileColor.marigold]: '#966300',
  [ProfileColor.lake]: '#337B8C',
  [ProfileColor.dusk]: '#76507A',
} as const;
