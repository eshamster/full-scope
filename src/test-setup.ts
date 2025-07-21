import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Tauri API のモック
const mockTauri = {
  invoke: vi.fn(),
  listen: vi.fn(),
  emit: vi.fn(),
};

// グローバルなTauri APIをモック
Object.defineProperty(window, '__TAURI__', {
  value: mockTauri,
});

// $app/stores のモック
vi.mock('$app/stores', () => ({
  page: {
    subscribe: vi.fn(),
  },
  navigating: {
    subscribe: vi.fn(),
  },
}));

// $app/navigation のモック
vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
}));
