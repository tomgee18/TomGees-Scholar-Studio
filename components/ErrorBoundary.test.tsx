import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Helper component that throws on demand
const ProblemChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Simulated UI crash error in scholar workspace');
  }
  return <div>Scholar Studio Content Operational</div>;
};

describe('ErrorBoundary Component', () => {
  // Suppress console.error during expected throw tests
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Scholar Studio Content Operational')).toBeDefined();
  });

  it('catches render errors and displays recovery UI with diagnostics', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    // Verify error card title & reassurance
    expect(screen.getByText('Scholar Studio Encountered an Unexpected Error')).toBeDefined();
    expect(
      screen.getByText(
        /The studio safety boundary captured an unhandled interface exception/i
      )
    ).toBeDefined();

    // Verify action buttons
    expect(screen.getByText(/Reload Studio/i)).toBeDefined();
    expect(screen.getByText(/Try Again/i)).toBeDefined();
    expect(screen.getByText(/Copy Diagnostics/i)).toBeDefined();
    expect(screen.getByText(/Reset Settings/i)).toBeDefined();
  });

  it('toggles technical diagnostic details when clicking accordion', () => {
    render(
      <ErrorBoundary>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    const toggleButton = screen.getByText(/Technical Diagnostics/i);
    expect(toggleButton).toBeDefined();

    // Initially details are hidden
    expect(screen.queryByText(/Simulated UI crash error/i)).toBeNull();

    // Click to open accordion
    fireEvent.click(toggleButton);

    // Error message should now be visible (in message box and/or stack trace)
    expect(screen.getAllByText(/Simulated UI crash error in scholar workspace/i).length).toBeGreaterThan(0);
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom Safety Fallback</div>}>
        <ProblemChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Safety Fallback')).toBeDefined();
    expect(screen.queryByText('Scholar Studio Encountered an Unexpected Error')).toBeNull();
  });

  it('allows recovery via Try Again button when child stops throwing', () => {
    const ResettableContainer = () => {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <ErrorBoundary onReset={() => setShouldThrow(false)}>
          <ProblemChild shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    };

    render(<ResettableContainer />);

    expect(screen.getByText('Scholar Studio Encountered an Unexpected Error')).toBeDefined();

    // Click Try Again
    fireEvent.click(screen.getByText(/Try Again/i));

    // Should recover and display child content
    expect(screen.getByText('Scholar Studio Content Operational')).toBeDefined();
  });
});
