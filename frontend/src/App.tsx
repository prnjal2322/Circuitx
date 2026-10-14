import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { WelcomeScreen } from './components/WelcomeScreen';
import { MessageItem } from './components/MessageItem';
import { MessageInput } from './components/MessageInput';
import { CalculatorsModal } from './components/CalculatorsModal';
import { CircuitSolverModal } from './components/CircuitSolverModal';
import { VisualizationsModal } from './components/VisualizationsModal';
import { SimulationModal } from './components/SimulationModal';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import { api } from './services/api';
import { Conversation, Message, EngineeringDomain, Attachment, HealthStatus } from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  // Application State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentDomain, setCurrentDomain] = useState<EngineeringDomain>('general');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // Modals & Drawers
  const [isCalculatorsOpen, setIsCalculatorsOpen] = useState(false);
  const [isCircuitSolverOpen, setIsCircuitSolverOpen] = useState(false);
  const [isVisualizationsOpen, setIsVisualizationsOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversations & health on mount
  useEffect(() => {
    loadHealth();
    loadConversations();
  }, []);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const loadHealth = async () => {
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err: any) {
      console.warn('Backend health check warning:', err);
    }
  };

  const loadConversations = async () => {
    try {
      const list = await api.listConversations();
      setConversations(list);
      if (list.length > 0 && !activeConvId) {
        loadConversation(list[0].id);
      }
    } catch (err: any) {
      console.warn('Could not load conversations:', err);
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      setError(null);
      const conv = await api.getConversation(convId);
      setActiveConvId(conv.id);
      setCurrentDomain(conv.domain as EngineeringDomain);
      setMessages(conv.messages || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation');
    }
  };

  const handleNewChat = async (domain: EngineeringDomain = currentDomain) => {
    try {
      setError(null);
      const newConv = await api.createConversation('New Engineering Session', domain);
      setConversations((prev) => [newConv, ...prev]);
      setActiveConvId(newConv.id);
      setCurrentDomain(domain);
      setMessages([]);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize session');
    }
  };

  const handleSelectDomain = (domain: EngineeringDomain) => {
    setCurrentDomain(domain);
    if (activeConvId) {
      api.updateConversation(activeConvId, { domain }).catch(console.warn);
    }
  };

  const handleDeleteConversation = async (convId: string) => {
    try {
      await api.deleteConversation(convId);
      const updated = conversations.filter((c) => c.id !== convId);
      setConversations(updated);
      if (activeConvId === convId) {
        if (updated.length > 0) {
          loadConversation(updated[0].id);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete conversation');
    }
  };

  const handleClearChat = async () => {
    if (!activeConvId) return;
    try {
      await api.clearMessages(activeConvId);
      setMessages([]);
    } catch (err: any) {
      setError(err.message || 'Failed to clear chat');
    }
  };

  const handleSendMessage = async (text: string, attachments: Attachment[] = []) => {
    if (!text.trim() && attachments.length === 0) return;
    setError(null);

    let convId = activeConvId;
    if (!convId) {
      try {
        const newConv = await api.createConversation('New Engineering Session', currentDomain);
        setConversations((prev) => [newConv, ...prev]);
        setActiveConvId(newConv.id);
        convId = newConv.id;
      } catch (err: any) {
        setError('Failed to start session');
        return;
      }
    }

    // Append optimistic user message
    const tempUserMsg: Message = {
      id: `user-${Date.now()}`,
      conversation_id: convId,
      role: 'user',
      content: text,
      attachments,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // Setup streaming response
    setIsStreaming(true);
    setStreamingContent('');
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedResponse = '';

    await api.streamChatMessage(
      {
        conversation_id: convId,
        message: text,
        domain: currentDomain,
        attachments,
      },
      (chunk) => {
        accumulatedResponse += chunk;
        setStreamingContent(accumulatedResponse);
      },
      (messageId) => {
        setIsStreaming(false);
        const finalAssistantMsg: Message = {
          id: messageId || `assistant-${Date.now()}`,
          conversation_id: convId!,
          role: 'assistant',
          content: accumulatedResponse,
          metadata: { model: health?.openai_model || 'gpt-4o-mini', domain: currentDomain },
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, finalAssistantMsg]);
        setStreamingContent('');
        loadConversations();
      },
      (err) => {
        setIsStreaming(false);
        setError(err);
      },
      controller.signal
    );
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      setMessages((prev) => {
        const lastIdx = prev.map((m) => m.role).lastIndexOf('assistant');
        return lastIdx !== -1 ? prev.slice(0, lastIdx) : prev;
      });
      handleSendMessage(lastUserMsg.content, lastUserMsg.attachments);
    }
  };

  const handleSelectFollowUp = (question: string) => {
    handleSendMessage(question);
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="flex h-screen bg-[#0A0E17] text-slate-100 overflow-hidden font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        currentDomain={currentDomain}
        onSelectDomain={handleSelectDomain}
        onNewChat={handleNewChat}
        conversations={conversations}
        activeConversationId={activeConvId}
        onSelectConversation={loadConversation}
        onDeleteConversation={handleDeleteConversation}
        onOpenCircuitSolver={() => setIsCircuitSolverOpen(true)}
        onOpenVisualizations={() => setIsVisualizationsOpen(true)}
        onOpenSimulation={() => setIsSimulationOpen(true)}
        onOpenCalculators={() => setIsCalculatorsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative circuit-bg">
        {/* Top Header */}
        <Header
          currentDomain={currentDomain}
          model={health?.openai_model || 'gpt-4o-mini'}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenCircuitSolver={() => setIsCircuitSolverOpen(true)}
          onOpenVisualizations={() => setIsVisualizationsOpen(true)}
          onOpenSimulation={() => setIsSimulationOpen(true)}
          onOpenCalculators={() => setIsCalculatorsOpen(true)}
          onOpenExport={() => setIsExportOpen(true)}
          onClearChat={handleClearChat}
          onOpenSettings={() => setIsSettingsOpen(true)}
          hasMessages={messages.length > 0}
        />

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-950/80 border-b border-rose-800 text-rose-200 px-4 py-2 text-xs flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
            <button
              onClick={() => handleRegenerate()}
              className="flex items-center gap-1 font-semibold text-rose-300 hover:text-white"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Scrollable Messages Container */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeScreen
              currentDomain={currentDomain}
              onSelectTask={(prompt, domain) => {
                if (domain) setCurrentDomain(domain);
                handleSendMessage(prompt);
              }}
            />
          ) : (
            <div className="pb-8">
              {messages.map((msg, index) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  onRegenerate={handleRegenerate}
                  onSelectFollowUp={handleSelectFollowUp}
                  isLastAssistant={index === messages.length - 1 && msg.role === 'assistant'}
                />
              ))}

              {/* Live Streaming Response Card */}
              {isStreaming && (
                <MessageItem
                  message={{
                    id: 'streaming-assistant',
                    conversation_id: activeConvId || '',
                    role: 'assistant',
                    content: streamingContent || '⚡ Evaluating electronics equations & schematics...',
                    metadata: { domain: currentDomain, model: health?.openai_model || 'gpt-4o-mini' },
                    created_at: new Date().toISOString(),
                  }}
                />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Box Component */}
        <MessageInput
          onSendMessage={handleSendMessage}
          onStopStreaming={handleStopStreaming}
          isStreaming={isStreaming}
          currentDomain={currentDomain}
          onChangeDomain={handleSelectDomain}
        />
      </div>

      {/* Engineering Calculators Modal */}
      <CalculatorsModal
        isOpen={isCalculatorsOpen}
        onClose={() => setIsCalculatorsOpen(false)}
        onInsertToChat={(text) => handleSendMessage(text)}
      />

      {/* MNA DC Circuit Solver & Schematic Modal */}
      <CircuitSolverModal
        isOpen={isCircuitSolverOpen}
        onClose={() => setIsCircuitSolverOpen(false)}
        onInsertToChat={(text) => handleSendMessage(text)}
      />

      {/* Interactive Engineering Visualizations Modal */}
      <VisualizationsModal
        isOpen={isVisualizationsOpen}
        onClose={() => setIsVisualizationsOpen(false)}
        onInsertToChat={(text) => handleSendMessage(text)}
      />

      {/* Hardware Simulators (Icarus Verilog, ngspice, Octave) Modal */}
      <SimulationModal
        isOpen={isSimulationOpen}
        onClose={() => setIsSimulationOpen(false)}
        onInsertToChat={(text) => handleSendMessage(text)}
      />

      {/* Settings & Backend Status Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        health={health}
        onRefreshHealth={loadHealth}
      />

      {/* Export Report Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        conversationId={activeConvId || ''}
        conversationTitle={activeConv?.title || 'CircuitX Engineering Report'}
      />
    </div>
  );
};

export default App;
