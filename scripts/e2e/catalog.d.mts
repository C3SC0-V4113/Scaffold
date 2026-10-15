export const frameworkLayouts: {
  next: { sourceRoot: ''; globalStylesheet: string; utilsPath: string; uiDir: string; motionMainPath: string };
  astro: { sourceRoot: 'src/'; globalStylesheet: string; utilsPath: string; uiDir: string; motionMainPath: string };
};

export const frameworkVersionOverrides: {
  astro: Record<string, string>;
  vite: Record<string, string>;
};
