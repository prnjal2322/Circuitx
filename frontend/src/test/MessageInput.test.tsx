import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MessageInput } from '../components/MessageInput';

describe('MessageInput Component', () => {
  it('renders input textarea and placeholder', () => {
    render(
      <MessageInput
        onSendMessage={vi.fn()}
        onStopStreaming={vi.fn()}
        isStreaming={false}
        currentDomain="circuit_analysis"
        onChangeDomain={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask CircuitX about circuits/i);
    expect(textarea).toBeInTheDocument();
  });

  it('allows typing and triggers onSendMessage on Enter', () => {
    const handleSend = vi.fn();
    render(
      <MessageInput
        onSendMessage={handleSend}
        onStopStreaming={vi.fn()}
        isStreaming={false}
        currentDomain="circuit_analysis"
        onChangeDomain={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask CircuitX about circuits/i);
    fireEvent.change(textarea, { target: { value: 'Compute Thevenin equivalent' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

    expect(handleSend).toHaveBeenCalledWith('Compute Thevenin equivalent', []);
  });

  it('does not send message on Shift+Enter', () => {
    const handleSend = vi.fn();
    render(
      <MessageInput
        onSendMessage={handleSend}
        onStopStreaming={vi.fn()}
        isStreaming={false}
        currentDomain="circuit_analysis"
        onChangeDomain={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask CircuitX about circuits/i);
    fireEvent.change(textarea, { target: { value: 'First line' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(handleSend).not.toHaveBeenCalled();
  });

  it('renders stop button and disables textarea during streaming', () => {
    const handleStop = vi.fn();
    render(
      <MessageInput
        onSendMessage={vi.fn()}
        onStopStreaming={handleStop}
        isStreaming={true}
        currentDomain="circuit_analysis"
        onChangeDomain={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(/Ask CircuitX about circuits/i);
    expect(textarea).toBeDisabled();

    const stopButton = screen.getByRole('button', { name: /stop/i });
    expect(stopButton).toBeInTheDocument();
    fireEvent.click(stopButton);
    expect(handleStop).toHaveBeenCalled();
  });

  it('allows domain switching from input dropdown', () => {
    const handleChangeDomain = vi.fn();
    render(
      <MessageInput
        onSendMessage={vi.fn()}
        onStopStreaming={vi.fn()}
        isStreaming={false}
        currentDomain="circuit_analysis"
        onChangeDomain={handleChangeDomain}
      />
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'verilog_hdl' } });
    expect(handleChangeDomain).toHaveBeenCalledWith('verilog_hdl');
  });
});
