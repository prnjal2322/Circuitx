import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageItem } from '../components/MessageItem';
import { Message } from '../types';

describe('MessageItem Component', () => {
  it('renders user message properly', () => {
    const userMsg: Message = {
      id: 'm1',
      conversation_id: 'c1',
      role: 'user',
      content: 'Explain CMOS inverter sizing',
      created_at: new Date().toISOString(),
    };
    render(<MessageItem message={userMsg} />);
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('Explain CMOS inverter sizing')).toBeInTheDocument();
  });

  it('renders assistant message with copy button', () => {
    const assistantMsg: Message = {
      id: 'm2',
      conversation_id: 'c1',
      role: 'assistant',
      content: 'The optimal Wp/Wn ratio is 2.5.',
      created_at: new Date().toISOString(),
    };
    render(<MessageItem message={assistantMsg} />);
    expect(screen.getByText('CircuitX')).toBeInTheDocument();
    expect(screen.getByText('The optimal Wp/Wn ratio is 2.5.')).toBeInTheDocument();
    expect(screen.getByTitle('Copy full answer')).toBeInTheDocument();
  });
});
