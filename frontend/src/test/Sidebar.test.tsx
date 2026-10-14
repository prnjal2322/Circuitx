import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../components/Sidebar';
import { Conversation } from '../types';

describe('Sidebar Component', () => {
  const mockConversations: Conversation[] = [
    {
      id: 'c1',
      title: 'Op-Amp Filter Design',
      domain: 'circuit_analysis',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'c2',
      title: 'Verilog FSM Controller',
      domain: 'verilog_hdl',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it('renders brand header, disciplines, and saved conversations', () => {
    render(
      <Sidebar
        currentDomain="circuit_analysis"
        onSelectDomain={vi.fn()}
        onNewChat={vi.fn()}
        conversations={mockConversations}
        activeConversationId="c1"
        onSelectConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        onOpenCircuitSolver={vi.fn()}
        onOpenVisualizations={vi.fn()}
        onOpenSimulation={vi.fn()}
        onOpenCalculators={vi.fn()}
        onOpenSettings={vi.fn()}
        isOpenMobile={false}
        onCloseMobile={vi.fn()}
      />
    );

    expect(screen.getByText('Circuit')).toBeInTheDocument();
    expect(screen.getByText('Op-Amp Filter Design')).toBeInTheDocument();
    expect(screen.getByText('Verilog FSM Controller')).toBeInTheDocument();
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('handles domain selection', () => {
    const handleSelectDomain = vi.fn();
    render(
      <Sidebar
        currentDomain="general"
        onSelectDomain={handleSelectDomain}
        onNewChat={vi.fn()}
        conversations={[]}
        activeConversationId={null}
        onSelectConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        onOpenCircuitSolver={vi.fn()}
        onOpenVisualizations={vi.fn()}
        onOpenSimulation={vi.fn()}
        onOpenCalculators={vi.fn()}
        onOpenSettings={vi.fn()}
        isOpenMobile={false}
        onCloseMobile={vi.fn()}
      />
    );

    const circuitBtn = screen.getByText('Circuit Analysis');
    fireEvent.click(circuitBtn);
    expect(handleSelectDomain).toHaveBeenCalledWith('circuit_analysis');
  });

  it('triggers tool modal openers (Calculators, MNA Solver, Simulators)', () => {
    const onOpenCalculators = vi.fn();
    const onOpenCircuitSolver = vi.fn();
    const onOpenVisualizations = vi.fn();
    const onOpenSimulation = vi.fn();

    render(
      <Sidebar
        currentDomain="general"
        onSelectDomain={vi.fn()}
        onNewChat={vi.fn()}
        conversations={[]}
        activeConversationId={null}
        onSelectConversation={vi.fn()}
        onDeleteConversation={vi.fn()}
        onOpenCircuitSolver={onOpenCircuitSolver}
        onOpenVisualizations={onOpenVisualizations}
        onOpenSimulation={onOpenSimulation}
        onOpenCalculators={onOpenCalculators}
        onOpenSettings={vi.fn()}
        isOpenMobile={false}
        onCloseMobile={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Engineering Calculators'));
    expect(onOpenCalculators).toHaveBeenCalled();

    fireEvent.click(screen.getByText('MNA Circuit Solver'));
    expect(onOpenCircuitSolver).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Engineering Visualizations'));
    expect(onOpenVisualizations).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Hardware Simulators'));
    expect(onOpenSimulation).toHaveBeenCalled();
  });

  it('triggers delete on conversation item', () => {
    const onDelete = vi.fn();
    render(
      <Sidebar
        currentDomain="general"
        onSelectDomain={vi.fn()}
        onNewChat={vi.fn()}
        conversations={mockConversations}
        activeConversationId="c1"
        onSelectConversation={vi.fn()}
        onDeleteConversation={onDelete}
        onOpenCircuitSolver={vi.fn()}
        onOpenVisualizations={vi.fn()}
        onOpenSimulation={vi.fn()}
        onOpenCalculators={vi.fn()}
        onOpenSettings={vi.fn()}
        isOpenMobile={false}
        onCloseMobile={vi.fn()}
      />
    );

    const deleteButtons = screen.getAllByTitle('Delete conversation');
    expect(deleteButtons.length).toBe(2);
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('c1');
  });
});
