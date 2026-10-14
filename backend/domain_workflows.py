"""
CircuitX Domain Workflows Engine
Provides specialized engineering workflow guidelines, parameter checklists,
device model operating assumptions, and deterministic solvers for all 12 modules.
"""

from typing import Dict, Any, List

DOMAIN_WORKFLOWS: Dict[str, Dict[str, Any]] = {
    "circuit_analysis": {
        "module_id": "MODULE 1: CIRCUIT ANALYSIS",
        "title": "Circuit Analysis & Network Theory",
        "assumptions": "Linear time-invariant (LTI) elements, ideal voltage/current sources unless source resistance is specified, lumped-element regime.",
        "required_parameters": [
            "Source values (DC voltage/current or AC peak/RMS and frequency)",
            "Passive component values (R in Ω, L in H, C in F)",
            "Circuit topology (series, parallel, bridge, loop connections)"
        ],
        "missing_parameter_prompt": "Please specify the missing component values or circuit topology (e.g. series/parallel connections, source frequency, or load resistance).",
        "deterministic_tools": ["ohms_law", "voltage_divider", "current_divider", "rlc", "rc_rl_transient"],
        "checklist": [
            "State reference node (GND = 0V) and branch current polarities.",
            "Formulate nodal (KCL) or mesh (KVL) matrix equations.",
            "Solve algebraically using standard determinant or substitution.",
            "Calculate branch currents, branch voltages, and power dissipation P = V * I."
        ]
    },

    "analog_electronics": {
        "module_id": "MODULE 2: ANALOG ELECTRONICS",
        "title": "Analog Electronics & Semiconductor Devices",
        "assumptions": "Silicon forward diode drop VD ≈ 0.7V, BJT active mode VBE ≈ 0.7V with β specified, ideal op-amp virtual short (V+ = V-, I+ = I- = 0) within supply rails.",
        "required_parameters": [
            "Supply rails (VCC/VEE, VDD/VSS)",
            "Transistor parameters (β, Vth, W/L, Early voltage VA)",
            "Resistor biasing network values"
        ],
        "missing_parameter_prompt": "Please specify the active device model (diode type, BJT beta, MOSFET threshold voltage) and supply rail voltages.",
        "deterministic_tools": ["bjt_bias", "opamp", "filter", "timer_555"],
        "checklist": [
            "Declare active device model and operating assumptions explicitly.",
            "Determine DC Q-point (IB, IC, VCE or VGS, VDS, ID).",
            "Verify operating region (Active vs Saturation for BJT; Triode vs Saturation for MOSFET).",
            "Perform small-signal AC analysis with gm and r_pi / ro if requested."
        ]
    },

    "digital_electronics": {
        "module_id": "MODULE 3: DIGITAL ELECTRONICS",
        "title": "Digital Electronics & Logic Design",
        "assumptions": "Standard binary logic (Logic 0 = GND, Logic 1 = VDD), ideal propagation delay unless gate delays (tpd, tsetup, thold) are specified.",
        "required_parameters": [
            "Input variables and desired output function",
            "Active-high or active-low control inputs",
            "Clock frequency and setup/hold timing constraints if sequential"
        ],
        "missing_parameter_prompt": "Please specify the Boolean inputs/outputs, state transition requirements, or logic gate family.",
        "deterministic_tools": ["number_base_conversion", "timing_slack"],
        "checklist": [
            "Provide complete truth tables in markdown tables.",
            "Show Boolean algebraic laws and Karnaugh map groupings.",
            "Provide state transition table and Mermaid stateDiagram-v2 for FSMs.",
            "Calculate setup/hold timing slack: Tclk >= t_cq + t_comb + t_setup."
        ]
    },

    "verilog_hdl": {
        "module_id": "MODULE 4: VERILOG AND HDL",
        "title": "Verilog & SystemVerilog Hardware Description",
        "assumptions": "Synthesizable IEEE 1364-2001 Verilog or IEEE 1800 SystemVerilog target. Non-blocking (<=) for clocked sequential; blocking (=) for combinational.",
        "required_parameters": [
            "Module pinout (clock, synchronous/asynchronous reset, data widths)",
            "Parameterized bit widths if applicable",
            "Target clock frequency and timing expectations"
        ],
        "missing_parameter_prompt": "Please specify the port list, bit widths, reset strategy (active-high or active-low, sync or async), and clock frequency.",
        "deterministic_tools": [],
        "checklist": [
            "Generate complete synthesizable RTL in a clean ```verilog block.",
            "Provide a separate self-checking testbench module with `$dumpfile`, `$dumpvars`, and assertion checks.",
            "State simulation instructions for Icarus Verilog: `iverilog -o sim tb.v dut.v && vvp sim` or Vivado.",
            "Do not fabricate simulation waveforms or claim execution without running a real simulator."
        ]
    },

    "vlsi_fundamentals": {
        "module_id": "MODULE 5: VLSI AND SEMICONDUCTORS",
        "title": "VLSI Design & Semiconductor Fundamentals",
        "assumptions": "CMOS technology node (e.g. 180nm, 45nm, 7nm FinFET), square-law model for long-channel or velocity saturation for short-channel; carrier mobility ratio μn ≈ 2.5 μp.",
        "required_parameters": [
            "Supply voltage VDD",
            "Load capacitance CL",
            "Transistor aspect ratios (W/L)n and (W/L)p"
        ],
        "missing_parameter_prompt": "Please specify the CMOS process node, supply voltage VDD, and capacitive load CL.",
        "deterministic_tools": ["cmos_delay"],
        "checklist": [
            "State whether idealized long-channel square-law model or short-channel velocity saturation is used.",
            "Calculate Wp/Wn aspect ratio for symmetric switching threshold VM = VDD/2.",
            "Compute propagation delay via Elmore RC model: tpd = 0.69 * Reff * CL.",
            "Break down dynamic power (alpha * CL * VDD^2 * f) and static subthreshold leakage."
        ]
    },

    "signals_systems": {
        "module_id": "MODULE 6: SIGNALS AND SYSTEMS",
        "title": "Signals and Systems & Digital Signal Processing",
        "assumptions": "Linear time-invariant (LTI) systems, bounded-input bounded-output (BIBO) stability, Nyquist sampling criterion fs >= 2 * fmax.",
        "required_parameters": [
            "Sampling frequency fs",
            "Continuous or discrete domain (time vs frequency)",
            "Filter cutoff, order, or passband/stopband ripple"
        ],
        "missing_parameter_prompt": "Please specify the sampling rate, filter specification (order, cutoff, window), or system transfer function.",
        "deterministic_tools": ["fir_filter_taps", "filter_cutoff"],
        "checklist": [
            "State continuous-time vs discrete-time domain explicitly.",
            "Specify Region of Convergence (ROC) for Laplace and Z-transforms.",
            "For FIR filters, detail impulse response symmetry (Type I-IV) and window properties.",
            "Show analytical transfer function H(s) or H(z) in LaTeX."
        ]
    },

    "matlab_computing": {
        "module_id": "MODULE 7: MATLAB AND NUMERICAL COMPUTING",
        "title": "MATLAB & GNU Octave Numerical Computing",
        "assumptions": "Standard MATLAB R2023b+ or GNU Octave 8+ environment. Vectorized operations prioritized over explicit loops.",
        "required_parameters": [
            "Sampling rates, time vectors, or matrix dimensions",
            "Required toolbox (Signal Processing, Communications, RF, Control System)"
        ],
        "missing_parameter_prompt": "Please specify the signals, sampling frequency, or computational algorithm to vectorize.",
        "deterministic_tools": [],
        "checklist": [
            "Provide clean, syntactically valid MATLAB code in ```matlab blocks.",
            "Identify any required Toolboxes explicitly (e.g. Signal Processing Toolbox).",
            "Offer GNU Octave compatibility alternatives where relevant.",
            "Do not label Python code as MATLAB or claim real execution without tool confirmation."
        ]
    },

    "antennas_rf": {
        "module_id": "MODULE 8: ANTENNAS AND RF",
        "title": "Antennas, RF & Microwave Engineering",
        "assumptions": "Far-field Fraunhofer region (R >= 2D^2 / λ), free-space propagation (intrinsic impedance η0 ≈ 377 Ω), matched impedance Z0 = 50 Ω unless stated.",
        "required_parameters": [
            "Operating frequency f or wavelength λ",
            "Antenna geometry, beamwidths (HPBW), or measured S11 / VSWR",
            "Radiation efficiency η"
        ],
        "missing_parameter_prompt": "Please specify the operating frequency, half-power beamwidths, or characteristic impedance.",
        "deterministic_tools": ["antenna_directivity", "vswr_return_loss", "friis_link_budget"],
        "checklist": [
            "State free-space and far-field Fraunhofer boundary assumptions.",
            "Distinguish Antenna Directivity D from Antenna Gain G = η * D.",
            "Calculate wavelength λ = c / f and free space path loss in dB.",
            "Convert linear power (Watts) and decibels (dBm, dBi) with proper units."
        ]
    },

    "communication_systems": {
        "module_id": "MODULE 9: COMMUNICATION SYSTEMS",
        "title": "Analog and Digital Communication Systems",
        "assumptions": "Additive White Gaussian Noise (AWGN) channel, room temperature T = 290K (thermal noise density N0 = -174 dBm/Hz), ideal synchronization.",
        "required_parameters": [
            "Modulation scheme (BPSK, QPSK, 16-QAM, FM, AM)",
            "Channel bandwidth B and SNR (dB or linear)",
            "Target bit error rate (BER) or bit rate Rb"
        ],
        "missing_parameter_prompt": "Please specify the modulation scheme, transmission bandwidth, and channel SNR.",
        "deterministic_tools": ["shannon_capacity", "pcm_snr", "friis_link_budget"],
        "checklist": [
            "Calculate theoretical Shannon channel capacity: C = B * log2(1 + SNR).",
            "Distinguish symbol rate (baud) Rs from bit rate Rb = Rs * log2(M).",
            "For PCM, compute SQNR ≈ 6.02 N + 1.76 dB.",
            "Clearly distinguish theoretical bound from realistic measured implementation losses."
        ]
    },

    "electromagnetic_theory": {
        "module_id": "MODULE 10: ELECTROMAGNETIC THEORY",
        "title": "Electromagnetic Theory & Wave Propagation",
        "assumptions": "Linear, isotropic, and homogeneous media (ε, μ, σ); source-free propagation for wave equation.",
        "required_parameters": [
            "Medium properties (εr, μr, conductivity σ)",
            "Field orientations and boundary geometry (dielectric/conductor interface)"
        ],
        "missing_parameter_prompt": "Please specify the medium parameters (permittivity, permeability, conductivity) and interface boundary.",
        "deterministic_tools": [],
        "checklist": [
            "Show both differential (Maxwell) and integral forms in LaTeX.",
            "Formulate Poynting vector S = E x H for instantaneous and time-averaged power flux.",
            "Apply electromagnetic boundary conditions: Et1 = Et2, Bn1 = Bn2, D1n - D2n = ρs.",
            "For waveguides, compute cutoff frequencies fc for TE/TM modes."
        ]
    },

    "embedded_systems": {
        "module_id": "MODULE 11: EMBEDDED SYSTEMS AND IOT",
        "title": "Embedded Systems, Microcontrollers & IoT",
        "assumptions": "Target MCU (e.g. ESP32, STM32 Cortex-M4, Arduino ATmega328P), standard logic voltage (3.3V or 5V logic level compatibility).",
        "required_parameters": [
            "Target MCU architecture or development board",
            "Peripheral interface (GPIO, UART, SPI, I2C, ADC, PWM)",
            "Operating voltage and sensor power constraints"
        ],
        "missing_parameter_prompt": "Please specify the target microcontroller (ESP32, STM32, Arduino) and sensor communication bus.",
        "deterministic_tools": [],
        "checklist": [
            "Provide explicit pin mappings and verify 3.3V vs 5V voltage logic level compatibility.",
            "Write robust, commented embedded C/C++ code with hardware register or HAL calls.",
            "Include interrupt service routine (ISR) best practices (keep ISR short, volatile flags).",
            "List power management details (sleep modes, decoupling capacitors)."
        ]
    },

    "engineering_mathematics": {
        "module_id": "MODULE 12: ENGINEERING MATHEMATICS",
        "title": "Engineering Mathematics & Numerical Methods",
        "assumptions": "Standard complex plane (j = √(-1)), matrix operations, real or complex analytic functions.",
        "required_parameters": [
            "Input matrix, complex coordinates, or differential equation order",
            "Initial conditions for ODE/Laplace solution"
        ],
        "missing_parameter_prompt": "Please specify the differential equation, initial conditions, or matrix coefficients.",
        "deterministic_tools": ["complex_arithmetic", "db_conversion"],
        "checklist": [
            "Provide step-by-step algebraic integration, differentiation, or matrix transformation.",
            "Use deterministic numerical calculations for complex conversions and arithmetic.",
            "Format all matrix operations and eigenvalue formulations in LaTeX."
        ]
    }
}


def get_workflow_instructions(domain_key: str) -> str:
    """Returns specialized prompt instructions for a given domain."""
    wf = DOMAIN_WORKFLOWS.get(domain_key)
    if not wf:
        return ""

    text = f"\n### Specialized Workflow: {wf['module_id']}\n"
    text += f"- **Operating Assumptions**: {wf['assumptions']}\n"
    text += f"- **Required Parameters**: {', '.join(wf['required_parameters'])}\n"
    text += "- **Workflow Checklist**:\n"
    for item in wf['checklist']:
        text += f"  * {item}\n"
    return text
