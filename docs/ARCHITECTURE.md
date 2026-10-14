# CircuitX Architecture & Engineering Systems

## 1. System Overview

CircuitX is a specialized, full-stack AI-powered assistant engineered specifically for electronics and hardware engineers. It bridges conversational reasoning with verified numerical solvers in NumPy/SciPy, a deterministic Modified Nodal Analysis (MNA) circuit solver, interactive SVG/Mermaid visualizations, and local hardware simulation toolchains.

```
+---------------------------------------------------------------------------------------+
|                                    Client (Browser)                                    |
|  - React 19 + TypeScript + Vite + Tailwind CSS                                        |
|  - KaTeX: Native LaTeX Equation Rendering ($...$, $$...$$)                           |
|  - SVG Schematic Engine: Deterministic Node & Component Netlist Rendering             |
|  - Mermaid: Dynamic State Machines, Flowcharts, Sequence Diagrams                    |
|  - Interactive Tools: MNA Circuit Solver, Digital Timing, Bode Plots, Simulator UI   |
+---------------------------------------------------------------------------------------+
                                           |
                                  HTTP / SSE REST API
                                           |
+---------------------------------------------------------------------------------------+
|                                   CircuitX FastAPI                                    |
|  - /api/health (System Diagnostics & Simulator Status)                                |
|  - /api/chat & /api/chat/stream (SSE Streaming Context Management)                    |
|  - /api/circuit/solve & /api/circuit/parse (MNA Circuit Engine)                        |
|  - /api/calc/* (Deterministic NumPy & SciPy Solvers)                                  |
|  - /api/sim/verilog & /api/sim/verilog/lint (Hardware Simulator Manager)               |
|  - /api/upload (Secure File & Netlist Uploads)                                        |
|  - /api/export/{id} (Multi-Format Technical Reports)                                  |
|  - /api/conversations (SQLite Storage with Cascading Foreign Keys)                    |
+---------------------------------------------------------------------------------------+
        |                     |                     |                     |
+---------------+     +---------------+     +---------------+     +---------------+
| Task Router   |     | MNA Solver    |     | Calc Engine   |     | Simulator Mgr |
| 14 Taxonomies |     | - SPICE Netlist|     | - NumPy/SciPy |     | - Icarus HDL  |
| Code vs Math  |     | - Matrix MNA  |     | - Resistors   |     | - ngspice     |
| Multi-domain  |     | - Tellegen/KCL|     | - Z, Friis    |     | - Octave      |
| routing       |     | - SVG Engine  |     | - Shannon/FIR |     | - Fallback Lnt|
+---------------+     +---------------+     +---------------+     +---------------+
        |                                                                 |
+---------------+                                                 +---------------+
| OpenAI SDK    |                                                 | SQLite DB     |
| Official v1.x |                                                 | Thread-safe   |
| Streaming SSE |                                                 | Conversations |
| Context Trim  |                                                 | Messages      |
+---------------+                                                 +---------------+
```

---

## 2. Core Subsystems

### 2.1 Modified Nodal Analysis (MNA) DC Circuit Solver (`circuit_solver.py`)

The MNA solver models linear electrical networks into the standard matrix form:

$$A \mathbf{x} = \mathbf{z}$$

Where:
- $A = \begin{bmatrix} G & B \\ C & D \end{bmatrix}$ is the MNA conductance and incidence matrix.
- $G$ is the nodal conductance matrix formed by resistors and conductances.
- $B$ accounts for independent voltage source incident currents on nodes.
- $C = B^T$ reflects KVL loop equations for independent voltage sources.
- $D$ is zero for independent voltage sources.
- $\mathbf{x} = \begin{bmatrix} \mathbf{v} \\ \mathbf{i}_v \end{bmatrix}$ is the unknown state vector containing node voltages $v_1, \dots, v_n$ and branch currents through voltage sources.
- $\mathbf{z} = \begin{bmatrix} \mathbf{i}_s \\ \mathbf{v}_s \end{bmatrix}$ contains known independent current injections and branch voltages.

#### Pre-Flight Diagnostics
1. **Ground Reference Detection**: Checks if Node `0` is declared. Rejects circuits without a reference node.
2. **Floating Subcircuit Detection**: Performs breadth-first graph traversal from Node `0` to ensure all nodes have a conductive reference path to ground.
3. **Condition Number Verification**: Evaluates the 2-norm condition number $\kappa(A) = \|A\|_2 \|A^{-1}\|_2$. If $\kappa(A) > 10^{14}$, the matrix is flagged as singular or underdetermined.
4. **Conservation of Power (Tellegen's Theorem)**: Computes the sum of power supplied and absorbed across all components:
   $$\Delta P = \left| \sum P_k \right| < 10^{-4} \ \text{W}$$
5. **KCL Residuals**: Evaluates the net current entering each node $j$:
   $$R_j = \sum_{k} I_{k, j} \approx 0$$

#### Inductor and Capacitor DC Models
- **Inductors in DC Steady-State**: Modeled as short circuits with a small numerical parasitic resistance ($1\,\mu\Omega$).
- **Capacitors in DC Steady-State**: Modeled as open circuits with an insulation resistance ($10^{12}\,\Omega$).

---

### 2.2 Deterministic Calculation Engine (`calculation_engine.py`)

Designed to eliminate arithmetic hallucinations:
- **Resistor Combinations**: Series ($R_{eq} = \sum R_i$) and parallel ($R_{eq} = \left(\sum R_i^{-1}\right)^{-1}$) with support for SI prefixes (`k`, `M`, `m`, `u`).
- **Ohm's Law Precision Verification**: Validates floating-point tolerances ($10\,\text{V}$ across $2\,\text{k}\Omega \to 5\,\text{mA}$; $12\,\text{V}$ across $6\,\Omega \to 2\,\text{A}, 24\,\text{W}$).
- **Complex Impedance**: Series and parallel RLC networks with exact imaginary operators ($j\omega L$, $1/(j\omega C)$).
- **Shannon-Hartley Capacity**: Computes theoretical channel capacity:
  $$C = B \log_2\left(1 + \frac{S}{N}\right)$$
- **Thermal Noise Floor**: Computes Johnson-Nyquist noise power:
  $$P_n = k_B T B$$
- **SciPy FIR Filter Synthesis**: Uses `scipy.signal` to generate frequency response magnitudes and coefficients for Hamming, Hann, Blackman, and Rectangular windows.

---

### 2.3 Modular Hardware Simulator Manager (`simulators.py`)

Provides real execution environments with deterministic safety guarantees:
- **Discovery**: Probes OS PATH and default installation directories (`C:\iverilog`, `C:\Program Files\ngspice`, `/usr/bin/iverilog`, `/usr/bin/octave`) with cached lookups.
- **Sandboxed Execution**: Executes simulation commands inside isolated temporary folders (`tempfile.mkdtemp`), enforcing a hard timeout of $5.0\,\text{s}$ to prevent infinite loops.
- **Waveform Parsing**: Parses `.vcd` (Value Change Dump) output files generated by Verilog `$dumpvars`.
- **Deterministic Structural Linter Fallback**: If Icarus Verilog is not installed on the host machine, CircuitX invokes its built-in structural Verilog AST linter:
  - Validates `module` and `endmodule` pairs.
  - Detects undeclared signals and unassigned outputs.
  - Warns about missing `\`timescale\` directives for testbenches.
  - Checks balanced `begin` / `end` blocks.

---

### 2.4 Interactive Engineering Visualizations

Diagrams adhere to strict engineering distinctions:
1. **`[Calculated Visualization]`**: Graphically computed directly from deterministic formulas (Bode plot magnitude curve, polar antenna radiation pattern, digital setup/hold timing margins).
2. **`[Illustrative Diagram]`**: Structural conceptual illustrations (Mermaid FSM state machines, logic gate diagrams).
3. **`[Simulation-Generated Result]`**: Outputs generated by a real compiled simulator (e.g. Icarus Verilog vvp run or SPICE transient run).

---

### 2.5 Security & Data Isolation

- **OpenAI API Key Isolation**: Secrets reside purely in the backend process environment or memory headers. They are never transmitted to the client or written to disk.
- **Uploaded File Validation**: Files are restricted to 10MB, MIME-checked, and stored in `backend/uploads/` without executable permissions.
- **SQL Parameterization**: All SQLite queries use parameterized bindings to prevent SQL injection.
