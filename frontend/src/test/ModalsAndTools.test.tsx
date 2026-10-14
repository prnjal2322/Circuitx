import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircuitSolverModal } from '../components/CircuitSolverModal';
import { VisualizationsModal } from '../components/VisualizationsModal';
import { SimulationModal } from '../components/SimulationModal';
import { ExportModal } from '../components/ExportModal';

describe('Interactive Tool Modals', () => {
  it('renders CircuitSolverModal with templates and netlist editor', () => {
    render(
      <CircuitSolverModal
        isOpen={true}
        onClose={vi.fn()}
        onInsertToChat={vi.fn()}
      />
    );

    expect(screen.getByText(/Modified Nodal Analysis \(MNA\) Circuit Solver/i)).toBeInTheDocument();
    expect(screen.getByText('Voltage Divider')).toBeInTheDocument();
    expect(screen.getByText('Wheatstone Bridge')).toBeInTheDocument();
    expect(screen.getByText('Solve Circuit Operating Point')).toBeInTheDocument();
  });

  it('renders VisualizationsModal with tabs and logic gate toggle', () => {
    render(
      <VisualizationsModal
        isOpen={true}
        onClose={vi.fn()}
        onInsertToChat={vi.fn()}
      />
    );

    expect(screen.getByText(/Engineering Visualizations Hub/i)).toBeInTheDocument();
    expect(screen.getByText('Logic Gates & Truth Tables')).toBeInTheDocument();
    expect(screen.getByText('Digital Timing Diagram')).toBeInTheDocument();
    expect(screen.getByText('Frequency Response (Bode)')).toBeInTheDocument();
    expect(screen.getByText('Antenna Radiation Pattern')).toBeInTheDocument();
  });

  it('renders SimulationModal with Verilog editor and structural linter button', () => {
    render(
      <SimulationModal
        isOpen={true}
        onClose={vi.fn()}
        onInsertToChat={vi.fn()}
      />
    );

    expect(screen.getByText(/External Simulation & Tool Integrations/i)).toBeInTheDocument();
    expect(screen.getByText('Run Simulation (Icarus Verilog)')).toBeInTheDocument();
    expect(screen.getByText('Structural Linter Check')).toBeInTheDocument();
  });

  it('renders ExportModal with all export format actions', () => {
    render(
      <ExportModal
        isOpen={true}
        onClose={vi.fn()}
        conversationId="conv-12345"
        conversationTitle="RF Link Budget Session"
      />
    );

    expect(screen.getByText(/Export Engineering Report/i)).toBeInTheDocument();
    expect(screen.getByText(/Markdown Document \(\.md\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Standalone HTML Report \(\.html\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Numerical Data Table \(\.csv\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Raw JSON \(\.json\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Print \/ Save as PDF/i)).toBeInTheDocument();
  });
});
