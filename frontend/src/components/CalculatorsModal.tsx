import React, { useState } from 'react';
import { X, Calculator, Zap, ArrowRight, Check } from 'lucide-react';
import { api } from '../services/api';
import { MathRenderer } from './MathRenderer';

interface CalculatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToChat?: (text: string) => void;
}

type TabType =
  | 'ohms'
  | 'divider'
  | 'rlc'
  | 'filter'
  | 'bjt'
  | 'timer555'
  | 'opamp'
  | 'timing'
  | 'numberbase'
  | 'antenna'
  | 'friis'
  | 'shannon'
  | 'cmos';

export const CalculatorsModal: React.FC<CalculatorsModalProps> = ({ isOpen, onClose, onInsertToChat }) => {
  const [activeTab, setActiveTab] = useState<TabType>('ohms');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Ohm's Law state
  const [v, setV] = useState<string>('12');
  const [i, setI] = useState<string>('');
  const [r, setR] = useState<string>('4');
  const [p, setP] = useState<string>('');

  // Dividers state
  const [divType, setDivType] = useState<'voltage' | 'current'>('voltage');
  const [divVin, setDivVin] = useState<string>('12');
  const [divR1, setDivR1] = useState<string>('4000');
  const [divR2, setDivR2] = useState<string>('8000');
  const [divRload, setDivRload] = useState<string>('');
  const [divItotal, setDivItotal] = useState<string>('10');

  // RLC state
  const [rlcR, setRlcR] = useState<string>('10');
  const [rlcL, setRlcL] = useState<string>('0.001'); // 1 mH
  const [rlcC, setRlcC] = useState<string>('0.000001'); // 1 uF
  const [rlcFreq, setRlcFreq] = useState<string>('5000');
  const [rlcTopo, setRlcTopo] = useState<string>('series');

  // Filter state
  const [filterType, setFilterType] = useState<string>('rc_lowpass');
  const [filterR, setFilterR] = useState<string>('1000');
  const [filterC, setFilterC] = useState<string>('0.000001');
  const [filterL, setFilterL] = useState<string>('0.01');

  // BJT state
  const [bjtVcc, setBjtVcc] = useState<string>('12.0');
  const [bjtVbe, setBjtVbe] = useState<string>('0.7');
  const [bjtRb, setBjtRb] = useState<string>('300000');
  const [bjtRc, setBjtRc] = useState<string>('2000');
  const [bjtRe, setBjtRe] = useState<string>('500');
  const [bjtBeta, setBjtBeta] = useState<string>('100');

  // 555 Timer state
  const [timerRa, setTimerRa] = useState<string>('10000');
  const [timerRb, setTimerRb] = useState<string>('10000');
  const [timerC, setTimerC] = useState<string>('0.0000001'); // 100 nF

  // OpAmp state
  const [opampTopo, setOpampTopo] = useState<string>('inverting');
  const [opampRf, setOpampRf] = useState<string>('10000');
  const [opampRin, setOpampRin] = useState<string>('1000');
  const [opampVin, setOpampVin] = useState<string>('1.0');

  // Timing Slack state
  const [timingTclk, setTimingTclk] = useState<string>('10.0');
  const [timingTcq, setTimingTcq] = useState<string>('1.0');
  const [timingCombMax, setTimingCombMax] = useState<string>('5.0');
  const [timingCombMin, setTimingCombMin] = useState<string>('2.0');
  const [timingSetup, setTimingSetup] = useState<string>('1.0');
  const [timingHold, setTimingHold] = useState<string>('0.5');
  const [timingSkew, setTimingSkew] = useState<string>('0.1');

  // Number Base state
  const [baseVal, setBaseVal] = useState<string>('255');
  const [fromBase, setFromBase] = useState<string>('10');

  // Antenna state
  const [antTheta1, setAntTheta1] = useState<string>('30');
  const [antTheta2, setAntTheta2] = useState<string>('40');
  const [antEff, setAntEff] = useState<string>('0.9');

  // Friis state
  const [friisFreq, setFriisFreq] = useState<string>('2400000000'); // 2.4 GHz
  const [friisDist, setFriisDist] = useState<string>('1000');
  const [friisTxP, setFriisTxP] = useState<string>('20');
  const [friisTxG, setFriisTxG] = useState<string>('6');
  const [friisRxG, setFriisRxG] = useState<string>('3');
  const [friisSens, setFriisSens] = useState<string>('-95');

  // Shannon Capacity state
  const [shannonBw, setShannonBw] = useState<string>('10000000'); // 10 MHz
  const [shannonSnr, setShannonSnr] = useState<string>('30');

  // CMOS state
  const [cmosVdd, setCmosVdd] = useState<string>('1.2');
  const [cmosCload, setCmosCload] = useState<string>('10.0');
  const [cmosReq, setCmosReq] = useState<string>('1.5');
  const [cmosMobility, setCmosMobility] = useState<string>('2.5');

  if (!isOpen) return null;

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (activeTab === 'ohms') {
        const res = await api.calcOhmsLaw({
          voltage: v ? parseFloat(v) : undefined,
          current: i ? parseFloat(i) : undefined,
          resistance: r ? parseFloat(r) : undefined,
          power: p ? parseFloat(p) : undefined,
        });
        setResult(res);
      } else if (activeTab === 'divider') {
        if (divType === 'voltage') {
          const res = await api.calcVoltageDivider({
            vin: parseFloat(divVin),
            r1: parseFloat(divR1),
            r2: parseFloat(divR2),
            r_load: divRload ? parseFloat(divRload) : undefined,
          });
          setResult(res);
        } else {
          const res = await api.calcCurrentDivider({
            itotal: parseFloat(divItotal),
            r1: parseFloat(divR1),
            r2: parseFloat(divR2),
          });
          setResult(res);
        }
      } else if (activeTab === 'rlc') {
        const res = await api.calcRLC({
          resistance: parseFloat(rlcR),
          inductance: parseFloat(rlcL),
          capacitance: parseFloat(rlcC),
          frequency: rlcFreq ? parseFloat(rlcFreq) : undefined,
          topology: rlcTopo,
        });
        setResult(res);
      } else if (activeTab === 'filter') {
        const res = await api.calcFilter({
          filter_type: filterType,
          resistance: parseFloat(filterR),
          capacitance: filterC ? parseFloat(filterC) : undefined,
          inductance: filterL ? parseFloat(filterL) : undefined,
        });
        setResult(res);
      } else if (activeTab === 'bjt') {
        const res = await api.calcBjtBias({
          vcc: parseFloat(bjtVcc),
          vbe: parseFloat(bjtVbe),
          rb: parseFloat(bjtRb),
          rc: parseFloat(bjtRc),
          re: parseFloat(bjtRe),
          beta: parseFloat(bjtBeta),
        });
        setResult(res);
      } else if (activeTab === 'timer555') {
        const res = await api.calcTimer555({
          ra_ohm: parseFloat(timerRa),
          rb_ohm: parseFloat(timerRb),
          c_farad: parseFloat(timerC),
        });
        setResult(res);
      } else if (activeTab === 'opamp') {
        const res = await api.calcOpAmp({
          topology: opampTopo,
          rf: parseFloat(opampRf),
          rin: parseFloat(opampRin),
          vin: parseFloat(opampVin),
        });
        setResult(res);
      } else if (activeTab === 'timing') {
        const res = await api.calcTimingSlack({
          t_clk_period_ns: parseFloat(timingTclk),
          t_cq_ns: parseFloat(timingTcq),
          t_comb_max_ns: parseFloat(timingCombMax),
          t_comb_min_ns: parseFloat(timingCombMin),
          t_setup_ns: parseFloat(timingSetup),
          t_hold_ns: parseFloat(timingHold),
          clock_skew_ns: timingSkew ? parseFloat(timingSkew) : undefined,
        });
        setResult(res);
      } else if (activeTab === 'numberbase') {
        const res = await api.calcNumberBase({
          value_str: baseVal,
          from_base: parseInt(fromBase, 10),
        });
        setResult(res);
      } else if (activeTab === 'antenna') {
        const res = await api.calcAntenna({
          theta_1_deg: parseFloat(antTheta1),
          theta_2_deg: parseFloat(antTheta2),
          efficiency: parseFloat(antEff),
        });
        setResult(res);
      } else if (activeTab === 'friis') {
        const res = await api.calcFriis({
          frequency_hz: parseFloat(friisFreq),
          distance_m: parseFloat(friisDist),
          tx_power_dbm: parseFloat(friisTxP),
          tx_gain_dbi: parseFloat(friisTxG),
          rx_gain_dbi: parseFloat(friisRxG),
          rx_sensitivity_dbm: friisSens ? parseFloat(friisSens) : undefined,
        });
        setResult(res);
      } else if (activeTab === 'shannon') {
        const res = await api.calcShannonCapacity({
          bandwidth_hz: parseFloat(shannonBw),
          snr_db: parseFloat(shannonSnr),
        });
        setResult(res);
      } else if (activeTab === 'cmos') {
        const res = await api.calcCmos({
          v_dd: parseFloat(cmosVdd),
          c_load_ff: parseFloat(cmosCload),
          r_eq_nmos_kohm: parseFloat(cmosReq),
          mobility_ratio_pn: parseFloat(cmosMobility),
        });
        setResult(res);
      }
    } catch (err: any) {
      setError(err.message || 'Calculation error');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (!result || !onInsertToChat) return;
    let summary = `### Verified Engineering Calculation: ${activeTab.toUpperCase()}\n`;
    if (result.steps && Array.isArray(result.steps)) {
      summary += result.steps.map((s: string) => `- ${s}`).join('\n') + '\n';
    }
    onInsertToChat(summary);
    onClose();
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'ohms', label: "Ohm's & Power" },
    { id: 'divider', label: 'Dividers (V/I)' },
    { id: 'rlc', label: 'RLC Resonance' },
    { id: 'filter', label: 'Filter Cutoff' },
    { id: 'bjt', label: 'BJT DC Bias' },
    { id: 'timer555', label: '555 Timer' },
    { id: 'opamp', label: 'Op-Amp Gain' },
    { id: 'timing', label: 'Timing Slack' },
    { id: 'numberbase', label: 'Base Radix' },
    { id: 'friis', label: 'RF Link Budget' },
    { id: 'antenna', label: 'Antenna Directivity' },
    { id: 'shannon', label: 'Shannon Capacity' },
    { id: 'cmos', label: 'CMOS Delay' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-2xl bg-[#0F172A] border border-cyan-500/40 shadow-glow-cyan overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400">
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Engineering Calculators</h2>
              <p className="text-xs text-slate-400">High-precision verified numerical solvers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex overflow-x-auto px-4 pt-3 bg-slate-900/60 border-b border-slate-800 gap-1 text-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setResult(null);
                setError(null);
              }}
              className={`px-3 py-2 rounded-t-lg font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300 bg-slate-800/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Ohm's Law */}
          {activeTab === 'ohms' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Enter any two known values to compute the remaining parameters ($V = I \cdot R$, $P = V \cdot I$).
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Voltage V (Volts)</label>
                  <input
                    type="number"
                    value={v}
                    onChange={(e) => setV(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Current I (Amperes)</label>
                  <input
                    type="number"
                    value={i}
                    onChange={(e) => setI(e.target.value)}
                    placeholder="e.g. 2.0"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Resistance R (Ohms)</label>
                  <input
                    type="number"
                    value={r}
                    onChange={(e) => setR(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Power P (Watts)</label>
                  <input
                    type="number"
                    value={p}
                    onChange={(e) => setP(e.target.value)}
                    placeholder="e.g. 24"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Voltage & Current Dividers */}
          {activeTab === 'divider' && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="divType"
                    checked={divType === 'voltage'}
                    onChange={() => setDivType('voltage')}
                    className="text-cyan-500"
                  />
                  <span>Voltage Divider (Vout = Vin · R2 / (R1 + R2))</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="divType"
                    checked={divType === 'current'}
                    onChange={() => setDivType('current')}
                    className="text-cyan-500"
                  />
                  <span>Current Divider (I1 = Itotal · R2 / (R1 + R2))</span>
                </label>
              </div>

              {divType === 'voltage' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Input Voltage Vin (V)</label>
                    <input
                      type="number"
                      value={divVin}
                      onChange={(e) => setDivVin(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Load Resistor Rload (Ω, optional)</label>
                    <input
                      type="number"
                      value={divRload}
                      onChange={(e) => setDivRload(e.target.value)}
                      placeholder="Infinite (unloaded)"
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Top Resistor R1 (Ω)</label>
                    <input
                      type="number"
                      value={divR1}
                      onChange={(e) => setDivR1(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Bottom Resistor R2 (Ω)</label>
                    <input
                      type="number"
                      value={divR2}
                      onChange={(e) => setDivR2(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Total Current Itotal (A)</label>
                    <input
                      type="number"
                      value={divItotal}
                      onChange={(e) => setDivItotal(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div />
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Branch 1 Resistor R1 (Ω)</label>
                    <input
                      type="number"
                      value={divR1}
                      onChange={(e) => setDivR1(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Branch 2 Resistor R2 (Ω)</label>
                    <input
                      type="number"
                      value={divR2}
                      onChange={(e) => setDivR2(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RLC Resonance */}
          {activeTab === 'rlc' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                <MathRenderer content={"Calculates resonance frequency $f_0 = \\frac{1}{2\\pi\\sqrt{LC}}$, Quality Factor $Q$, and complex impedance $Z$."} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Resistance R (Ω)</label>
                  <input
                    type="number"
                    value={rlcR}
                    onChange={(e) => setRlcR(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Inductance L (H)</label>
                  <input
                    type="number"
                    value={rlcL}
                    onChange={(e) => setRlcL(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Capacitance C (F)</label>
                  <input
                    type="number"
                    value={rlcC}
                    onChange={(e) => setRlcC(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Operating Frequency (Hz, optional)</label>
                  <input
                    type="number"
                    value={rlcFreq}
                    onChange={(e) => setRlcFreq(e.target.value)}
                    placeholder="Leave blank for resonant f0"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Topology</label>
                  <select
                    value={rlcTopo}
                    onChange={(e) => setRlcTopo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="series">Series RLC</option>
                    <option value="parallel">Parallel RLC</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Filter Cutoff */}
          {activeTab === 'filter' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Filter Architecture</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="rc_lowpass">RC 1st-Order Low-Pass ($f_c = 1 / 2\pi RC$)</option>
                    <option value="rc_highpass">RC 1st-Order High-Pass ($f_c = 1 / 2\pi RC$)</option>
                    <option value="rl_lowpass">RL 1st-Order Low-Pass ($f_c = R / 2\pi L$)</option>
                    <option value="rlc_bandpass">RLC 2nd-Order Bandpass</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Resistance R (Ω)</label>
                  <input
                    type="number"
                    value={filterR}
                    onChange={(e) => setFilterR(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Capacitance C (F)</label>
                  <input
                    type="number"
                    value={filterC}
                    onChange={(e) => setFilterC(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BJT DC Bias */}
          {activeTab === 'bjt' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Common-Emitter BJT with emitter degeneration resistor. Computes Q-point (IB, IC, VCE) and validates Active vs Saturation operating modes.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Supply VCC (V)</label>
                  <input
                    type="number"
                    value={bjtVcc}
                    onChange={(e) => setBjtVcc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Base-Emitter VBE (V)</label>
                  <input
                    type="number"
                    value={bjtVbe}
                    onChange={(e) => setBjtVbe(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Base Resistor RB (Ω)</label>
                  <input
                    type="number"
                    value={bjtRb}
                    onChange={(e) => setBjtRb(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Collector Resistor RC (Ω)</label>
                  <input
                    type="number"
                    value={bjtRc}
                    onChange={(e) => setBjtRc(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Emitter Resistor RE (Ω)</label>
                  <input
                    type="number"
                    value={bjtRe}
                    onChange={(e) => setBjtRe(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Current Gain Beta (β)</label>
                  <input
                    type="number"
                    value={bjtBeta}
                    onChange={(e) => setBjtBeta(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 555 Astable Timer */}
          {activeTab === 'timer555' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                555 Timer in Astable Multivibrator mode. Computes Thigh, Tlow, total period T, frequency f = 1.44 / ((RA + 2·RB)·C), and duty cycle.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Resistor RA (Ω)</label>
                  <input
                    type="number"
                    value={timerRa}
                    onChange={(e) => setTimerRa(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Resistor RB (Ω)</label>
                  <input
                    type="number"
                    value={timerRb}
                    onChange={(e) => setTimerRb(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Timing Capacitor C (F)</label>
                  <input
                    type="number"
                    value={timerC}
                    onChange={(e) => setTimerC(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* OpAmp Gain */}
          {activeTab === 'opamp' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Op-Amp Topology</label>
                  <select
                    value={opampTopo}
                    onChange={(e) => setOpampTopo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="inverting">Inverting Amplifier (Av = -Rf / Rin)</option>
                    <option value="noninverting">Non-Inverting Amplifier (Av = 1 + Rf / Rin)</option>
                    <option value="voltage_follower">Voltage Follower / Buffer (Av = 1)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Feedback Resistor Rf (Ω)</label>
                  <input
                    type="number"
                    value={opampRf}
                    onChange={(e) => setOpampRf(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Input Resistor Rin (Ω)</label>
                  <input
                    type="number"
                    value={opampRin}
                    onChange={(e) => setOpampRin(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Input Voltage Vin (V)</label>
                  <input
                    type="number"
                    value={opampVin}
                    onChange={(e) => setOpampVin(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Timing Slack */}
          {activeTab === 'timing' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Synchronous register-to-register timing analysis. Calculates Setup Slack (Tclk + Tskew - Tcq - Tcomb,max - Tsetup) and Hold Slack (Tcq + Tcomb,min - Thold - Tskew).
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Clock Period Tclk (ns)</label>
                  <input
                    type="number"
                    value={timingTclk}
                    onChange={(e) => setTimingTclk(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Clock-to-Q Delay Tcq (ns)</label>
                  <input
                    type="number"
                    value={timingTcq}
                    onChange={(e) => setTimingTcq(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Max Combinational Delay (ns)</label>
                  <input
                    type="number"
                    value={timingCombMax}
                    onChange={(e) => setTimingCombMax(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Min Combinational Delay (ns)</label>
                  <input
                    type="number"
                    value={timingCombMin}
                    onChange={(e) => setTimingCombMin(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Setup Time Tsetup (ns)</label>
                  <input
                    type="number"
                    value={timingSetup}
                    onChange={(e) => setTimingSetup(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Hold Time Thold (ns)</label>
                  <input
                    type="number"
                    value={timingHold}
                    onChange={(e) => setTimingHold(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Clock Skew (ns)</label>
                  <input
                    type="number"
                    value={timingSkew}
                    onChange={(e) => setTimingSkew(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Number Base Radix */}
          {activeTab === 'numberbase' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Convert numeric representations between Binary, Octal, Decimal, Hexadecimal, and Two's Complement.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Input Value</label>
                  <input
                    type="text"
                    value={baseVal}
                    onChange={(e) => setBaseVal(e.target.value)}
                    placeholder="e.g. 255 or 0xFF or 11111111"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Source Base / Radix</label>
                  <select
                    value={fromBase}
                    onChange={(e) => setFromBase(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="10">Decimal (Base 10)</option>
                    <option value="16">Hexadecimal (Base 16)</option>
                    <option value="2">Binary (Base 2)</option>
                    <option value="8">Octal (Base 8)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Antenna Directivity */}
          {activeTab === 'antenna' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                <MathRenderer content={"Kraus approximation: $D \\approx \\frac{41253}{\\theta_1 \\cdot \\theta_2}$ (degrees) and Gain $G = \\eta D$."} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">HPBW Plane 1 (degrees)</label>
                  <input
                    type="number"
                    value={antTheta1}
                    onChange={(e) => setAntTheta1(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">HPBW Plane 2 (degrees)</label>
                  <input
                    type="number"
                    value={antTheta2}
                    onChange={(e) => setAntTheta2(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Radiation Efficiency (0.0 - 1.0)</label>
                  <input
                    type="number"
                    value={antEff}
                    onChange={(e) => setAntEff(e.target.value)}
                    step="0.05"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Friis RF Link Budget */}
          {activeTab === 'friis' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                <MathRenderer content={"Friis Free-Space Path Loss: $FSPL = 20\\log_{10}(d) + 20\\log_{10}(f) + 20\\log_{10}(\\frac{4\\pi}{c})$."} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Frequency (Hz)</label>
                  <input
                    type="number"
                    value={friisFreq}
                    onChange={(e) => setFriisFreq(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Distance (meters)</label>
                  <input
                    type="number"
                    value={friisDist}
                    onChange={(e) => setFriisDist(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Transmitter Power (dBm)</label>
                  <input
                    type="number"
                    value={friisTxP}
                    onChange={(e) => setFriisTxP(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Tx Antenna Gain (dBi)</label>
                  <input
                    type="number"
                    value={friisTxG}
                    onChange={(e) => setFriisTxG(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Rx Antenna Gain (dBi)</label>
                  <input
                    type="number"
                    value={friisRxG}
                    onChange={(e) => setFriisRxG(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Rx Sensitivity (dBm, optional)</label>
                  <input
                    type="number"
                    value={friisSens}
                    onChange={(e) => setFriisSens(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Shannon Capacity */}
          {activeTab === 'shannon' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                <MathRenderer content={"Shannon-Hartley Theorem: $C = B \\log_2(1 + \\text{SNR})$ in bits per second."} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Channel Bandwidth B (Hz)</label>
                  <input
                    type="number"
                    value={shannonBw}
                    onChange={(e) => setShannonBw(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Signal-to-Noise Ratio SNR (dB)</label>
                  <input
                    type="number"
                    value={shannonSnr}
                    onChange={(e) => setShannonSnr(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CMOS Inverter Delay */}
          {activeTab === 'cmos' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300">
                <MathRenderer content={"Propagation Delay: $t_{pHL} = 0.69 R_{n} C_L$, $t_{pLH} = 0.69 R_{p} C_L$."} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">VDD (V)</label>
                  <input
                    type="number"
                    value={cmosVdd}
                    onChange={(e) => setCmosVdd(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Load Cap CL (fF)</label>
                  <input
                    type="number"
                    value={cmosCload}
                    onChange={(e) => setCmosCload(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">NMOS Req (kΩ)</label>
                  <input
                    type="number"
                    value={cmosReq}
                    onChange={(e) => setCmosReq(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Mobility Ratio (μn/μp)</label>
                  <input
                    type="number"
                    value={cmosMobility}
                    onChange={(e) => setCmosMobility(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Calculate Button */}
          <div className="pt-2">
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold shadow-glow-sm transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Solving in NumPy engine...</span>
              ) : (
                <>
                  <Zap size={16} />
                  <span>Execute Calculation</span>
                </>
              )}
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Results Box */}
          {result && (
            <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-400" />
                  Verified Solution
                </span>
                {onInsertToChat && (
                  <button
                    onClick={handleInsert}
                    className="text-xs text-slate-300 hover:text-cyan-300 flex items-center gap-1 bg-slate-800 px-2 py-1 rounded"
                  >
                    <span>Insert into chat</span>
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>

              {/* Step by step derivation */}
              {result.steps && (
                <div className="space-y-1 text-xs text-slate-300 font-mono bg-slate-950/50 p-3 rounded-lg">
                  {result.steps.map((s: string, idx: number) => (
                    <div key={idx} className="leading-relaxed">
                      <MathRenderer content={s} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
