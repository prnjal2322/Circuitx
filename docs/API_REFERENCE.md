# CircuitX API Reference

All CircuitX backend services are available under the `/api` route prefix. Interactive Swagger/OpenAPI documentation is available at `http://localhost:8000/docs`.

---

## 1. System Diagnostics

### `GET /api/health`
Retrieves overall backend status, active OpenAI configuration, and simulation engine readiness.

**Sample Response**:
```json
{
  "status": "healthy",
  "app": "CircuitX",
  "tagline": "Your AI-Powered Electronics Engineering Assistant",
  "version": "1.0.0",
  "openai_configured": true,
  "openai_model": "gpt-4o-mini",
  "deterministic_calculators_ready": true,
  "circuit_solver_ready": true,
  "simulators": {
    "iverilog": { "installed": false, "version": null },
    "ngspice": { "installed": false, "version": null },
    "octave": { "installed": false, "version": null }
  }
}
```

---

## 2. Modified Nodal Analysis (MNA) Circuit Solver

### `POST /api/circuit/solve`
Solves a DC circuit described via SPICE netlist syntax using Modified Nodal Analysis (MNA). Returns node voltages, branch currents, power dissipation, consistency metrics (Tellegen and KCL), and SVG schematic.

**Request Body**:
```json
{
  "netlist": "V1 1 0 10V\nR1 1 2 2k\nR2 2 0 2k\n.end"
}
```

**Response**:
```json
{
  "status": "solved",
  "nodes": ["0", "1", "2"],
  "node_voltages": {
    "0": 0.0,
    "1": 10.0,
    "2": 5.0
  },
  "branch_currents": {
    "R1": 0.0025,
    "R2": 0.0025,
    "V1": -0.0025
  },
  "branch_powers": {
    "R1": 0.0125,
    "R2": 0.0125,
    "V1": -0.025
  },
  "power_summary": {
    "total_supplied_w": 0.025,
    "total_absorbed_w": 0.025,
    "tellegen_residual_w": 0.0,
    "conserved": true
  },
  "kcl_residuals": {
    "1": 0.0,
    "2": 0.0
  },
  "matrix_condition_number": 42.15,
  "is_well_conditioned": true,
  "svg_schematic": "<svg ...></svg>"
}
```

### `POST /api/circuit/parse`
Parses and validates SPICE netlist without running matrix inversion.

---

## 3. Deterministic Calculation Engine

### `POST /api/calc/convert-units`
Converts engineering values with SI prefixes, dBm to Watts, or degrees to radians.
```json
{
  "value": 1000,
  "from_unit": "k",
  "to_unit": "M"
}
```

### `POST /api/calc/resistor-network`
Computes exact equivalent resistance for series or parallel resistor arrays.
```json
{
  "resistors": ["1k", "2k"],
  "topology": "series"
}
```
*Returns `3000.0` $\Omega$ with SI formatted string `3.000 kΩ`.*

### `POST /api/calc/ohms-law-exact`
Validates Ohm's law with precision tolerances.
```json
{
  "voltage_v": 10.0,
  "resistance_ohm": 2000.0
}
```
*Returns `current_a: 0.005`, `current_formatted: "5.000 mA"`, `power_w: 0.05`.*

### `POST /api/calc/complex-impedance`
Computes impedance, magnitude, phase angle, and power factor for series or parallel RLC combinations.
```json
{
  "resistance_ohm": 100.0,
  "inductance_h": 0.01,
  "capacitance_f": 0.000001,
  "frequency_hz": 1000.0,
  "topology": "series"
}
```

### `POST /api/calc/frequency-wavelength`
Computes wavelength $\lambda = v_p / f$ and wave impedance in a specified dielectric.
```json
{
  "frequency_hz": 2400000000,
  "relative_permittivity": 4.4
}
```

### `POST /api/calc/antenna-properties`
Computes Kraus directivity, effective aperture, and gain.
```json
{
  "antenna_type": "Horn",
  "hpbw_theta_1_deg": 30.0,
  "hpbw_theta_2_deg": 40.0,
  "efficiency": 0.9,
  "frequency_hz": 5000000000
}
```

### `POST /api/calc/thermal-noise`
Calculates thermal noise power $P_n = kTB$ in Watts and dBm.
```json
{
  "bandwidth_hz": 20000000,
  "temperature_k": 290.0,
  "noise_figure_db": 3.0
}
```

### `POST /api/calc/fir-filter-spectrum`
Synthesizes FIR filter coefficients and magnitude response using SciPy.
```json
{
  "num_taps": 31,
  "cutoff_normalized": 0.25,
  "filter_type": "lowpass",
  "window_type": "hamming"
}
```

---

## 4. Hardware Simulators & Verilog Linter

### `GET /api/sim/status`
Checks availability and executable paths for Icarus Verilog (`iverilog`, `vvp`), ngspice (`ngspice`), and GNU Octave (`octave-cli`). Provides install instructions per OS.

### `POST /api/sim/verilog`
Compiles and executes Verilog module and testbench code inside a sandboxed temporary environment with a 5.0-second timeout.
```json
{
  "code": "module counter(...); ... endmodule",
  "testbench_code": "module tb(); ... endmodule",
  "timeout_sec": 5.0
}
```

### `POST /api/sim/verilog/lint`
Deterministic fallback AST structural linter for Verilog code when native tools are absent.
```json
{
  "code": "module my_circuit(input a, output b); assign b = a; endmodule"
}
```

---

## 5. File Upload & Technical Reports

### `POST /api/upload`
Uploads schematics, netlists, or source code files (multipart/form-data, max 10MB).
Returns `{ "filename": "...", "file_id": "...", "file_path": "...", "size_bytes": 1024, "preview": "..." }`.

### `GET /api/export/{conversation_id}?format=markdown|json|csv|html`
Exports the conversation session in the specified format with downloadable file attachment headers.

---

## 6. AI Chat & Conversations

### `POST /api/chat`
Non-streaming completion endpoint.

### `POST /api/chat/stream`
Server-Sent Events (SSE) streaming endpoint emitting token chunks and metadata.

### `GET /api/conversations`
List all saved conversations.

### `POST /api/conversations`
Create a new conversation session.

### `GET /api/conversations/{conv_id}`
Retrieve a conversation and its messages.

### `PUT /api/conversations/{conv_id}`
Update conversation title or domain.

### `DELETE /api/conversations/{conv_id}`
Permanently delete conversation session.

### `DELETE /api/conversations/{conv_id}/messages`
Clear all messages in a conversation.
