import { render, screen, fireEvent } from '@testing-library/react';
import { expect, test } from 'vitest';
import App from './App';

test('renders the app', () => {
  render(<App />);
  expect(screen.getByText('JSON Formatter & Size Analyzer')).toBeInTheDocument();
});

test('correctly counts items in a nested json object', () => {
  render(<App />);
  const textArea = screen.getByPlaceholderText('Paste your JSON here...');
  const nestedJson = {
    a: 1,
    b: {
      c: 2,
      d: {
        e: 3,
      },
    },
    f: [1,2,3]
  };
  fireEvent.change(textArea, { target: { value: JSON.stringify(nestedJson) } });

  expect(screen.getByText('9')).toBeInTheDocument();
});
