"""
CircuitX Backend Unit & Integration Tests
Tests database persistence, NumPy/SciPy engineering calculations,
Universal Task Router, and FastAPI endpoints.
"""

import sys
import os
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

import database as db
import calculators as calc
from task_router import classify_task
from main import app

client = TestClient(app)


# --- 1. Universal Task Router Tests ---

def test_task_router_classification_numerical():
    res = classify_task("Calculate voltage, current, and power for a 12V circuit with 4 ohm resistor")
    assert "circuit_calculations" in res["detected_domains"]
    assert res["task_type"] == "numerical"
    assert "ohms_law" in res["relevant_tools"]


def test_task_router_classification_verilog():
    res = classify_task("Generate a synthesizable Verilog module for an FSM sequence detector")
    assert "verilog_systemverilog" in res["detected_domains"]
    assert res["task_type"] == "code"


def test_task_router_classification_multi_domain():
    # Multi-domain: analog filter + MATLAB script
    res = classify_task("Design an active low-pass op-amp filter and write a MATLAB script to plot the Bode diagram")
    assert res["is_multi_domain"] is True
    assert "matlab" in res["detected_domains"]
    assert "analog_electronics" in res["detected_domains"] or "signals_systems" in res["detected_domains"]


def test_task_router_classification_theory():
    res = classify_task("Explain Maxwell's equations and their physical significance")
    assert "electromagnetic_theory" in res["detected_domains"]
    assert res["task_type"] == "theory"


# --- 2. Engineering Calculations Tests ---

def test_ohms_law_voltage_and_current():
    result = calc.calculate_ohms_law(voltage=12.0, current=2.0)
    assert result["success"] is True
    assert result["resistance_Ohm"] == 6.0
    assert result["power_W"] == 24.0


def test_ohms_law_voltage_and_resistance():
    result = calc.calculate_ohms_law(voltage=5.0, resistance=100.0)
    assert result["success"] is True
    assert pytest.approx(result["current_A"], rel=1e-3) == 0.05
    assert pytest.approx(result["power_W"], rel=1e-3) == 0.25


def test_rlc_resonance():
    result = calc.calculate_rlc(resistance=10.0, inductance=1e-3, capacitance=1e-6, frequency=5033.0)
    assert result["success"] is True
    assert pytest.approx(result["f0_Hz"], rel=1e-2) == 5032.92
    assert result["characteristic_impedance_Ohm"] > 0
    assert result["impedance_magnitude_Ohm"] is not None


def test_filter_cutoff():
    result = calc.calculate_filter_cutoff(filter_type="rc_lowpass", r=1000.0, c=1e-6)
    assert result["success"] is True
    assert pytest.approx(result["cutoff_frequency_Hz"], rel=1e-2) == 159.155


def test_friis_link_budget():
    result = calc.calculate_friis_link_budget(
        frequency_hz=2.4e9,
        distance_m=1000.0,
        tx_power_dbm=20.0,
        tx_gain_dbi=2.0,
        rx_gain_dbi=2.0
    )
    assert result["success"] is True
    assert pytest.approx(result["fspl_dB"], abs=1.0) == 100.0
    assert result["rx_power_dBm"] < 0


def test_opamp_gain():
    result = calc.calculate_opamp(topology="inverting", rf=10000.0, rin=1000.0, vin=2.0)
    assert result["success"] is True
    assert result["voltage_gain"] == -10.0
    assert result["vout_V"] == -20.0


def test_antenna_directivity():
    result = calc.calculate_antenna_directivity(theta_1_deg=30.0, theta_2_deg=30.0)
    assert result["success"] is True
    assert result["directivity_linear"] > 40.0
    assert result["directivity_dBi"] > 15.0


def test_cmos_delay():
    result = calc.calculate_cmos_delay(v_dd=1.2, c_load_ff=10.0, r_eq_nmos_kohm=1.5)
    assert result["success"] is True
    assert result["t_pd_avg_ps"] > 0


# --- 3. Database Persistence Tests ---

def test_database_crud():
    db.init_db()
    conv_id = "test-session-task-engine"
    
    conv = db.create_conversation(conv_id, "Test Session", "circuit_analysis")
    assert conv["id"] == conv_id
    assert conv["title"] == "Test Session"
    
    msg = db.add_message(
        msg_id="msg-1",
        conv_id=conv_id,
        role="user",
        content="Solve circuit with KVL"
    )
    assert msg["id"] == "msg-1"
    
    messages = db.get_conversation_messages(conv_id)
    assert len(messages) >= 1
    assert messages[0]["content"] == "Solve circuit with KVL"
    
    db.update_conversation(conv_id, title="Updated Title")
    updated = db.get_conversation_by_id(conv_id)
    assert updated["title"] == "Updated Title"
    
    deleted = db.delete_conversation(conv_id)
    assert deleted is True
    assert db.get_conversation_by_id(conv_id) is None


# --- 4. FastAPI API Endpoints Tests ---

def test_api_health_endpoints():
    # Root /health
    res1 = client.get("/health")
    assert res1.status_code == 200
    assert res1.json()["status"] == "healthy"
    assert res1.json()["task_router_active"] is True

    # /api/health
    res2 = client.get("/api/health")
    assert res2.status_code == 200
    assert res2.json()["status"] == "healthy"


def test_api_task_router_endpoint():
    res = client.post("/api/task-router/classify", json={"prompt": "Calculate antenna directivity from HPBW"})
    assert res.status_code == 200
    data = res.json()
    assert "antenna_engineering" in data["detected_domains"]


def test_api_conversations_flow():
    create_res = client.post("/api/conversations", json={"title": "Antenna Design", "domain": "antennas_rf"})
    assert create_res.status_code == 200
    conv_id = create_res.json()["id"]

    chat_res = client.post("/api/chat", json={
        "conversation_id": conv_id,
        "message": "Calculate antenna directivity with beamwidths 30 and 40 degrees",
        "domain": "antennas_rf"
    })
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["success"] is True

    get_res = client.get(f"/api/conversations/{conv_id}")
    assert get_res.status_code == 200
    assert len(get_res.json()["messages"]) == 2

    del_res = client.delete(f"/api/conversations/{conv_id}")
    assert del_res.status_code == 200


def test_api_calc_endpoints():
    res = client.post("/api/calc/ohms-law", json={"voltage": 24.0, "resistance": 12.0})
    assert res.status_code == 200
    data = res.json()
    assert data["current_A"] == 2.0
    assert data["power_W"] == 48.0


# --- 5. Expanded Engineering Modules Tests ---

def test_voltage_and_current_dividers():
    # Voltage divider: Vin = 12V, R1 = 4k, R2 = 8k -> Vout = 8V
    res_vd = client.post("/api/calc/voltage-divider", json={"vin": 12.0, "r1": 4000.0, "r2": 8000.0})
    assert res_vd.status_code == 200
    assert res_vd.json()["vout_V"] == 8.0

    # Current divider: Itotal = 10A, R1 = 20, R2 = 30 -> I1 = 6A, I2 = 4A
    res_cd = client.post("/api/calc/current-divider", json={"itotal": 10.0, "r1": 20.0, "r2": 30.0})
    assert res_cd.status_code == 200
    assert res_cd.json()["i1_A"] == 6.0
    assert res_cd.json()["i2_A"] == 4.0


def test_analog_electronics_calculators():
    # BJT Bias Active Mode: VCC = 12V, RB = 300k, RC = 2k, RE = 500
    res_bjt = client.post("/api/calc/bjt-bias", json={
        "vcc": 12.0, "vbe": 0.7, "rb": 300000.0, "rc": 2000.0, "re": 500.0, "beta": 100.0
    })
    assert res_bjt.status_code == 200
    assert res_bjt.json()["operating_region"] == "Active"
    assert res_bjt.json()["ic_mA"] > 0
    assert res_bjt.json()["vce_V"] > 0.2

    # BJT Bias Saturation Mode: Low RB = 50k drives high base current
    res_bjt_sat = client.post("/api/calc/bjt-bias", json={
        "vcc": 12.0, "vbe": 0.7, "rb": 50000.0, "rc": 2000.0, "re": 500.0, "beta": 100.0
    })
    assert res_bjt_sat.status_code == 200
    assert res_bjt_sat.json()["operating_region"] == "Saturation"
    assert res_bjt_sat.json()["vce_V"] == 0.2

    # 555 Astable Timer: RA = 10k, RB = 10k, C = 100nF -> f ≈ 480 Hz
    res_555 = client.post("/api/calc/timer-555", json={"ra_ohm": 10000.0, "rb_ohm": 10000.0, "c_farad": 1e-7})
    assert res_555.status_code == 200
    assert 470.0 <= res_555.json()["frequency_Hz"] <= 490.0


def test_digital_electronics_calculators():
    # Number base conversion: decimal 255 to hex and binary
    res_base = client.post("/api/calc/number-base", json={"value_str": "255", "from_base": 10})
    assert res_base.status_code == 200
    assert res_base.json()["hexadecimal"] == "0XFF"
    assert res_base.json()["binary"] == "0b11111111"

    # Timing slack analysis
    res_timing = client.post("/api/calc/timing-slack", json={
        "t_clk_period_ns": 10.0, "t_cq_ns": 1.0, "t_comb_max_ns": 5.0,
        "t_comb_min_ns": 2.0, "t_setup_ns": 1.0, "t_hold_ns": 0.5, "clock_skew_ns": 0.1
    })
    assert res_timing.status_code == 200
    assert res_timing.json()["setup_slack_ns"] > 0
    assert res_timing.json()["timing_status"] == "Met"


def test_signals_and_antennas_calculators():
    # FIR filter taps
    res_fir = client.post("/api/calc/fir-filter", json={"num_taps": 15, "cutoff_normalized": 0.25, "window_type": "hamming"})
    assert res_fir.status_code == 200
    assert len(res_fir.json()["coefficients"]) == 15

    # VSWR & Return Loss: ZL = 100, Z0 = 50 -> gamma = 0.333, VSWR = 2.0
    res_vswr = client.post("/api/calc/vswr-return-loss", json={"z_load_ohm": 100.0, "z0_ohm": 50.0})
    assert res_vswr.status_code == 200
    assert pytest.approx(res_vswr.json()["vswr"], rel=1e-2) == 2.0


def test_communications_and_math_calculators():
    # Shannon channel capacity: B = 10 MHz, SNR = 30 dB
    res_shannon = client.post("/api/calc/shannon-capacity", json={"bandwidth_hz": 10e6, "snr_db": 30.0})
    assert res_shannon.status_code == 200
    assert res_shannon.json()["capacity_Mbps"] > 90.0

    # Complex math: 3 + j4 -> magnitude 5, phase ~53.13 deg
    res_complex = client.post("/api/calc/complex-math", json={"real": 3.0, "imag": 4.0})
    assert res_complex.status_code == 200
    assert pytest.approx(res_complex.json()["magnitude"], rel=1e-3) == 5.0
    assert pytest.approx(res_complex.json()["phase_deg"], rel=1e-2) == 53.13

    # dB conversion: 30 dBm -> 1.0 Watt
    res_db = client.post("/api/calc/db-conversion", json={"val": 30.0, "conversion_type": "dbm_to_w"})
    assert res_db.status_code == 200
    assert pytest.approx(res_db.json()["power_Watts"], rel=1e-3) == 1.0


def test_workflows_api_endpoint():
    res = client.get("/api/workflows")
    assert res.status_code == 200
    data = res.json()
    assert "circuit_analysis" in data
    assert "analog_electronics" in data
    assert "verilog_hdl" in data
    assert "antennas_rf" in data
    assert len(data) == 12
