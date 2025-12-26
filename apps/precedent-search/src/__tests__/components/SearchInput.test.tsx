/**
 * SearchInput Component Tests
 *
 * Example component test demonstrating Testing Library usage.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from '../../components/search/SearchInput';

describe('SearchInput', () => {
  it('renders input field and submit button', () => {
    render(
      <SearchInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/search legal documents/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('calls onChange when input value changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <SearchInput
        value=""
        onChange={handleChange}
        onSubmit={vi.fn()}
      />
    );

    const input = screen.getByLabelText(/search legal documents/i);
    await user.type(input, 'test query');

    expect(handleChange).toHaveBeenCalled();
  });

  it('calls onSubmit when form is submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();

    render(
      <SearchInput
        value="test query"
        onChange={vi.fn()}
        onSubmit={handleSubmit}
      />
    );

    const button = screen.getByRole('button', { name: /search/i });
    await user.click(button);

    expect(handleSubmit).toHaveBeenCalledTimes(1);
  });

  it('disables submit button when query is empty', () => {
    render(
      <SearchInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /search/i });
    expect(button).toBeDisabled();
  });

  it('disables input and button when loading', () => {
    render(
      <SearchInput
        value="test query"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={true}
      />
    );

    const input = screen.getByLabelText(/search legal documents/i);
    const button = screen.getByRole('button', { name: /searching/i });

    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });

  it('respects maxLength prop', () => {
    render(
      <SearchInput
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        maxLength={100}
      />
    );

    const input = screen.getByLabelText(/search legal documents/i) as HTMLInputElement;
    expect(input.maxLength).toBe(100);
  });
});

