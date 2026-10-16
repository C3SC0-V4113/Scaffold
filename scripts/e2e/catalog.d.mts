export const frameworkLayouts: {
  next: { sourceRoot: ''; globalStylesheet: string; utilsPath: string; uiDir: string; importAlias: string; editHint: string; motionMainPath: string };
  astro: { sourceRoot: 'src/'; globalStylesheet: string; utilsPath: string; uiDir: string; importAlias: string; editHint: string; motionMainPath: string };
  vite: { sourceRoot: 'src/'; globalStylesheet: string; utilsPath: string; uiDir: string; importAlias: string; editHint: string; motionMainPath: string; eslintConfigPath: string; vitestConfigPath: string };
  'react-router': { sourceRoot: 'app/'; globalStylesheet: string; utilsPath: string; uiDir: string; importAlias: string; editHint: string; motionMainPath: string; eslintConfigPath: string; vitestConfigPath: string };
};

export const frameworkVersionOverrides: {
  astro: Record<string, string>;
  vite: Record<string, string>;
  'react-router': Record<string, string>;
};
