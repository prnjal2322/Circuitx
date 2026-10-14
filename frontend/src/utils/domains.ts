import { DomainInfo, EngineeringDomain } from '../types';

export const DOMAINS: DomainInfo[] = [
  {
    id: 'general',
    name: 'AI Engineering Assistant',
    tagline: 'Universal Electronics Engineering AI',
    icon: 'Cpu',
    suggestedTasks: [
      "Solve a circuit using Kirchhoff's laws.",
      "Calculate voltage, current, resistance, and power.",
      "Simplify a Boolean expression.",
      "Generate a Verilog FSM.",
      "Explain a CMOS inverter.",
      "Calculate antenna directivity.",
      "Design an FIR filter.",
      "Debug Verilog code.",
      "Explain Maxwell's equations.",
      "Calculate a communication link budget.",
    ]
  },
  {
    id: 'circuit_analysis',
    name: 'Circuit Analysis',
    tagline: 'KVL, KCL, Thevenin/Norton, Nodal & Mesh Analysis',
    icon: 'Zap',
    suggestedTasks: [
      "Solve a bridge circuit using Nodal Analysis.",
      "Find the Thevenin equivalent circuit across a load resistor.",
      "Derive the second-order transient step response for an RLC circuit.",
      "Calculate active, reactive, and apparent power in AC circuits.",
    ]
  },
  {
    id: 'digital_electronics',
    name: 'Digital Electronics',
    tagline: 'Boolean Algebra, K-Maps, Logic Gates, Counters & FSMs',
    icon: 'Binary',
    suggestedTasks: [
      "Simplify a Boolean expression using Karnaugh maps.",
      "Design a 4-bit synchronous binary up/down counter.",
      "Convert a Mealy state machine to a Moore state machine.",
      "Design a priority encoder using logic gates.",
    ]
  },
  {
    id: 'verilog_hdl',
    name: 'Verilog & HDL',
    tagline: 'Synthesizable RTL, SystemVerilog, Testbenches & Simulation',
    icon: 'Code2',
    suggestedTasks: [
      "Generate a Verilog FSM with self-checking testbench.",
      "Write a parameterized synchronous FIFO in Verilog.",
      "Design an SPI Master controller in synthesizable RTL.",
      "Debug Verilog code for race conditions and latch inferencing.",
    ]
  },
  {
    id: 'vlsi_fundamentals',
    name: 'VLSI Fundamentals',
    tagline: 'CMOS Inverters, Stick Diagrams, Elmore Delay, Timing Slack',
    icon: 'Layers',
    suggestedTasks: [
      "Explain a CMOS inverter and calculate optimal Wp/Wn ratio.",
      "Calculate Elmore delay for an RC interconnect tree.",
      "Explain setup and hold time violations and fix hold slack.",
      "Design a dynamic CMOS domino logic gate.",
    ]
  },
  {
    id: 'signals_systems',
    name: 'Signals & Systems',
    tagline: 'Fourier Transforms, Laplace, Z-Transform, DSP & Filter Design',
    icon: 'Activity',
    suggestedTasks: [
      "Design an FIR low-pass filter using the windowing method.",
      "Compute the bilateral Laplace transform and specify Region of Convergence (ROC).",
      "Calculate linear and circular convolution using FFT.",
      "Analyze stability of an IIR system from its pole-zero plot.",
    ]
  },
  {
    id: 'antennas_rf',
    name: 'Antennas & RF',
    tagline: 'Directivity, Radiation Patterns, Friis Formula, Smith Charts',
    icon: 'Radio',
    suggestedTasks: [
      "Calculate antenna directivity from half-power beamwidths.",
      "Design a quarter-wave microstrip impedance matching transformer.",
      "Compute return loss and VSWR from S11 parameters.",
      "Calculate free-space path loss (FSPL) at 2.4 GHz and 5.8 GHz.",
    ]
  },
  {
    id: 'communication_systems',
    name: 'Communication Systems',
    tagline: 'Modulation, Shannon Capacity, BER, SNR, RF Link Budget',
    icon: 'Wifi',
    suggestedTasks: [
      "Calculate a communication link budget with fade margin.",
      "Determine Shannon-Hartley theoretical channel capacity.",
      "Compare BER vs Eb/N0 performance for BPSK and 16-QAM.",
      "Design an eye diagram measurement test for digital receivers.",
    ]
  },
  {
    id: 'embedded_systems',
    name: 'Embedded Systems & IoT',
    tagline: 'ARM Cortex, ESP32, STM32, FreeRTOS, I2C/SPI/UART Drivers',
    icon: 'HardDrive',
    suggestedTasks: [
      "Write an interrupt-driven UART driver with circular ring buffer in C.",
      "Configure an STM32 timer for center-aligned PWM motor control.",
      "Design a FreeRTOS multitasking architecture with queues and mutexes.",
      "Implement low-power deep sleep wake-up on ESP32.",
    ]
  },
  {
    id: 'matlab_computing',
    name: 'MATLAB & Numerical Computing',
    tagline: 'Vectorized DSP, Bode/Nyquist Plots, State-Space Models',
    icon: 'Terminal',
    suggestedTasks: [
      "Generate a MATLAB script to plot open-loop Bode and Nyquist plots.",
      "Solve a state-space circuit differential equation with ode45.",
      "Perform spectral FFT analysis on a noisy multi-tone signal.",
      "Compute eigenvalues and pole placement for state feedback control.",
    ]
  },
  {
    id: 'electromagnetic_theory',
    name: 'Electromagnetic Theory',
    tagline: 'Maxwell\'s Equations, Poynting Vector, Plane Waves, Boundary Conditions',
    icon: 'Compass',
    suggestedTasks: [
      "Explain Maxwell's equations in differential and integral forms.",
      "Calculate the Poynting vector and time-averaged power flow density.",
      "Derive boundary conditions for electric and magnetic fields across interfaces.",
      "Calculate the cutoff frequency for TE10 mode in a rectangular waveguide.",
    ]
  },
  {
    id: 'simulation_debugging',
    name: 'Simulation & Debugging',
    tagline: 'SPICE Netlists, Waveform Analysis, Signal Integrity, Hardware Debug',
    icon: 'Bug',
    suggestedTasks: [
      "Generate an LTspice / ngspice netlist for an active bandpass filter.",
      "Debug high-speed transmission line reflections and ringing.",
      "Identify ground bounce and decoupling capacitor placement issues.",
      "Analyze metastability in asynchronous clock domain crossings (CDC).",
    ]
  }
];

export const SUGGESTED_TASK_CARDS = [
  {
    title: "Solve Kirchhoff's Laws",
    prompt: "Solve a circuit using Kirchhoff's laws (KVL and KCL). Provide the circuit diagram, nodal equations, step-by-step substitution, branch currents, and power dissipation.",
    domain: 'circuit_analysis' as EngineeringDomain,
    icon: 'Zap'
  },
  {
    title: "V, I, R & Power Calculator",
    prompt: "Calculate voltage, current, resistance, and power for a 12V DC circuit with a 4-ohm load. Show the formulas and step-by-step derivation.",
    domain: 'circuit_analysis' as EngineeringDomain,
    icon: 'Gauge'
  },
  {
    title: "Simplify Boolean Expression",
    prompt: "Simplify the Boolean expression F(A, B, C) = AB + A'C + BC using Boolean algebraic theorems, truth table, and draw the minimized logic gate diagram.",
    domain: 'digital_electronics' as EngineeringDomain,
    icon: 'Binary'
  },
  {
    title: "Generate Verilog FSM",
    prompt: "Generate a synthesizable Verilog FSM for a 101 sequence detector with overlapping capability. Include state diagram and self-checking testbench.",
    domain: 'verilog_hdl' as EngineeringDomain,
    icon: 'Code2'
  },
  {
    title: "Explain CMOS Inverter",
    prompt: "Explain a CMOS inverter, including transistor sizing for symmetric noise margins, Elmore delay model, and dynamic power dissipation.",
    domain: 'vlsi_fundamentals' as EngineeringDomain,
    icon: 'Layers'
  },
  {
    title: "Calculate Antenna Directivity",
    prompt: "Calculate antenna directivity and gain using Kraus' approximation with half-power beamwidths of 30° and 40° and 90% radiation efficiency.",
    domain: 'antennas_rf' as EngineeringDomain,
    icon: 'Radio'
  },
  {
    title: "Design an FIR Filter",
    prompt: "Design a 64-tap FIR low-pass filter with 4 kHz cutoff frequency at 48 kHz sampling rate using a Hamming window. Include MATLAB code and frequency response analysis.",
    domain: 'signals_systems' as EngineeringDomain,
    icon: 'Activity'
  },
  {
    title: "Debug Verilog Code",
    prompt: "How do I debug Verilog code for unintentional latch inferencing, non-blocking race conditions, and clock domain crossing violations?",
    domain: 'simulation_debugging' as EngineeringDomain,
    icon: 'Bug'
  },
  {
    title: "Explain Maxwell's Equations",
    prompt: "Explain Maxwell's equations in differential and integral forms, their physical significance in electrodynamics, and how they predict electromagnetic wave propagation.",
    domain: 'electromagnetic_theory' as EngineeringDomain,
    icon: 'Compass'
  },
  {
    title: "Link Budget Calculation",
    prompt: "Calculate a complete communication link budget for a 2.4 GHz wireless link at 1 km with Tx power 20 dBm, antenna gains 6 dBi and 3 dBi, and receiver sensitivity -95 dBm.",
    domain: 'communication_systems' as EngineeringDomain,
    icon: 'Wifi'
  }
];
