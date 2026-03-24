import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

test('renders auth sign in screen by default', () => {
  localStorage.clear();
  render(<App />);
  const signInTexts = screen.getAllByText(/sign in/i);
  expect(signInTexts.length).toBeGreaterThan(0);
});

test('shows profile menu with logout action when authenticated', async () => {
  localStorage.setItem('token', 'fake-token');
  localStorage.setItem('user', JSON.stringify({ id: 1, email: 'test@example.com', name: 'Test User' }));

  global.fetch = jest.fn((url) => {
    const ok = (data) => Promise.resolve({ ok: true, status: 200, json: async () => data });
    if (String(url).endsWith('/items')) return ok([]);
    if (String(url).endsWith('/stats')) return ok({ total_items: 0, fresh: 0, expiring_soon: 0, expired: 0 });
    if (String(url).endsWith('/reminders')) return ok({ expired: [], today: [], soon: [] });
    if (String(url).endsWith('/activity')) return ok([]);
    if (String(url).endsWith('/shopping-list')) return ok([]);
    if (String(url).endsWith('/shopping-list/suggestions')) return ok([]);
    if (String(url).endsWith('/insights/weekly')) return ok({});
    if (String(url).endsWith('/household')) return ok({ joined: false, household: null });
    if (String(url).endsWith('/profile')) return ok({ id: 1, email: 'test@example.com', name: 'Test User', photo_url: null });
    return ok({});
  });

  render(<App />);
  const profileTrigger = await screen.findByRole('button', { name: /test user/i });
  expect(screen.queryByText(/log out/i)).not.toBeInTheDocument();

  await userEvent.click(profileTrigger);
  expect(await screen.findByText(/log out/i)).toBeInTheDocument();
});
