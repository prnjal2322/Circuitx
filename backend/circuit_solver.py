"""
CircuitX — Deterministic Modified Nodal Analysis (MNA) DC Circuit Solver.

Provides a structured representation and deterministic numerical solver for DC resistive circuits:
- Nodes (including Ground '0' / 'GND')
- Resistors (R)
- Capacitors (C) (treated as open circuit in DC steady-state)
- Inductors (L) (treated as short circuit in DC steady-state, R=1e-12 Ohm)
- Independent Voltage Sources (V)
- Independent Current Sources (I)

Mathematical Formulation:
Modified Nodal Analysis (MNA) matrix formulation:
    [ G   B ] [ v  ]   [ j ]
    [ B^T D ] [ iv ] = [ e ]
where:
    G: Conductance matrix (size n x n)
    B: Incidence matrix for voltage sources (size n x m)
    v: Vector of unknown non-ground node voltages (size n x 1)
    iv: Vector of unknown branch currents through voltage sources (size m x 1)
    j: Vector of independent current sources entering each node (size n x 1)
    e: Vector of independent voltage source potentials (size m x 1)
    D: Zero matrix for independent voltage sources (size m x m)

Features:
- Validates circuit description and component values.
- Detects missing ground reference (node '0' or 'GND').
- Detects singular / underdetermined systems (floating subcircuits, shorted voltage sources).
- Reports condition number and numerical errors clearly.
- Computes branch voltages, branch currents, and power dissipated/absorbed.
- Verifies physical conservation: Tellegen's Theorem (sum of power = 0) and KCL at every node.
- Generates clean SVG schematic diagrams and LaTeX mathematical derivations.
"""

import re
import math
from typing import Dict, List, Optional, Tuple, Any
from pydantic import BaseModel, Field
import numpy as np


class CircuitComponent(BaseModel):
    name: str
    component_type: str  # 'R', 'V', 'I', 'C', 'L'
    node_pos: str
    node_neg: str
    value: float
    unit: str = ""
    description: str = ""


class NodeResult(BaseModel):
    node_id: str
    voltage_V: float


class BranchResult(BaseModel):
    name: str
    component_type: str
    node_pos: str
    node_neg: str
    value: float
    voltage_V: float
    current_A: float
    power_W: float
    status: str = "Normal"  # Normal, Open (Capacitor DC), Short (Inductor DC)


class CircuitSolveResult(BaseModel):
    success: bool
    num_nodes: int
    num_elements: int
    ground_node: str
    nodes: Dict[str, float]
    branches: List[BranchResult]
    total_power_dissipated_W: float
    total_power_supplied_W: float
    power_balance_error_W: float
    kcl_max_residual_A: float
    matrix_condition_number: float
    assumptions: List[str]
    derivation_steps: List[str]
    svg_schematic: Optional[str] = None
    error: Optional[str] = None


class CircuitParseError(Exception):
    pass


class CircuitValidationError(Exception):
    pass


class CircuitSingularMatrixError(Exception):
    pass


def parse_si_value(val_str: str) -> float:
    """
    Parses a numeric string with standard engineering SI prefixes and optional unit suffixes:
    p (1e-12), n (1e-9), u/µ (1e-6), m (1e-3), k/K (1e3), M/meg/MEG (1e6), G (1e9), T (1e12).
    Example: '1k' -> 1000.0, '2.2u' -> 2.2e-6, '10Meg' -> 10e6, '10M' -> 10e6, '10uF' -> 1e-5, '10mH' -> 0.01, '50' -> 50.0
    """
    s = str(val_str).strip().replace("µ", "u").replace("Ω", "")
    if not s:
        raise ValueError("Empty value string")

    # Check for 'meg' or 'MEG'
    lower_s = s.lower()
    if "meg" in lower_s:
        prefix_idx = lower_s.find("meg")
        num_part = s[:prefix_idx]
        return float(num_part) * 1e6

    # Pattern: number followed by optional prefix and unit
    m = re.match(r"^([-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?)\s*([a-zA-Z]*)$", s)
    if not m:
        return float(s)

    num_part, suffix_part = m.groups()
    base_val = float(num_part)

    if not suffix_part:
        return base_val

    first_char = suffix_part[0]

    if first_char == "M":
        return base_val * 1e6
    elif first_char == "m":
        return base_val * 1e-3
    elif first_char in ("k", "K"):
        return base_val * 1e3
    elif first_char in ("u", "U"):
        return base_val * 1e-6
    elif first_char in ("n", "N"):
        return base_val * 1e-9
    elif first_char in ("p", "P"):
        return base_val * 1e-12
    elif first_char in ("g", "G"):
        return base_val * 1e9
    elif first_char in ("t", "T"):
        return base_val * 1e12
    elif first_char.lower() in ("v", "a", "f", "h", "w", "s", "o"):
        return base_val

    return base_val


def parse_spice_netlist(netlist_text: str) -> List[CircuitComponent]:
    """
    Parses a text-based SPICE netlist into structured CircuitComponent elements.
    Supports comments (*, #), blank lines, and standard SPICE component formats:
    R1 1 2 1k
    V1 1 0 10V
    I1 0 2 5mA
    C1 2 0 10uF
    L1 2 3 1mH
    """
    components: List[CircuitComponent] = []
    lines = netlist_text.strip().splitlines()

    for line_idx, line in enumerate(lines, start=1):
        clean = line.strip()
        if not clean or clean.startswith("*") or clean.startswith("#") or clean.startswith(";"):
            continue

        # Ignore dot commands like .op, .tran, .end
        if clean.startswith("."):
            continue

        tokens = clean.split()
        if len(tokens) < 4:
            raise CircuitParseError(
                f"Line {line_idx}: Invalid component definition '{line}'. "
                f"Format required: <Name> <Node+> <Node-> <Value>"
            )

        name = tokens[0].upper()
        node_pos = tokens[1].upper()
        node_neg = tokens[2].upper()
        val_str = tokens[3]

        comp_type = name[0]
        if comp_type not in ["R", "V", "I", "C", "L"]:
            raise CircuitParseError(
                f"Line {line_idx}: Unsupported component type '{comp_type}' in '{name}'. "
                f"Supported: R (Resistor), V (Voltage Source), I (Current Source), C (Capacitor), L (Inductor)."
            )

        try:
            val = parse_si_value(val_str)
        except Exception as e:
            raise CircuitParseError(
                f"Line {line_idx}: Could not parse numerical value '{val_str}' for component {name}: {str(e)}"
            )

        components.append(
            CircuitComponent(
                name=name,
                component_type=comp_type,
                node_pos=node_pos,
                node_neg=node_neg,
                value=val,
                unit="Ohm" if comp_type == "R" else ("V" if comp_type == "V" else ("A" if comp_type == "I" else ("F" if comp_type == "C" else "H")))
            )
        )

    if not components:
        raise CircuitParseError("No valid circuit components found in netlist.")

    return components


def solve_dc_circuit(components: List[CircuitComponent], ground_name: Optional[str] = None) -> CircuitSolveResult:
    """
    Performs deterministic Modified Nodal Analysis (MNA) to solve the DC operating point.
    """
    assumptions = [
        "Circuit solved in DC steady-state equilibrium.",
        "Ideal independent voltage sources have zero internal series impedance.",
        "Ideal independent current sources have infinite internal shunt impedance.",
        "Capacitors act as ideal open circuits in DC steady state.",
        "Inductors act as ideal short circuits (modeled with parasitic resistance r = 1e-12 Ω) in DC steady state."
    ]

    # 1. Identify all nodes
    all_nodes_set = set()
    for c in components:
        all_nodes_set.add(c.node_pos)
        all_nodes_set.add(c.node_neg)

    # 2. Validate Ground Reference
    detected_ground = None
    if ground_name and ground_name.upper() in all_nodes_set:
        detected_ground = ground_name.upper()
    elif "0" in all_nodes_set:
        detected_ground = "0"
    elif "GND" in all_nodes_set:
        detected_ground = "GND"
    elif "GROUND" in all_nodes_set:
        detected_ground = "GROUND"

    if not detected_ground:
        raise CircuitValidationError(
            "Missing Ground Reference: Circuit must define a reference ground node labeled '0' or 'GND'. "
            "Every nodal analysis system requires a 0V reference node to establish unambiguous nodal potentials."
        )

    # Non-ground nodes
    non_ground_nodes = sorted([n for n in all_nodes_set if n != detected_ground])
    num_nodes = len(non_ground_nodes)

    if num_nodes == 0:
        raise CircuitValidationError("Circuit only contains the ground node. At least one non-ground node is required.")

    node_to_idx = {node: idx for idx, node in enumerate(non_ground_nodes)}

    # Categorize elements
    resistors = [c for c in components if c.component_type == "R"]
    voltage_sources = [c for c in components if c.component_type == "V"]
    current_sources = [c for c in components if c.component_type == "I"]
    inductors = [c for c in components if c.component_type == "L"]
    capacitors = [c for c in components if c.component_type == "C"]

    # In DC, inductors are small series resistance to prevent singular inductance equations
    equivalent_resistors = list(resistors)
    for ind in inductors:
        equivalent_resistors.append(
            CircuitComponent(
                name=ind.name,
                component_type="R",
                node_pos=ind.node_pos,
                node_neg=ind.node_neg,
                value=1e-6,  # realistic 1 micro-ohm wire representation
                unit="Ohm",
                description=f"DC short-circuit equivalent of inductor {ind.name} (1e-6 Ω)"
            )
        )

    # Check for invalid values
    for r in equivalent_resistors:
        if r.value <= 0:
            raise CircuitValidationError(f"Resistor {r.name} has non-positive resistance ({r.value} Ω). Resistance must be strictly positive.")

    # Check for short-circuited voltage sources (pos == neg)
    for v in voltage_sources:
        if v.node_pos == v.node_neg:
            raise CircuitValidationError(f"Voltage source {v.name} has both terminals connected to the same node ({v.node_pos}), creating an impossible short circuit.")

    num_v_sources = len(voltage_sources)
    total_vars = num_nodes + num_v_sources

    # Formulate MNA Matrices
    G = np.zeros((num_nodes, num_nodes), dtype=np.float64)
    B = np.zeros((num_nodes, num_v_sources), dtype=np.float64)
    j = np.zeros((num_nodes, 1), dtype=np.float64)
    e = np.zeros((num_v_sources, 1), dtype=np.float64)

    # Stamp Resistors into G
    for r in equivalent_resistors:
        g_val = 1.0 / r.value
        p_idx = node_to_idx.get(r.node_pos)
        n_idx = node_to_idx.get(r.node_neg)

        if p_idx is not None:
            G[p_idx, p_idx] += g_val
        if n_idx is not None:
            G[n_idx, n_idx] += g_val
        if p_idx is not None and n_idx is not None:
            G[p_idx, n_idx] -= g_val
            G[n_idx, p_idx] -= g_val

    # Stamp Voltage Sources into B and e
    for k, v in enumerate(voltage_sources):
        e[k, 0] = v.value
        p_idx = node_to_idx.get(v.node_pos)
        n_idx = node_to_idx.get(v.node_neg)

        if p_idx is not None:
            B[p_idx, k] = 1.0
        if n_idx is not None:
            B[n_idx, k] = -1.0

    # Stamp Current Sources into j
    # Convention: current enters node_pos and leaves node_neg
    for cs in current_sources:
        p_idx = node_to_idx.get(cs.node_pos)
        n_idx = node_to_idx.get(cs.node_neg)

        if p_idx is not None:
            j[p_idx, 0] += cs.value
        if n_idx is not None:
            j[n_idx, 0] -= cs.value

    # Assemble MNA Block Matrix:
    # A = [ G   B ]
    #     [ B^T 0 ]
    # z = [ j ]
    #     [ e ]
    top_block = np.hstack([G, B])
    bottom_block = np.hstack([B.T, np.zeros((num_v_sources, num_v_sources), dtype=np.float64)])
    A = np.vstack([top_block, bottom_block])
    z = np.vstack([j, e])

    # Check Condition Number & Singularity
    try:
        cond_num = float(np.linalg.cond(A))
    except Exception:
        cond_num = float("inf")

    if cond_num > 1e15 or np.isnan(cond_num) or np.isinf(cond_num):
        # Examine cause: floating node or loop of voltage sources
        raise CircuitSingularMatrixError(
            f"Singular or Underdetermined Circuit (Condition Number = {cond_num:.2e}). "
            f"Possible causes: (1) Floating node with no DC path to ground, (2) Closed loop of ideal voltage sources, "
            f"or (3) Ideal current source connected to an open circuit with nowhere for current to flow."
        )

    # Solve A * x = z
    try:
        x = np.linalg.solve(A, z).flatten()
    except np.linalg.LinAlgError as err:
        raise CircuitSingularMatrixError(f"Linear algebra solver failed: {str(err)}. Matrix is singular.")

    # Extract Nodal Voltages
    solved_voltages = {detected_ground: 0.0}
    for idx, node_name in enumerate(non_ground_nodes):
        solved_voltages[node_name] = float(x[idx])

    # Extract Voltage Source Currents
    # Current leaving positive terminal and entering negative terminal
    v_source_currents = {}
    for k, v in enumerate(voltage_sources):
        # In MNA: B*iv -> iv is current flowing through source from neg to pos or pos to neg
        # Standard convention: iv_k is current flowing from node_pos to node_neg through source
        v_source_currents[v.name] = float(x[num_nodes + k])

    # Compute Branch Results & Consistency
    branches: List[BranchResult] = []
    total_power_dissipated = 0.0
    total_power_supplied = 0.0

    # 1. Resistors
    for r in resistors:
        v_pos = solved_voltages[r.node_pos]
        v_neg = solved_voltages[r.node_neg]
        v_branch = v_pos - v_neg
        i_branch = v_branch / r.value
        p_branch = v_branch * i_branch  # >= 0 always

        total_power_dissipated += p_branch
        branches.append(
            BranchResult(
                name=r.name,
                component_type="R",
                node_pos=r.node_pos,
                node_neg=r.node_neg,
                value=r.value,
                voltage_V=round(v_branch, 6),
                current_A=round(i_branch, 6),
                power_W=round(p_branch, 6),
                status="Normal"
            )
        )

    # 2. Inductors (DC short)
    for ind in inductors:
        v_pos = solved_voltages[ind.node_pos]
        v_neg = solved_voltages[ind.node_neg]
        v_branch = v_pos - v_neg
        # Find current in equivalent small resistor
        i_branch = v_branch / 1e-6 if abs(v_branch) > 1e-12 else 0.0
        p_branch = 0.0  # ideal inductor dissipates 0 DC power

        branches.append(
            BranchResult(
                name=ind.name,
                component_type="L",
                node_pos=ind.node_pos,
                node_neg=ind.node_neg,
                value=ind.value,
                voltage_V=round(v_branch, 6),
                current_A=round(i_branch, 6),
                power_W=round(p_branch, 6),
                status="DC Short (Ideal wire: 0V drop)"
            )
        )

    # 3. Capacitors (DC open)
    for cap in capacitors:
        v_pos = solved_voltages[cap.node_pos]
        v_neg = solved_voltages[cap.node_neg]
        v_branch = v_pos - v_neg
        i_branch = 0.0
        p_branch = 0.0

        branches.append(
            BranchResult(
                name=cap.name,
                component_type="C",
                node_pos=cap.node_pos,
                node_neg=cap.node_neg,
                value=cap.value,
                voltage_V=round(v_branch, 6),
                current_A=0.0,
                power_W=0.0,
                status="DC Open (Zero current)"
            )
        )

    # 4. Voltage Sources
    for v in voltage_sources:
        v_pos = solved_voltages[v.node_pos]
        v_neg = solved_voltages[v.node_neg]
        v_branch = v_pos - v_neg
        # Current flowing out of the positive terminal:
        # Standard: P_supplied = V * I_out. If current flows into +, source absorbs power (battery charging).
        i_through = v_source_currents[v.name]
        # Current delivered out of positive terminal is -i_through in MNA standard
        i_delivered = -i_through
        p_source = v.value * i_delivered

        if p_source >= 0:
            total_power_supplied += p_source
        else:
            total_power_dissipated += (-p_source)

        branches.append(
            BranchResult(
                name=v.name,
                component_type="V",
                node_pos=v.node_pos,
                node_neg=v.node_neg,
                value=v.value,
                voltage_V=round(v_branch, 6),
                current_A=round(i_delivered, 6),
                power_W=round(p_source, 6),
                status="Supplying" if p_source >= 0 else "Absorbing"
            )
        )

    # 5. Current Sources
    for cs in current_sources:
        v_pos = solved_voltages[cs.node_pos]
        v_neg = solved_voltages[cs.node_neg]
        v_branch = v_pos - v_neg
        # Current leaves node_pos, so power delivered is v_branch * cs.value
        p_cs = v_branch * cs.value

        if p_cs >= 0:
            total_power_supplied += p_cs
        else:
            total_power_dissipated += (-p_cs)

        branches.append(
            BranchResult(
                name=cs.name,
                component_type="I",
                node_pos=cs.node_pos,
                node_neg=cs.node_neg,
                value=cs.value,
                voltage_V=round(v_branch, 6),
                current_A=round(cs.value, 6),
                power_W=round(p_cs, 6),
                status="Supplying" if p_cs >= 0 else "Absorbing"
            )
        )

    # Consistency Check: Tellegen's Theorem (Power balance)
    power_balance_error = abs(total_power_supplied - total_power_dissipated)

    # Consistency Check: KCL at each node
    kcl_residuals = []
    for node in all_nodes_set:
        sum_i = 0.0
        for b in branches:
            if b.component_type == "R":
                if b.node_pos == node:
                    sum_i -= b.current_A  # leaving node
                elif b.node_neg == node:
                    sum_i += b.current_A  # entering node
            elif b.component_type == "V":
                if b.node_pos == node:
                    sum_i += b.current_A  # leaving positive terminal -> entering node
                elif b.node_neg == node:
                    sum_i -= b.current_A  # leaving node -> entering negative terminal
            elif b.component_type == "I":
                if b.node_pos == node:
                    sum_i += b.current_A  # entering node_pos
                elif b.node_neg == node:
                    sum_i -= b.current_A  # leaving node_neg
        kcl_residuals.append(abs(sum_i))

    max_kcl_residual = max(kcl_residuals) if kcl_residuals else 0.0

    # Build LaTeX Derivation Steps
    derivation_steps = [
        f"Circuit nodes identified: {', '.join(sorted(all_nodes_set))} with ground reference node '{detected_ground}' = 0.0 V.",
        f"Independent variables: {num_nodes} non-ground node voltages + {num_v_sources} voltage source branch currents.",
        f"MNA Matrix Dimension: {total_vars} \\times {total_vars} with Condition Number $\\kappa = {cond_num:.2e}$.",
    ]

    for node_name in non_ground_nodes:
        derivation_steps.append(f"Node '{node_name}' Potential: V_{{{node_name}}} = {solved_voltages[node_name]:.4f} \\text{{ V}}")

    derivation_steps.append(
        f"Conservation of Energy Check: Total Power Supplied = {total_power_supplied:.4f} \\text{{ W}}, "
        f"Total Power Dissipated = {total_power_dissipated:.4f} \\text{{ W}} (Residual = {power_balance_error:.2e} \\text{{ W}})."
    )
    derivation_steps.append(f"Kirchhoff's Current Law (KCL) Max Residual: {max_kcl_residual:.2e} \\text{{ A}}.")

    # Generate Deterministic SVG Schematic
    svg_schematic = generate_circuit_svg(components, solved_voltages)

    return CircuitSolveResult(
        success=True,
        num_nodes=len(all_nodes_set),
        num_elements=len(components),
        ground_node=detected_ground,
        nodes={k: round(v, 6) for k, v in solved_voltages.items()},
        branches=branches,
        total_power_dissipated_W=round(total_power_dissipated, 6),
        total_power_supplied_W=round(total_power_supplied, 6),
        power_balance_error_W=round(power_balance_error, 8),
        kcl_max_residual_A=round(max_kcl_residual, 8),
        matrix_condition_number=round(cond_num, 4),
        assumptions=assumptions,
        derivation_steps=derivation_steps,
        svg_schematic=svg_schematic,
        error=None
    )


def generate_circuit_svg(components: List[CircuitComponent], voltages: Dict[str, float]) -> str:
    """
    Renders a deterministic SVG circuit diagram with annotated solved nodal voltages and components.
    """
    width = 640
    height = 360

    # Layout nodes horizontally or in a ring
    all_nodes = sorted(list(voltages.keys()))
    node_positions = {}

    margin_x = 70
    margin_y = 60
    usable_w = width - 2 * margin_x
    usable_h = height - 2 * margin_y

    # Position ground at bottom center
    gnd_node = [n for n in all_nodes if n in ("0", "GND", "GROUND")]
    gnd_id = gnd_node[0] if gnd_node else all_nodes[0]

    other_nodes = [n for n in all_nodes if n != gnd_id]
    n_others = len(other_nodes)

    if n_others > 0:
        step_x = usable_w / max(1, n_others - 1) if n_others > 1 else usable_w / 2
        for i, n in enumerate(other_nodes):
            x = margin_x + i * step_x if n_others > 1 else width / 2
            y = margin_y + 40
            node_positions[n] = (x, y)
    node_positions[gnd_id] = (width / 2, height - margin_y)

    svg_parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="100%" height="100%" '
        f'style="background-color: #0A0E17; border-radius: 12px; font-family: monospace;">',
        '<defs>',
        '  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">',
        '    <feGaussianBlur stdDeviation="3" result="blur" />',
        '    <feMerge>',
        '      <feMergeNode in="blur" />',
        '      <feMergeNode in="SourceGraphic" />',
        '    </feMerge>',
        '  </filter>',
        '</defs>',
        '<!-- Grid Pattern Background -->',
        '<pattern id="circuitGrid" width="20" height="20" patternUnits="userSpaceOnUse">',
        '  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1E293B" stroke-width="0.7"/>',
        '</pattern>',
        f'<rect width="{width}" height="{height}" fill="url(#circuitGrid)" />',
        '<!-- Circuit Title Badge -->',
        '<rect x="15" y="15" width="220" height="28" rx="6" fill="#0F172A" stroke="#00E5FF" stroke-width="0.8"/>',
        '<text x="25" y="33" fill="#00E5FF" font-size="11" font-weight="bold">CIRCUITX MNA SCHEMATIC</text>',
        '<text x="180" y="33" fill="#94A3B8" font-size="9">[CALCULATED]</text>',
    ]

    # Draw component branches as interconnect lines
    drawn_pairs = set()
    for comp in components:
        p1 = node_positions.get(comp.node_pos)
        p2 = node_positions.get(comp.node_neg)
        if not p1 or not p2:
            continue

        pair_key = tuple(sorted([comp.node_pos, comp.node_neg]))
        offset_y = 0
        if pair_key in drawn_pairs:
            offset_y = 25
        drawn_pairs.add(pair_key)

        mid_x = (p1[0] + p2[0]) / 2
        mid_y = (p1[1] + p2[1]) / 2 + offset_y

        stroke_color = "#38BDF8" if comp.component_type == "R" else ("#10B981" if comp.component_type == "V" else "#F59E0B")

        # Connection wire
        svg_parts.append(
            f'<path d="M {p1[0]} {p1[1]} Q {mid_x} {mid_y} {p2[0]} {p2[1]}" '
            f'fill="none" stroke="{stroke_color}" stroke-width="2" opacity="0.8"/>'
        )

        # Component Badge at midpoint
        val_display = f"{comp.value:.2g}{comp.unit}" if comp.value < 1e3 else f"{comp.value/1e3:.2g}k{comp.unit}"
        svg_parts.append(
            f'<rect x="{mid_x - 30}" y="{mid_y - 12}" width="60" height="24" rx="4" fill="#0B1120" stroke="{stroke_color}" stroke-width="1.2"/>'
            f'<text x="{mid_x}" y="{mid_y + 4}" fill="#E2E8F0" font-size="9" text-anchor="middle" font-weight="bold">{comp.name}: {val_display}</text>'
        )

    # Draw Nodes and Voltages
    for node_name, pos in node_positions.items():
        v_val = voltages.get(node_name, 0.0)
        is_gnd = node_name == gnd_id
        fill_color = "#10B981" if is_gnd else "#00E5FF"

        # Node dot
        svg_parts.append(
            f'<circle cx="{pos[0]}" cy="{pos[1]}" r="6" fill="{fill_color}" stroke="#FFFFFF" stroke-width="1.5" filter="url(#glow)"/>'
        )

        # Label & Voltage readout
        label_y = pos[1] - 12 if not is_gnd else pos[1] + 20
        svg_parts.append(
            f'<text x="{pos[0]}" y="{label_y}" fill="#F8FAFC" font-size="11" font-weight="bold" text-anchor="middle">{node_name}</text>'
            f'<text x="{pos[0]}" y="{label_y + (12 if not is_gnd else 12)}" fill="{fill_color}" font-size="10" text-anchor="middle">{v_val:.3f} V</text>'
        )

        # Ground symbol
        if is_gnd:
            gy = pos[1] + 6
            svg_parts.append(
                f'<line x1="{pos[0] - 14}" y1="{gy + 18}" x2="{pos[0] + 14}" y2="{gy + 18}" stroke="#10B981" stroke-width="2"/>'
                f'<line x1="{pos[0] - 9}" y1="{gy + 22}" x2="{pos[0] + 9}" y2="{gy + 22}" stroke="#10B981" stroke-width="1.5"/>'
                f'<line x1="{pos[0] - 4}" y1="{gy + 26}" x2="{pos[0] + 4}" y2="{gy + 26}" stroke="#10B981" stroke-width="1.2"/>'
            )

    svg_parts.append('</svg>')
    return "\n".join(svg_parts)
