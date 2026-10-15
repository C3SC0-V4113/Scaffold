import type { IconLibrary, RouterChoice } from '../types.js';
import { renderViteHomePage, viteUnitSmokeTest } from './files.js';

export function renderViteNotFoundPage() {
  return `import { Link } from 'react-router';

export default function NotFound() {
  return (
    <main className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground text-sm">The page you requested does not exist.</p>
      <Link to="/">Return home</Link>
    </main>
  );
}
`;
}

export function renderViteDeclarativeApp(
  projectName: string,
  iconLibrary: IconLibrary,
  motionEnabled: boolean,
) {
  const home = renderViteHomePage(projectName, iconLibrary, motionEnabled, 'HomePage', false);
  return `import { Route, Routes } from 'react-router';

import NotFound from '@/NotFound';

${home}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
`;
}

export function renderViteRouterFiles(
  router: RouterChoice,
  projectName: string,
  iconLibrary: IconLibrary,
  motionEnabled: boolean,
) {
  if (router === 'none') {
    return { 'src/App.tsx': renderViteHomePage(projectName, iconLibrary, motionEnabled) };
  }

  const main =
    router === 'react-router-data'
      ? `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';

import { router } from './router';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
`
      : `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
`;

  const files: Record<string, string> = {
    'src/NotFound.tsx': renderViteNotFoundPage(),
    'src/main.tsx': main,
  };

  if (router === 'react-router-data') {
    files['src/RouterLayout.tsx'] = `import { isRouteErrorResponse, Link, Outlet, useRouteError } from 'react-router';

export function RootLayout() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? String(error.status) + ' ' + error.statusText
    : 'An unexpected error occurred.';

  return (
    <main className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">{message}</p>
      <Link to="/">Return home</Link>
    </main>
  );
}
`;
    files['src/router.tsx'] = `import { createBrowserRouter } from 'react-router';

import App from '@/App';
import NotFound from '@/NotFound';
import { ErrorBoundary, RootLayout } from '@/RouterLayout';

export const routes = [
  {
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <App /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
`;
    files['src/App.tsx'] = renderViteHomePage(projectName, iconLibrary, motionEnabled);
  } else {
    files['src/App.tsx'] = renderViteDeclarativeApp(projectName, iconLibrary, motionEnabled);
  }

  return files;
}

export function renderViteRouterE2ESmokeTest(router: RouterChoice) {
  if (router === 'none') return undefined;

  return `import { expect, test } from '@playwright/test';

test('loads the home page and renders a not-found route', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  await page.goto('/missing-route');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});
`;
}

export function renderViteRouterUnitSmokeTest(router: RouterChoice) {
  if (router === 'none') return viteUnitSmokeTest;

  if (router === 'react-router-data') {
    return `import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';

import { routes } from '@/router';

describe('Home page smoke test', () => {
  it('renders a heading through the data router', () => {
    const router = createMemoryRouter(routes, { initialEntries: ['/'] });
    render(<RouterProvider router={router} />);

    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });
});
`;
  }

  return `import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';

import App from '@/App';

describe('Home page smoke test', () => {
  it('renders a heading through the declarative router', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });
});
`;
}
