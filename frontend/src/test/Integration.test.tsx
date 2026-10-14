import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    getHealth: vi.fn().mockResolvedValue({
      status: 'healthy',
      app: 'CircuitX',
      tagline: 'Your AI-Powered Electronics Engineering Assistant',
      version: '1.0.0',
      openai_configured: true,
      openai_model: 'gpt-4o-mini',
      task_router_active: true,
      deterministic_calculators_ready: true,
    }),
    listConversations: vi.fn().mockResolvedValue([
      {
        id: 'conv-101',
        title: 'Active Filter Design',
        domain: 'circuit_analysis',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]),
    getConversation: vi.fn().mockResolvedValue({
      id: 'conv-101',
      title: 'Active Filter Design',
      domain: 'circuit_analysis',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [
        {
          id: 'm1',
          conversation_id: 'conv-101',
          role: 'user',
          content: 'Calculate cutoff frequency of 10k resistor and 100nF capacitor',
          created_at: new Date().toISOString(),
        },
        {
          id: 'm2',
          conversation_id: 'conv-101',
          role: 'assistant',
          content: 'The cutoff frequency $f_c$ is $159.15\\,\\text{Hz}$.',
          created_at: new Date().toISOString(),
        },
      ],
    }),
    createConversation: vi.fn().mockResolvedValue({
      id: 'conv-102',
      title: 'New Engineering Session',
      domain: 'general',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
    streamChatMessage: vi.fn((_payload, onChunk, onDone) => {
      onChunk('Calculating ');
      onChunk('RLC resonance...');
      onDone('assistant-msg-1');
      return Promise.resolve();
    }),
    deleteConversation: vi.fn().mockResolvedValue({ success: true }),
    clearMessages: vi.fn().mockResolvedValue({ success: true }),
    getSimulationStatus: vi.fn().mockResolvedValue({
      iverilog: { installed: false, version: null },
      ngspice: { installed: false, version: null },
      octave: { installed: false, version: null },
    }),
  },
}));

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

describe('CircuitX App Full Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders application dashboard, header, and loaded conversation messages', async () => {
    render(<App />);

    // Check header model display
    await waitFor(() => {
      expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
    });

    // Check conversation title in sidebar
    expect(screen.getByText('Active Filter Design')).toBeInTheDocument();

    // Check message content rendered
    expect(screen.getByText(/Calculate cutoff frequency of 10k resistor/i)).toBeInTheDocument();
  });

  it('opens Engineering Calculators modal when clicking Calculators button in header', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
    });

    const calcButtons = screen.getAllByRole('button', { name: /calculators/i });
    fireEvent.click(calcButtons[0]);

    // Modal should become visible
    expect(screen.getByText(/High-precision verified numerical solvers/i)).toBeInTheDocument();
  });

  it('opens MNA Circuit Solver modal when clicking Circuit Solver button in header', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument();
    });

    const solverButtons = screen.getAllByRole('button', { name: /circuit solver/i });
    fireEvent.click(solverButtons[0]);

    expect(screen.getByText(/Modified Nodal Analysis \(MNA\) Circuit Solver/i)).toBeInTheDocument();
  });
});
