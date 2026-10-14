import { Conversation, HealthStatus, Attachment, TaskClassification } from '../types';

const API_BASE = import.meta.env.VITE_BACKEND_URL || '';

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
  };
}

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/api/health`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Backend health check failed');
    return res.json();
  },

  async saveApiKey(apiKey: string, provider: string = 'groq', model?: string): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/api/settings/key`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ api_key: apiKey, provider, model }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save API key');
    }
    return res.json();
  },

  async classifyTask(prompt: string): Promise<TaskClassification> {
    const res = await fetch(`${API_BASE}/api/task-router/classify`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error('Task classification failed');
    return res.json();
  },

  async listConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/api/conversations`);
    if (!res.ok) throw new Error('Failed to fetch conversations');
    return res.json();
  },

  async createConversation(title?: string, domain: string = 'general'): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ title, domain }),
    });
    if (!res.ok) throw new Error('Failed to create conversation');
    return res.json();
  },

  async getConversation(convId: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/api/conversations/${convId}`);
    if (!res.ok) throw new Error('Failed to load conversation');
    return res.json();
  },

  async updateConversation(convId: string, data: { title?: string; domain?: string }): Promise<void> {
    const res = await fetch(`${API_BASE}/api/conversations/${convId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update conversation');
  },

  async deleteConversation(convId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/conversations/${convId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
  },

  async clearMessages(convId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/conversations/${convId}/messages`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to clear conversation messages');
  },

  async sendChatMessage(payload: {
    conversation_id: string;
    message: string;
    domain?: string;
    attachments?: Attachment[];
  }): Promise<{ success: boolean; message_id: string; role: string; content: string }> {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Chat error' }));
      throw new Error(err.detail || 'Failed to send message');
    }
    return res.json();
  },

  async streamChatMessage(
    payload: {
      conversation_id: string;
      message: string;
      domain?: string;
      attachments?: Attachment[];
    },
    onChunk: (chunk: string) => void,
    onDone: (messageId: string) => void,
    onError: (err: string) => void,
    abortSignal?: AbortSignal
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response stream body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const data = JSON.parse(jsonStr);
              if (data.chunk) {
                onChunk(data.chunk);
              }
              if (data.done) {
                onDone(data.message_id || '');
              }
              if (data.error) {
                onError(data.error);
              }
            } catch (err) {
              console.error('Failed to parse SSE event', err);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        onDone('');
        return;
      }
      onError(err.message || 'Stream connection error');
    }
  },

  // Calculators API
  async calcOhmsLaw(params: { voltage?: number; current?: number; resistance?: number; power?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/ohms-law`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcRLC(params: { resistance: number; inductance: number; capacitance: number; frequency?: number; topology?: string }) {
    const res = await fetch(`${API_BASE}/api/calc/rlc`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcFilter(params: { filter_type: string; resistance: number; capacitance?: number; inductance?: number; target_frequency?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/filter-cutoff`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcFriis(params: { frequency_hz: number; distance_m: number; tx_power_dbm: number; tx_gain_dbi?: number; rx_gain_dbi?: number; rx_sensitivity_dbm?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/friis-link-budget`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcOpAmp(params: { topology: string; rf: number; rin: number; vin?: number; gbw_hz?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/opamp`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcAntenna(params: { theta_1_deg: number; theta_2_deg: number; efficiency?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/antenna-directivity`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcCmos(params: { v_dd?: number; c_load_ff?: number; r_eq_nmos_kohm?: number; mobility_ratio_pn?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/cmos-delay`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcVoltageDivider(params: { vin: number; r1: number; r2: number; r_load?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/voltage-divider`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcCurrentDivider(params: { itotal: number; r1: number; r2: number }) {
    const res = await fetch(`${API_BASE}/api/calc/current-divider`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcBjtBias(params: { vcc?: number; vbe?: number; rb?: number; rc?: number; re?: number; beta?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/bjt-bias`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcTimer555(params: { ra_ohm: number; rb_ohm: number; c_farad: number }) {
    const res = await fetch(`${API_BASE}/api/calc/timer-555`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcNumberBase(params: { value_str: string; from_base?: number; bit_width?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/number-base`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcTimingSlack(params: {
    t_clk_period_ns: number;
    t_cq_ns: number;
    t_comb_max_ns: number;
    t_comb_min_ns: number;
    t_setup_ns: number;
    t_hold_ns: number;
    clock_skew_ns?: number;
  }) {
    const res = await fetch(`${API_BASE}/api/calc/timing-slack`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcFirFilter(params: { num_taps: number; cutoff_normalized: number; window_type?: string }) {
    const res = await fetch(`${API_BASE}/api/calc/fir-filter`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcVswr(params: { z_load_ohm: number; z0_ohm?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/vswr-return-loss`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcShannonCapacity(params: { bandwidth_hz: number; snr_db?: number; snr_linear?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/shannon-capacity`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcPcmSnr(params: { num_bits: number }) {
    const res = await fetch(`${API_BASE}/api/calc/pcm-snr`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcComplexMath(params: { op: string; a_real: number; a_imag?: number; b_real?: number; b_imag?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/complex-math`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  async calcDbConversion(params: { mode: string; value: number }) {
    const res = await fetch(`${API_BASE}/api/calc/db-conversion`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Calculation failed');
    }
    return res.json();
  },

  // Circuit Solver APIs
  async solveCircuit(payload: { netlist?: string; components?: any[]; ground_node?: string }) {
    const res = await fetch(`${API_BASE}/api/circuit/solve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Solver error' }));
      throw new Error(err.detail || 'Circuit solving failed');
    }
    return res.json();
  },

  async parseNetlist(payload: { netlist: string }) {
    const res = await fetch(`${API_BASE}/api/circuit/parse`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Netlist parse error' }));
      throw new Error(err.detail || 'Netlist parsing failed');
    }
    return res.json();
  },

  // Calculation Engine APIs
  async convertUnits(payload: { category: string; value: number; from_unit: string; to_unit: string }) {
    const res = await fetch(`${API_BASE}/api/calc/convert-units`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unit conversion error' }));
      throw new Error(err.detail || 'Unit conversion failed');
    }
    return res.json();
  },

  async calcResistorNetwork(payload: { topology: string; resistors: number[] }) {
    const res = await fetch(`${API_BASE}/api/calc/resistor-network`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Resistor network calculation failed');
    }
    return res.json();
  },

  async calcOhmsLawExact(payload: { voltage?: number; current?: number; resistance?: number; power?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/ohms-law-exact`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Exact calculation failed');
    }
    return res.json();
  },

  async calcComplexImpedance(payload: { resistance: number; inductance?: number; capacitance?: number; frequency?: number; topology?: string }) {
    const res = await fetch(`${API_BASE}/api/calc/complex-impedance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Complex impedance calculation failed');
    }
    return res.json();
  },

  async calcFrequencyWavelength(payload: { frequency?: number; wavelength?: number; relative_permittivity?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/frequency-wavelength`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Frequency/wavelength calculation failed');
    }
    return res.json();
  },

  async calcAntennaProperties(payload: { antenna_type?: string; hpbw_theta_1_deg?: number; hpbw_theta_2_deg?: number; efficiency?: number; frequency_hz?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/antenna-properties`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Antenna calculation failed');
    }
    return res.json();
  },

  async calcThermalNoise(payload: { bandwidth_hz: number; temperature_k?: number; noise_figure_db?: number }) {
    const res = await fetch(`${API_BASE}/api/calc/thermal-noise`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'Thermal noise calculation failed');
    }
    return res.json();
  },

  async calcFirFilterSpectrum(payload: { num_taps?: number; cutoff_normalized?: number; filter_type?: string; window_type?: string }) {
    const res = await fetch(`${API_BASE}/api/calc/fir-filter-spectrum`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Calculation error' }));
      throw new Error(err.detail || 'FIR filter calculation failed');
    }
    return res.json();
  },

  // Simulators APIs
  async getSimulationStatus() {
    const res = await fetch(`${API_BASE}/api/sim/status`);
    if (!res.ok) throw new Error('Failed to retrieve simulation status');
    return res.json();
  },

  async runVerilogSimulation(payload: { code: string; testbench_code?: string; timeout_sec?: number }) {
    const res = await fetch(`${API_BASE}/api/sim/verilog`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Simulation error' }));
      throw new Error(err.detail || 'Simulation run failed');
    }
    return res.json();
  },

  async lintVerilog(payload: { code: string }) {
    const res = await fetch(`${API_BASE}/api/sim/verilog/lint`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Linter error' }));
      throw new Error(err.detail || 'Verilog linting failed');
    }
    return res.json();
  },

  // File Upload API
  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload error' }));
      throw new Error(err.detail || 'File upload failed');
    }
    return res.json();
  },

  getExportUrl(convId: string, format: 'markdown' | 'json' | 'csv' | 'html' = 'markdown'): string {
    return `${API_BASE}/api/export/${convId}?format=${format}`;
  }
};
