import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeScreen } from '../components/WelcomeScreen';

describe('WelcomeScreen Component', () => {
  it('renders CircuitX title and tagline', () => {
    render(<WelcomeScreen currentDomain="general" onSelectTask={() => {}} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/Circuit/i);
    expect(screen.getByText(/Your AI-Powered Electronics Engineering Assistant/i)).toBeInTheDocument();
  });

  it('renders suggested engineering tasks', () => {
    render(<WelcomeScreen currentDomain="general" onSelectTask={() => {}} />);
    expect(screen.getByText("Solve Kirchhoff's Laws")).toBeInTheDocument();
    expect(screen.getByText("Generate Verilog FSM")).toBeInTheDocument();
    expect(screen.getByText("Explain CMOS Inverter")).toBeInTheDocument();
  });

  it('triggers onSelectTask when a card is clicked', () => {
    const handleSelect = vi.fn();
    render(<WelcomeScreen currentDomain="general" onSelectTask={handleSelect} />);
    const card = screen.getByText("Solve Kirchhoff's Laws");
    fireEvent.click(card);
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });
});
