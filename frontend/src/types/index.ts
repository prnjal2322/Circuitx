export type EngineeringDomain =
  | 'general'
  | 'circuit_analysis'
  | 'digital_electronics'
  | 'verilog_hdl'
  | 'vlsi_fundamentals'
  | 'signals_systems'
  | 'antennas_rf'
  | 'communication_systems'
  | 'embedded_systems'
  | 'matlab_computing'
  | 'electromagnetic_theory'
  | 'simulation_debugging';

export interface DomainInfo {
  id: EngineeringDomain;
  name: string;
  tagline: string;
  icon: string;
  suggestedTasks: string[];
}

export interface Attachment {
  name: string;
  type: string;
  content: string;
  file_path?: string;
  size_bytes?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: Attachment[];
  metadata?: {
    model?: string;
    domain?: string;
    [key: string]: any;
  };
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  domain: EngineeringDomain;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface HealthStatus {
  status: string;
  app: string;
  tagline: string;
  version: string;
  openai_configured: boolean;
  openai_model?: string;
  provider?: string;
  task_router_active?: boolean;
  deterministic_calculators_ready?: boolean;
  timestamp: string;
}

export interface TaskClassification {
  primary_domain: string;
  detected_domains: string[];
  is_multi_domain: boolean;
  task_type: 'numerical' | 'theory' | 'code' | 'general';
  is_short_answer: boolean;
  relevant_tools: string[];
  domain_score: number;
}
