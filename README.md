# CircuitX — Universal Electronics Engineering AI Assistant

> **Tagline:** *Your AI-Powered Electronics Engineering Assistant.*

CircuitX is a complete, production-grade AI-powered assistant engineered specifically for electronics, electrical, and hardware engineers. It provides deep domain-specialized assistance across circuit analysis, digital electronics, synthesizable Verilog HDL, VLSI fundamentals, signals & systems, RF & antennas, communication systems, embedded systems, and numerical computing.

Unlike generic conversational chatbots, CircuitX integrates a **deterministic Modified Nodal Analysis (MNA) circuit solver**, a **verified NumPy & SciPy calculation engine**, **interactive SVG and Mermaid visualizations**, **sandboxed hardware simulator integrations** (Icarus Verilog, ngspice, Octave) with structural linter fallbacks, **KaTeX LaTeX math rendering**, **secure file uploads**, and **multi-format technical engineering report exports**.

---

> [!CAUTION]
> ### ⚠️ Engineering Safety & Verification Notice
> - **Hazardous Tasks:** High voltages ($>50\,\text{V}$ AC or $>120\,\text{V}$ DC), mains electricity ($110\,\text{V}/220\,\text{V}/240\,\text{V}$), high currents ($>5\,\text{A}$), lithium batteries (LiPo/Li-ion), and high-power RF transmitters present electric shock, arc flash, thermal burn, and fire hazards. Always employ certified galvanic isolation, differential probes, appropriate wire gauges (AWG), and personal protective equipment (PPE).
> - **Independent Verification Mandate:** AI-generated designs, schematics, netlists, and calculations are assistive tools and require independent peer review and verification before physical fabrication. Safety-critical and regulated designs require qualified professional engineering review.

---

## 🌟 Key Capabilities

### 1. Deterministic Calculation Engine (`backend/calculation_engine.py`)
- **Unit Conversions & Engineering Prefixes**: Supports SI prefixes ($f, p, n, \mu, m, k, M, G, T$), decibels ($\text{dBm} \leftrightarrow \text{W}$), and angular units ($\text{deg} \leftrightarrow \text{rad}$).
- **Resistor Networks**: Computes series and parallel equivalents with zero floating-point drift (e.g., two $1\,\text{k}\Omega$ resistors in parallel yield $500\,\Omega$; $1\,\text{k}\Omega$ in series with $2\,\text{k}\Omega$ yields $3\,\text{k}\Omega$).
- **Exact Ohm's Law & DC Power**: Validated calculations ($10\,\text{V}$ across $2\,\text{k}\Omega \to 5\,\text{mA}$; $12\,\text{V}$ across $6\,\Omega \to 2\,\text{A}, 24\,\text{W}$).
- **Complex Impedance & Phasors**: Series/parallel RLC impedance $Z = R + jX$, magnitude $|Z|$, phase $\theta$, and power factor $\cos\theta$.
- **Electromagnetic Wave Propagation**: Frequency $f$, wavelength $\lambda = v_p/f$, phase velocity in dielectric, and intrinsic wave impedance $\eta = \eta_0/\sqrt{\epsilon_r}$.
- **Antenna Properties**: Kraus HPBW directivity approximation ($D \approx 41253/(\theta_1 \theta_2)$), effective aperture $A_e$, and radiation efficiency.
- **Communications**: Shannon-Hartley channel capacity $C = B \log_2(1 + \text{SNR})$ and thermal noise floor $P_n = kTB$.
- **FIR Filter Spectrum Synthesis**: Generates frequency response using SciPy filter design windows (Hamming, Hann, Blackman, Rectangular).

### 2. MNA DC Circuit Solver & Netlist Schematics (`backend/circuit_solver.py`)
- **Modified Nodal Analysis (MNA)**: Solves arbitrary linear DC circuits containing resistors, independent voltage sources, independent current sources, and DC steady-state equivalents of inductors (short) and capacitors (open).
- **SPICE Netlist Parser**: Directly parses standard SPICE syntax (`R...`, `V...`, `I...`, `C...`, `L...`, `.end`).
- **Pre-flight Matrix Diagnostics**: Detects missing reference ground (`Node 0`), isolates floating subcircuits, and verifies matrix condition number $\kappa(A)$ to flag ill-conditioned or singular systems.
- **Physical Consistency Verifications**:
  - **Tellegen's Theorem**: Confirms total conservation of electrical power ($\sum P_{\text{supplied}} = \sum P_{\text{absorbed}}$).
  - **KCL Residuals**: Verifies sum of currents entering each node equals zero within numerical tolerance.
- **Deterministic SVG Schematic Generator**: Renders crisp, mathematically positioned circuit schematics with standard symbols, connection wires, node badges, and voltage labels.

### 3. Interactive Engineering Visualizations (`frontend/src/components/VisualizationsModal.tsx`)
- **Interactive Logic Gates**: Switch between AND, OR, NAND, NOR, XOR, XNOR, NOT with clickable inputs and real-time truth table highlighting.
- **Digital Timing Diagram**: Configurable clock frequency, clock-to-Q delay ($t_{C-Q}$), setup time ($t_{\text{setup}}$), and hold time ($t_{\text{hold}}$) with interactive setup/hold margin violation detection.
- **Bode Frequency Response**: Lowpass and highpass magnitude curves with clear $-3\,\text{dB}$ cutoff point indicators.
- **Antenna Radiation Pattern**: Polar radiation pattern visualization displaying main lobe beamwidth according to HPBW.
- **FSM State Graphs**: Interactive Mermaid state diagrams illustrating Mealy and Moore machine transitions.
- **Clear Engineering Labeling**: All diagrams are strictly categorized as `[Calculated Visualization]`, `[Illustrative Diagram]`, or `[Simulation-Generated Result]`.

### 4. Modular Hardware Simulator Integrations (`backend/simulators.py`)
- **Local Tool Discovery**: Automatically detects installed hardware simulation tools:
  - **Icarus Verilog** (`iverilog`, `vvp`)
  - **ngspice** (`ngspice`)
  - **GNU Octave** (`octave-cli` / `octave`)
- **Zero-Tool Deterministic Fallback**: When external binaries are not installed, CircuitX falls back to a deterministic **Verilog Structural Linter** checking port declarations, module boundaries, unclosed blocks, and missing timescale directives.
- **Sandboxed Execution**: Isolated temporary scratch directories with strict timeouts ($5.0\,\text{s}$) and automatic cleanup.

### 5. Multi-Format Engineering Report Exports (`frontend/src/components/ExportModal.tsx`)
- **Markdown (`.md`)**: Full session transcript with LaTeX equations and code blocks.
- **HTML (`.html`)**: Self-contained styled report ready for sharing.
- **CSV (`.csv`)**: Tabular export of messages, roles, and timestamps.
- **Print / PDF**: Formatted print view with clean typography.
- **Raw JSON (`.json`)**: Complete session data model.

### 6. Secure File & Netlist Uploads (`frontend/src/components/MessageInput.tsx`)
- **File Validation**: Validates file types (`.cir`, `.sp`, `.net`, `.v`, `.sv`, `.vhd`, `.m`, `.py`, `.c`, `.cpp`, `.h`, `.txt`, `.json`, `image/*`).
- **Size Limit Enforcement**: 10MB maximum file size with secure backend persistence in `backend/uploads/`.
- **Engineering Chips**: Displays file category badges (`SPICE`, `HDL`, `MATLAB`, `CODE`, `IMAGE`) with file sizes in the chat input.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons |
| **Mathematics & Diagrams** | KaTeX (LaTeX math), Mermaid (diagrams), Custom SVG schematic engine |
| **Backend** | Python 3.12, FastAPI, Uvicorn, Official OpenAI Python SDK, Pydantic |
| **Calculation & MNA Solver**| NumPy, SciPy (Linear Algebra, Matrix Inversion, Filter Windows) |
| **Simulators** | Icarus Verilog (`iverilog`), ngspice, GNU Octave, Verilog structural linter |
| **Storage & Persistence** | SQLite (with foreign keys, indexing, and cascading deletes) |
| **Testing** | pytest (60/60 passing), Vitest (23/23 passing), React Testing Library |

---

## 📁 Project Structure

```
CircuitX/
├── backend/                  # FastAPI backend server
│   ├── ai_service.py         # OpenAI SDK, system prompts, hazard detection, secret redaction
│   ├── calculation_engine.py # Deterministic engineering calculation engine (NumPy/SciPy)
│   ├── circuit_solver.py     # MNA DC circuit solver, SPICE parser, and SVG generator
│   ├── simulators.py         # Simulator manager (Icarus, ngspice, Octave) & linter
│   ├── calculators.py        # Domain-specific numerical solvers
│   ├── task_router.py        # 14-domain engineering task classifier
│   ├── database.py           # SQLite storage & migrations
│   ├── main.py               # FastAPI application & security/rate-limiting middleware
│   ├── uploads/              # Secure isolated file uploads storage
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 19 + TypeScript + Vite frontend
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── CircuitSolverModal.tsx   # SPICE netlist solver & SVG schematic viewer
│   │   │   ├── VisualizationsModal.tsx  # Logic, timing, Bode, antenna visualizations
│   │   │   ├── SimulationModal.tsx      # Verilog HDL simulator & linter runner
│   │   │   ├── CalculatorsModal.tsx     # Deterministic numerical calculators
│   │   │   ├── ExportModal.tsx          # Multi-format report exporter
│   │   │   ├── Header.tsx               # Top navigation bar
│   │   │   ├── Sidebar.tsx              # Sidebar disciplines & saved chats
│   │   │   ├── MessageInput.tsx         # Chat input with file upload chips
│   │   │   ├── MessageItem.tsx          # Message card with KaTeX and Mermaid
│   │   │   ├── MathRenderer.tsx         # KaTeX equation renderer
│   │   │   ├── MermaidViewer.tsx        # Mermaid diagram renderer
│   │   │   ├── MarkdownViewer.tsx       # Markdown rendering
│   │   │   ├── SettingsModal.tsx        # Configuration & model selector
│   │   │   └── WelcomeScreen.tsx        # Domain cards & prompts
│   │   ├── services/api.ts   # Typed API client
│   │   ├── types/index.ts    # TypeScript definitions
│   │   ├── utils/domains.ts  # Engineering disciplines presets
│   │   ├── App.tsx           # Main workspace application
│   │   └── main.tsx          # Application entry point
│   ├── package.json          # Frontend dependencies
│   ├── tailwind.config.js    # Circuit-themed Tailwind config
│   └── vite.config.ts        # Vite configuration
├── tests/                    # Test suites (83 automated tests)
│   ├── test_backend.py                 # API, router, and domain workflows tests (23 tests)
│   ├── test_circuit_solver.py          # MNA solver, SPICE parser, Tellegen/KCL tests (9 tests)
│   ├── test_calculation_engine.py      # Resistor networks, Shannon, FIR, units (12 tests)
│   └── test_security_and_resilience.py # Security headers, rate limits, upload, mocked AI (16 tests)
├── docs/                     # Architectural and API documentation
│   ├── ARCHITECTURE.md       # Detailed system design & MNA formulations
│   ├── API_REFERENCE.md      # REST & SSE endpoint specifications
│   ├── DEPLOYMENT.md         # Production deployment plan & Dockerfile
│   └── ENGINEERING_CALCULATORS.md # Mathematical derivation references
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules for Python, Node, secrets, SQLite
└── README.md                 # Project documentation & installation guide
```

---

## 💻 Beginner-Friendly Windows Installation Guide

Follow these exact step-by-step instructions to run CircuitX on Windows.

### Prerequisites Verification

Open **PowerShell** or **Command Prompt** and verify your tools:

1. **Verify Python (version 3.11 or newer):**
   ```powershell
   python --version
   # Expected: Python 3.11.x or Python 3.12.x
   ```
   *If not installed, download from [python.org](https://www.python.org/downloads/) (check "Add Python to PATH").*

2. **Verify Node.js and npm (version 18 or newer):**
   ```powershell
   node -v
   npm -v
   # Expected: v18.x.x or higher
   ```
   *If not installed, download the LTS release from [nodejs.org](https://nodejs.org/).*

3. **Verify Git (Optional but recommended):**
   ```powershell
   git --version
   ```

4. **Verify Optional Hardware Simulation Tools (Optional):**
   ```powershell
   # Check if Icarus Verilog is installed:
   iverilog -V
   # Check if ngspice is installed:
   ngspice -v
   ```
   *To install on Windows using Chocolatey or Winget:*
   ```powershell
   winget install IcarusVerilog.IcarusVerilog
   winget install ngspice.ngspice
   ```
   *(If not installed, CircuitX automatically falls back to its built-in structural Verilog linter).*

---

### Step-by-Step Setup Instructions

#### Step 1: Clone or Navigate to the Workspace
```powershell
cd D:\CicuitX
```

#### Step 2: Configure Environment Variables
Create your local `.env` file by copying `.env.example`:
```powershell
Copy-Item .env.example .env
```
*(On Command Prompt, use `copy .env.example .env`)*

#### Step 3: Add Your OpenAI API Key Privately
Open `.env` in your text editor (e.g. Notepad):
```powershell
notepad .env
```
Edit the file to include your key:
```env
OPENAI_API_KEY=sk-proj-yourActualKeyHere
OPENAI_MODEL=gpt-4o-mini
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8000
FRONTEND_ORIGIN=http://localhost:5173
CIRCUITX_DB_PATH=circuitx.db
MAX_REQUEST_SIZE_BYTES=10485760
RATE_LIMIT_PER_MINUTE=120
```
Save and close the file.
> **Note:** If you don't have an OpenAI API key yet, leave `OPENAI_API_KEY=` blank. The application will start immediately in **deterministic solver mode**, where all engineering calculators, the MNA circuit solver, and visualizations work without external calls.

#### Step 4: Set Up the Python Virtual Environment
In the root directory, create and activate a virtual environment, then install dependencies:
```powershell
# Create virtual environment in backend/venv
python -m venv backend\venv

# Activate the virtual environment
.\backend\venv\Scripts\activate

# Install backend dependencies
pip install -r backend\requirements.txt
```

#### Step 5: Install Frontend Dependencies
Open a second PowerShell terminal, navigate to the frontend directory, and install npm packages:
```powershell
cd D:\CicuitX\frontend
npm install
```

#### Step 6: Start the Backend Server (Terminal 1)
In your first terminal (with the virtual environment activated):
```powershell
cd D:\CicuitX\backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

#### Step 7: Start the Frontend Application (Terminal 2)
In your second terminal:
```powershell
cd D:\CicuitX\frontend
npm run dev
```
You should see:
```
  VITE v6.4.4  ready in 320 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

#### Step 8: Open CircuitX in Your Browser
Open your browser and navigate to:
```
http://localhost:5173
```
To check backend health and diagnostic status directly:
```
http://127.0.0.1:8000/api/health
```

---

### Linux / macOS Alternative Commands

```bash
# Setup backend
cd CircuitX
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Setup frontend (new terminal)
cd CircuitX/frontend
npm install
npm run dev
```

---

## 🧪 Automated Testing & Verification

### Run Backend Tests (pytest)
```powershell
.\backend\venv\Scripts\python.exe -m pytest tests/ -v
```
**Results:** **60 passed in 1.68s**
- `test_backend.py` (23 tests): Domain workflows, task classifications, SQLite CRUD, health checks.
- `test_circuit_solver.py` (9 tests): $10\,\text{V}$ across $2\,\text{k}\Omega \to 5\,\text{mA}$, $12\,\text{V}$ across $6\,\Omega \to 2\,\text{A}, 24\,\text{W}$, voltage dividers, Wheatstone bridges, DC RLC, missing ground, floating nodes, SVG generation.
- `test_calculation_engine.py` (12 tests): Resistor combinations ($1\,\text{k}\Omega \parallel 1\,\text{k}\Omega \to 500\,\Omega$, $1\,\text{k}\Omega + 2\,\text{k}\Omega \to 3\,\text{k}\Omega$), complex impedance, Kraus directivity, Shannon capacity, thermal noise floor, SciPy FIR filter synthesis, Verilog linter.
- `test_security_and_resilience.py` (16 tests): Security headers (`nosniff`, `DENY`), rate limiting, request size limits (10MB), secret redaction, hazard detection, mocked OpenAI failures, SPICE validation.

### Run Frontend Tests (Vitest)
```powershell
cd frontend
npm test -- --run
```
**Results:** **23 passed in 2.26s across 7 test files**
- `MathRenderer.test.tsx`: Inline and display LaTeX KaTeX parsing.
- `WelcomeScreen.test.tsx`: Domain card switching and prompt cards.
- `Sidebar.test.tsx`: Domain navigation, tool modals, conversation history.
- `MessageInput.test.tsx`: Text input, submission, stop streaming, domain selector.
- `MessageItem.test.tsx`: User/assistant roles, copy button, typography.
- `ModalsAndTools.test.tsx`: MNA Circuit Solver, Visualizations Hub, Simulators modal, Export modal.
- `Integration.test.tsx`: Full app integration, health loading, modal opening.

### Run Production Build
```powershell
cd frontend
npm run build
```
**Result:** TypeScript compilation passes with zero errors; production bundle created in `frontend/dist/`.

---

## ❓ Troubleshooting Common Errors

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Activate.ps1 cannot be loaded because running scripts is disabled` | Windows PowerShell execution policy restriction | Run: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`, then activate again. |
| `'python' or 'npm' is not recognized` | Python or Node is not in Windows system PATH | Close and reopen terminal after installing. Add Python (`C:\Python312`) and Node (`C:\Program Files\nodejs`) to Environment Variables. |
| `Address already in use: 8000` | Port 8000 is occupied by another process | Kill the process or start Uvicorn on another port: `uvicorn main:app --port 8001`, and update `.env` `BACKEND_PORT=8001`. |
| `OpenAI API Key Not Configured` | `.env` file is missing or has placeholder | Open `.env` and set `OPENAI_API_KEY=sk-proj-...`. Deterministic calculators and MNA solver remain functional without a key. |
| `CORS Error: Blocked by CORS policy` | Frontend origin does not match `FRONTEND_ORIGIN` | Ensure `.env` contains `FRONTEND_ORIGIN=http://localhost:5173`. |

---

## 💡 Example Electronics Prompts to Test

1. **Circuit Analysis**: *"Find the equivalent resistance of three 10k resistors in parallel and calculate current when connected to a 15V source."*
2. **Analog Electronics**: *"Design an inverting op-amp amplifier with a closed-loop gain of -10 using standard 5% resistor values."*
3. **Verilog & HDL**: *"Write synthesizable Verilog for a 4-bit synchronous up/down counter with asynchronous reset, along with a self-checking testbench."*
4. **VLSI Design**: *"Explain the CMOS inverter voltage transfer characteristic (VTC) and calculate the optimal Wp/Wn ratio for symmetric noise margins."*
5. **RF & Antennas**: *"Calculate the directivity and effective aperture of a horn antenna with HPBW angles of 25° and 35° operating at 10 GHz."*
6. **DSP & Signals**: *"Design a 31-tap FIR lowpass filter with a normalized cutoff of 0.25 using a Hamming window and explain its linear phase property."*

---

## 📄 License
MIT License. Built for Electronics Engineers, Hardware Architects, Students, and Researchers.
