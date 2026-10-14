import os
import sys
import pytest
import math

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from calculation_engine import (
    parse_si_string,
    format_si_value,
    convert_units,
    calculate_resistor_network,
    calculate_ohms_law_exact,
    calculate_complex_impedance,
    calculate_frequency_wavelength,
    calculate_antenna_properties,
    calculate_shannon_capacity,
    calculate_thermal_noise_floor,
    calculate_fir_filter_design
)
from simulators import sim_manager


# --- 1. Resistor Networks & Exact Requirements ---

def test_two_1k_resistors_in_parallel_produces_500():
    """Requirement check: Two 1 kΩ resistors in parallel must produce 500 Ω."""
    res = calculate_resistor_network("parallel", [1000.0, 1000.0])
    assert res["success"] is True
    assert pytest.approx(res["equivalent_resistance_Ohm"], rel=1e-6) == 500.0


def test_1k_in_series_with_2k_produces_3k():
    """Requirement check: A 1 kΩ resistor in series with a 2 kΩ resistor must produce 3 kΩ."""
    res = calculate_resistor_network("series", [1000.0, 2000.0])
    assert res["success"] is True
    assert pytest.approx(res["equivalent_resistance_Ohm"], rel=1e-6) == 3000.0


def test_ohms_law_exact_requirements():
    """
    Requirements check:
    - 10 V across 2 kΩ must produce 5 mA.
    - 12 V across 6 Ω must produce 2 A and 24 W.
    """
    # 10V across 2k
    r1 = calculate_ohms_law_exact(voltage=10.0, resistance=2000.0)
    assert r1["success"] is True
    assert pytest.approx(r1["current_A"], rel=1e-6) == 0.005
    assert pytest.approx(r1["current_mA"], rel=1e-6) == 5.0
    assert pytest.approx(r1["power_W"], rel=1e-6) == 0.05

    # 12V across 6 Ohm
    r2 = calculate_ohms_law_exact(voltage=12.0, resistance=6.0)
    assert r2["success"] is True
    assert pytest.approx(r2["current_A"], rel=1e-6) == 2.0
    assert pytest.approx(r2["power_W"], rel=1e-6) == 24.0


# --- 2. Unit Conversions ---

def test_unit_conversions():
    # 1 Watt to dBm -> 30 dBm
    c1 = convert_units("power", 1.0, "w", "dbm")
    assert pytest.approx(c1["output_value"], rel=1e-4) == 30.0

    # 20 dBm to mW -> 100 mW
    c2 = convert_units("power", 20.0, "dbm", "mw")
    assert pytest.approx(c2["output_value"], rel=1e-4) == 100.0

    # Angle 180 deg to rad -> pi
    c3 = convert_units("angle", 180.0, "deg", "rad")
    assert pytest.approx(c3["output_value"], rel=1e-4) == math.pi


# --- 3. Complex Impedance ---

def test_complex_impedance():
    # Series RL: R=50, L=10mH at 1 kHz -> XL = 2*pi*1000*0.01 = 62.83 Ohm
    res = calculate_complex_impedance(resistance=50.0, inductance=0.01, frequency=1000.0, topology="series")
    assert res["success"] is True
    assert pytest.approx(res["real_Ohm"], rel=1e-4) == 50.0
    assert pytest.approx(res["imag_Ohm"], rel=1e-3) == 62.832
    assert res["nature"] == "Inductive"


# --- 4. Frequency and Wavelength ---

def test_frequency_and_wavelength():
    # 300 MHz in free space (er = 1.0) -> lambda = c / 300e6 ~ 0.9993 m ~ 1.0 m
    res = calculate_frequency_wavelength(frequency=300e6, relative_permittivity=1.0)
    assert res["success"] is True
    assert pytest.approx(res["wavelength_m"], rel=1e-3) == 1.0
    assert pytest.approx(res["quarter_wavelength_m"], rel=1e-3) == 0.25


# --- 5. Antenna Calculations ---

def test_antenna_calculations():
    # Kraus directivity: theta1 = 30 deg, theta2 = 40 deg -> D = 41253 / 1200 ~ 34.3775
    res = calculate_antenna_properties(antenna_type="kraus", hpbw_theta_1_deg=30.0, hpbw_theta_2_deg=40.0, efficiency=0.9)
    assert res["success"] is True
    assert pytest.approx(res["directivity_linear"], rel=1e-3) == 34.3775
    assert pytest.approx(res["gain_linear"], rel=1e-3) == 34.3775 * 0.9


# --- 6. Communication Systems ---

def test_shannon_capacity():
    # B = 1 MHz, SNR = 30 dB -> SNR_lin = 1000 -> C = 1e6 * log2(1001) ~ 9.967 Mbps
    res = calculate_shannon_capacity(bandwidth_hz=1e6, snr_db=30.0)
    assert res["success"] is True
    assert pytest.approx(res["capacity_Mbps"], rel=1e-2) == 9.967


def test_thermal_noise_floor():
    # B = 1 MHz at 290 K -> P_N = -174 + 10*log10(1e6) = -174 + 60 = -114 dBm
    res = calculate_thermal_noise_floor(bandwidth_hz=1e6)
    assert res["success"] is True
    assert pytest.approx(res["noise_power_dBm"], rel=1e-2) == -114.0


# --- 7. FIR Filter Calculations ---

def test_fir_filter_spectrum():
    res = calculate_fir_filter_design(num_taps=31, cutoff_normalized=0.25, window_type="hamming")
    assert res["success"] is True
    assert len(res["coefficients"]) == 31
    assert len(res["frequency_response"]["frequencies_normalized"]) == 128
    assert res["group_delay_samples"] == 15.0


# --- 8. Simulation Manager & Verilog Linter ---

def test_simulation_manager_status():
    status = sim_manager.get_all_tools_status()
    assert "icarus_verilog" in status
    assert "ngspice" in status
    assert "octave" in status
    # Should report install guide without crashing
    assert "windows" in status["icarus_verilog"].install_instructions


def test_verilog_linter():
    valid_code = """
    module counter (
      input wire clk,
      input wire reset,
      output reg [3:0] q
    );
      always @(posedge clk or posedge reset) begin
        if (reset)
          q <= 4'b0000;
        else
          q <= q + 1;
      end
    endmodule
    """
    lint_res = sim_manager.lint_verilog_code(valid_code)
    assert lint_res["valid"] is True
    assert "counter" in lint_res["modules_found"]
    assert len(lint_res["errors"]) == 0

    # Invalid code with unmatched begin
    invalid_code = """
    module bad (input clk);
      always @(posedge clk) begin
        // Missing end
    endmodule
    """
    lint_bad = sim_manager.lint_verilog_code(invalid_code)
    assert lint_bad["valid"] is False
    assert len(lint_bad["errors"]) > 0
