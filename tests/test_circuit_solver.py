import os
import sys
import pytest
import math

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from circuit_solver import (
    CircuitComponent,
    parse_spice_netlist,
    solve_dc_circuit,
    parse_si_value,
    CircuitParseError,
    CircuitValidationError,
    CircuitSingularMatrixError
)


def test_parse_si_values():
    assert pytest.approx(parse_si_value("1k"), rel=1e-9) == 1000.0
    assert pytest.approx(parse_si_value("2.2k"), rel=1e-9) == 2200.0
    assert pytest.approx(parse_si_value("10M"), rel=1e-9) == 10e6
    assert pytest.approx(parse_si_value("10meg"), rel=1e-9) == 10e6
    assert pytest.approx(parse_si_value("100n"), rel=1e-9) == 1e-7
    assert pytest.approx(parse_si_value("15p"), rel=1e-9) == 15e-12
    assert pytest.approx(parse_si_value("47u"), rel=1e-9) == 47e-6
    assert pytest.approx(parse_si_value("47µ"), rel=1e-9) == 47e-6
    assert pytest.approx(parse_si_value("50"), rel=1e-9) == 50.0
    assert pytest.approx(parse_si_value("5mA"), rel=1e-9) == 0.005


def test_simple_voltage_divider():
    """
    V1: 10V from node 1 to 0 (GND)
    R1: 2k from node 1 to 2
    R2: 2k from node 2 to 0
    Expected:
    V(1) = 10V, V(2) = 5V, V(0) = 0V
    Current through R1 & R2 = 10V / 4k = 2.5 mA
    Total power = 10V * 2.5mA = 25 mW
    """
    netlist = """
    * Simple Voltage Divider
    V1 1 0 10V
    R1 1 2 2k
    R2 2 0 2k
    .end
    """
    comps = parse_spice_netlist(netlist)
    assert len(comps) == 3

    res = solve_dc_circuit(comps)
    assert res.success is True
    assert res.nodes["0"] == 0.0
    assert res.nodes["1"] == 10.0
    assert res.nodes["2"] == 5.0

    # Check power balance
    assert pytest.approx(res.total_power_supplied_W, rel=1e-5) == 0.025
    assert pytest.approx(res.total_power_dissipated_W, rel=1e-5) == 0.025
    assert res.power_balance_error_W < 1e-6
    assert res.kcl_max_residual_A < 1e-6


def test_10v_across_2k_produces_5ma():
    """
    Requirement check: 10 V across 2 kΩ must produce 5 mA.
    """
    netlist = """
    V1 in 0 10V
    R1 in 0 2k
    """
    comps = parse_spice_netlist(netlist)
    res = solve_dc_circuit(comps)

    assert res.nodes["IN"] == 10.0
    r1_branch = [b for b in res.branches if b.name == "R1"][0]
    assert pytest.approx(r1_branch.current_A, rel=1e-5) == 0.005  # 5 mA
    assert pytest.approx(r1_branch.power_W, rel=1e-5) == 0.05      # 50 mW


def test_12v_across_6_ohm_produces_2a_and_24w():
    """
    Requirement check: 12 V across 6 Ω must produce 2 A and 24 W.
    """
    netlist = """
    Vsrc p 0 12V
    Rload p 0 6
    """
    comps = parse_spice_netlist(netlist)
    res = solve_dc_circuit(comps)

    assert res.nodes["P"] == 12.0
    rload = [b for b in res.branches if b.name == "RLOAD"][0]
    assert pytest.approx(rload.current_A, rel=1e-5) == 2.0  # 2 A
    assert pytest.approx(rload.power_W, rel=1e-5) == 24.0   # 24 W


def test_wheatstone_bridge_circuit():
    """
    Wheatstone Bridge circuit:
    V1 1 0 10V
    R1 1 2 100
    R2 1 3 100
    R3 2 0 100
    R4 3 0 100
    Rbridge 2 3 50
    Balanced bridge -> V(2) == V(3) == 5V, I(Rbridge) == 0 A.
    """
    netlist = """
    V1 1 0 10
    R1 1 2 100
    R2 1 3 100
    R3 2 0 100
    R4 3 0 100
    Rbridge 2 3 50
    """
    comps = parse_spice_netlist(netlist)
    res = solve_dc_circuit(comps)

    assert res.success is True
    assert res.nodes["1"] == 10.0
    assert pytest.approx(res.nodes["2"], rel=1e-5) == 5.0
    assert pytest.approx(res.nodes["3"], rel=1e-5) == 5.0

    rb = [b for b in res.branches if b.name == "RBRIDGE"][0]
    assert pytest.approx(rb.current_A, abs=1e-9) == 0.0


def test_dc_inductors_and_capacitors():
    """
    In DC steady-state:
    - Capacitor is open (0 A current)
    - Inductor is short (0 V drop)
    """
    netlist = """
    V1 1 0 12V
    R1 1 2 1000
    C1 2 0 10uF
    L1 2 3 10mH
    Rload 3 0 1000
    """
    comps = parse_spice_netlist(netlist)
    res = solve_dc_circuit(comps)

    assert res.success is True
    # Since L1 is a short, V(2) == V(3)
    assert pytest.approx(res.nodes["2"], rel=1e-4) == res.nodes["3"]
    # R1 and Rload form equal voltage divider -> 6V
    assert pytest.approx(res.nodes["2"], rel=1e-3) == 6.0

    c1_branch = [b for b in res.branches if b.name == "C1"][0]
    assert c1_branch.current_A == 0.0
    assert "Open" in c1_branch.status


def test_missing_ground_detection():
    """
    Should detect and raise error when no ground node ('0' or 'GND') is present.
    """
    netlist = """
    V1 1 2 10V
    R1 2 3 1000
    """
    comps = parse_spice_netlist(netlist)
    with pytest.raises(CircuitValidationError, match="Missing Ground Reference"):
        solve_dc_circuit(comps)


def test_floating_subcircuit_detection():
    """
    Floating subcircuit with no DC path to ground produces a singular matrix.
    """
    netlist = """
    V1 1 0 10V
    R1 1 0 1000
    * Floating island
    V2 10 11 5V
    R2 10 11 500
    """
    comps = parse_spice_netlist(netlist)
    with pytest.raises(CircuitSingularMatrixError, match="Singular or Underdetermined"):
        solve_dc_circuit(comps)


def test_svg_schematic_generation():
    netlist = """
    V1 1 0 5V
    R1 1 2 1k
    R2 2 0 1k
    """
    comps = parse_spice_netlist(netlist)
    res = solve_dc_circuit(comps)

    assert res.svg_schematic is not None
    assert "<svg" in res.svg_schematic
    assert "CIRCUITX MNA SCHEMATIC" in res.svg_schematic
    assert "</svg>" in res.svg_schematic
