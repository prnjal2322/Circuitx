import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MathRenderer } from '../components/MathRenderer';

describe('MathRenderer Component', () => {
  it('renders plain text without math', () => {
    const { container } = render(<MathRenderer content="Ohm's law relates voltage and current." />);
    expect(container.textContent).toContain("Ohm's law relates voltage and current.");
  });

  it('renders inline math with KaTeX class', () => {
    const { container } = render(<MathRenderer content="Equation: $V = I \\cdot R$ for resistors." />);
    expect(container.querySelector('.katex')).not.toBeNull();
  });
});
