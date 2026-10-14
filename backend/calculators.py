"""
CircuitX Engineering Calculations Engine
Provides verified numerical electronics engineering solvers using NumPy and SciPy.
Prevents LLM arithmetic hallucinations with rigorous algebraic and scientific formulas.
Covers Circuit Analysis, Analog, Digital, Signals, Antennas, RF, Communications, and Engineering Math.
"""

import math
from typing import Dict, Any, Optional, List
import numpy as np


# ==========================================
# MODULE 1: CIRCUIT ANALYSIS
# ==========================================

def calculate_ohms_law(
    voltage: Optional[float] = None,
    current: Optional[float] = None,
    resistance: Optional[float] = None,
    power: Optional[float] = None
) -> Dict[str, Any]:
    """
    Solves DC Ohm's Law and Power given any 2 parameters.
    V = I * R, P = V * I = I^2 * R = V^2 / R
    """
    v, i, r, p = voltage, current, resistance, power
    steps = []

    provided = sum(x is not None and x > 0 for x in [v, i, r, p])
    if provided < 2:
        return {"error": "Please provide at least two positive non-zero parameters (V, I, R, or P)."}

    if v is not None and i is not None:
        r = v / i
        p = v * i
        steps.append(f"R = V / I = {v} / {i} = {r:.4f} Ω")
        steps.append(f"P = V * I = {v} * {i} = {p:.4f} W")
    elif v is not None and r is not None:
        i = v / r
        p = (v ** 2) / r
        steps.append(f"I = V / R = {v} / {r} = {i:.4e} A")
        steps.append(f"P = V^2 / R = {v}^2 / {r} = {p:.4f} W")
    elif v is not None and p is not None:
        i = p / v
        r = (v ** 2) / p
        steps.append(f"I = P / V = {p} / {v} = {i:.4e} A")
        steps.append(f"R = V^2 / P = {v}^2 / {p} = {r:.4f} Ω")
    elif i is not None and r is not None:
        v = i * r
        p = (i ** 2) * r
        steps.append(f"V = I * R = {i} * {r} = {v:.4f} V")
        steps.append(f"P = I^2 * R = ({i})^2 * {r} = {p:.4f} W")
    elif i is not None and p is not None:
        v = p / i
        r = p / (i ** 2)
        steps.append(f"V = P / I = {p} / {i} = {v:.4f} V")
        steps.append(f"R = P / I^2 = {p} / ({i})^2 = {r:.4f} Ω")
    elif r is not None and p is not None:
        v = math.sqrt(p * r)
        i = math.sqrt(p / r)
        steps.append(f"V = sqrt(P * R) = sqrt({p} * {r}) = {v:.4f} V")
        steps.append(f"I = sqrt(P / R) = sqrt({p} / {r}) = {i:.4e} A")

    return {
        "success": True,
        "voltage_V": round(v, 6) if v else None,
        "current_A": round(i, 6) if i else None,
        "resistance_Ohm": round(r, 6) if r else None,
        "power_W": round(p, 6) if p else None,
        "power_mW": round(p * 1000, 3) if p else None,
        "steps": steps,
        "formula": "V = I \\cdot R, \\quad P = V \\cdot I = I^2 R = \\frac{V^2}{R}"
    }


def calculate_voltage_divider(
    vin: float,
    r1: float,
    r2: float,
    r_load: Optional[float] = None
) -> Dict[str, Any]:
    """
    Voltage Divider Rule: Vout = Vin * (R2 / (R1 + R2))
    Accounts for optional load resistor in parallel with R2.
    """
    if r1 <= 0 or r2 <= 0:
        return {"error": "Resistances R1 and R2 must be strictly positive."}
    if r_load is not None and r_load <= 0:
        return {"error": "Load resistance must be positive."}

    steps = []
    r2_effective = r2
    if r_load is not None:
        r2_effective = (r2 * r_load) / (r2 + r_load)
        steps.append(f"Effective bottom resistance: R_{{2,eff}} = R_2 \\parallel R_L = \\frac{{{r2} \\times {r_load}}}{{{r2} + {r_load}}} = {r2_effective:.3f} \\,\\Omega")

    ratio = r2_effective / (r1 + r2_effective)
    vout = vin * ratio
    itotal = vin / (r1 + r2_effective)
    p_r1 = (itotal ** 2) * r1
    p_r2 = (vout ** 2) / r2

    steps.append(f"Division ratio: \\frac{{R_2}}{{R_1 + R_2}} = {ratio:.4f}")
    steps.append(f"Output Voltage: V_{{out}} = V_{{in}} \\times {ratio:.4f} = {vin} \\times {ratio:.4f} = {vout:.4f} \\text{{ V}}")
    steps.append(f"Quiescent Current: I = \\frac{{V_{{in}}}}{{R_1 + R_2}} = {itotal*1000:.3f} \\text{{ mA}}")

    return {
        "success": True,
        "vout_V": round(vout, 4),
        "division_ratio": round(ratio, 4),
        "current_mA": round(itotal * 1000, 4),
        "power_r1_mW": round(p_r1 * 1000, 4),
        "power_r2_mW": round(p_r2 * 1000, 4),
        "steps": steps,
        "formula": "V_{out} = V_{in} \\cdot \\frac{R_2}{R_1 + R_2}"
    }


def calculate_current_divider(
    itotal: float,
    r1: float,
    r2: float
) -> Dict[str, Any]:
    """
    Current Divider Rule:
    I1 = Itotal * (R2 / (R1 + R2))
    I2 = Itotal * (R1 / (R1 + R2))
    """
    if r1 <= 0 or r2 <= 0:
        return {"error": "Resistances must be positive."}

    r_eq = (r1 * r2) / (r1 + r2)
    i1 = itotal * (r2 / (r1 + r2))
    i2 = itotal * (r1 / (r1 + r2))
    v_drop = itotal * r_eq

    steps = [
        f"Parallel equivalent resistance: R_{{eq}} = \\frac{{R_1 R_2}}{{R_1 + R_2}} = {r_eq:.3f} \\,\\Omega",
        f"Branch 1 current: I_1 = I_{{total}} \\times \\frac{{R_2}}{{R_1 + R_2}} = {itotal} \\times \\frac{{{r2}}}{{{r1 + r2}}} = {i1:.4f} \\text{{ A}}",
        f"Branch 2 current: I_2 = I_{{total}} \\times \\frac{{R_1}}{{R_1 + R_2}} = {itotal} \\times \\frac{{{r1}}}{{{r1 + r2}}} = {i2:.4f} \\text{{ A}}",
        f"Voltage across parallel pair: V = I_{{total}} \\cdot R_{{eq}} = {v_drop:.4f} \\text{{ V}}"
    ]

    return {
        "success": True,
        "i1_A": round(i1, 6),
        "i2_A": round(i2, 6),
        "r_parallel_Ohm": round(r_eq, 4),
        "voltage_drop_V": round(v_drop, 4),
        "steps": steps,
        "formula": "I_1 = I_{total} \\frac{R_2}{R_1 + R_2}, \\quad I_2 = I_{total} \\frac{R_1}{R_1 + R_2}"
    }


def calculate_rlc(
    resistance: float,
    inductance: float,
    capacitance: float,
    frequency: Optional[float] = None,
    topology: str = "series"
) -> Dict[str, Any]:
    """
    Calculates RLC circuit resonance, Quality factor, and complex impedance at frequency f.
    """
    if inductance <= 0 or capacitance <= 0:
        return {"error": "Inductance and Capacitance must be strictly positive."}
    
    omega_0 = 1.0 / math.sqrt(inductance * capacitance)
    f_0 = omega_0 / (2.0 * math.pi)
    z_0 = math.sqrt(inductance / capacitance)

    if resistance > 0:
        if topology == "series":
            q_factor = z_0 / resistance
            bw = f_0 / q_factor if q_factor > 0 else 0
        else:
            q_factor = resistance / z_0
            bw = f_0 / q_factor if q_factor > 0 else 0
    else:
        q_factor = float("inf")
        bw = 0.0

    steps = [
        f"Angular resonant frequency: \\omega_0 = \\frac{{1}}{{\\sqrt{{L \\cdot C}}}} = {omega_0:.3e} \\text{{ rad/s}}",
        f"Cyclic resonant frequency: f_0 = \\frac{{\\omega_0}}{{2\\pi}} = {f_0:.3f} \\text{{ Hz}} ({f_0/1e3:.3f} \\text{{ kHz}})",
        f"Characteristic impedance: Z_0 = \\sqrt{{\\frac{{L}}{{C}}}} = {z_0:.3f} \\,\\Omega",
        f"Quality Factor Q ({topology}): Q = {q_factor:.3f}",
        f"Bandwidth: \\Delta f = \\frac{{f_0}}{{Q}} = {bw:.3f} \\text{{ Hz}}"
    ]

    result: Dict[str, Any] = {
        "success": True,
        "topology": topology,
        "f0_Hz": round(f_0, 4),
        "f0_kHz": round(f_0 / 1e3, 4),
        "f0_MHz": round(f_0 / 1e6, 6),
        "omega0_rad_s": round(omega_0, 4),
        "characteristic_impedance_Ohm": round(z_0, 4),
        "q_factor": round(q_factor, 4) if q_factor != float("inf") else "inf",
        "bandwidth_Hz": round(bw, 4),
        "steps": steps
    }

    if frequency and frequency > 0:
        omega = 2.0 * math.pi * frequency
        xl = omega * inductance
        xc = 1.0 / (omega * capacitance)

        if topology == "series":
            reactance_x = xl - xc
            z_complex = complex(resistance, reactance_x)
            z_mag = abs(z_complex)
            z_phase_deg = math.degrees(math.atan2(reactance_x, resistance))
        else:
            y_real = 1.0 / resistance if resistance > 0 else 0.0
            y_imag = (omega * capacitance) - (1.0 / (omega * inductance))
            y_complex = complex(y_real, y_imag)
            z_complex = 1.0 / y_complex if abs(y_complex) > 0 else complex(float("inf"), 0)
            z_mag = abs(z_complex)
            z_phase_deg = math.degrees(math.atan2(z_complex.imag, z_complex.real))

        result["operating_frequency_Hz"] = frequency
        result["xl_inductive_reactance_Ohm"] = round(xl, 4)
        result["xc_capacitive_reactance_Ohm"] = round(xc, 4)
        result["impedance_magnitude_Ohm"] = round(z_mag, 4)
        result["impedance_phase_deg"] = round(z_phase_deg, 2)
        result["impedance_nature"] = "Resistive" if abs(xl - xc) < 1e-6 else ("Inductive" if xl > xc else "Capacitive")

    return result


def calculate_transient_rc_rl(
    circuit_type: str = "rc",
    v_initial: float = 0.0,
    v_final: float = 10.0,
    r: float = 1000.0,
    c: Optional[float] = 1e-6,
    l: Optional[float] = None,
    t: float = 0.001
) -> Dict[str, Any]:
    """
    RC / RL Step/Natural Transient Response:
    v(t) = v_final + (v_initial - v_final) * exp(-t / tau)
    tau = R*C for RC, or L/R for RL
    """
    if r <= 0:
        return {"error": "Resistance must be strictly positive."}

    if circuit_type.lower() == "rc":
        if c is None or c <= 0:
            return {"error": "Capacitance C must be provided and positive."}
        tau = r * c
        tau_unit = "s"
        formula_str = "v_C(t) = V_f + (V_i - V_f) e^{-t / RC}"
    else:
        if l is None or l <= 0:
            return {"error": "Inductance L must be provided and positive."}
        tau = l / r
        tau_unit = "s"
        formula_str = "i_L(t) = I_f + (I_i - I_f) e^{-t / (L/R)}"

    val_at_t = v_final + (v_initial - v_final) * math.exp(-t / tau)
    percentage = (1 - math.exp(-t / tau)) * 100 if abs(v_final - v_initial) > 0 else 100.0

    steps = [
        f"Time constant: \\tau = {tau:.4e} \\text{{ {tau_unit}}} ({tau*1000:.3f} \\text{{ ms}})",
        f"5-Tau settling time: 5\\tau = {5*tau:.4e} \\text{{ s}} ({5*tau*1000:.3f} \\text{{ ms}})",
        f"Response equation: {formula_str}",
        f"At t = {t*1000:.3f} ms: v(t) = {v_final} + ({v_initial} - {v_final}) \\cdot e^{{-{t}/{tau:.4e}}} = {val_at_t:.4f}",
        f"Transition progress: {percentage:.1f}% towards final value"
    ]

    return {
        "success": True,
        "circuit_type": circuit_type.upper(),
        "tau_seconds": round(tau, 6),
        "tau_ms": round(tau * 1000, 4),
        "settling_time_5tau_ms": round(5 * tau * 1000, 4),
        "value_at_t": round(val_at_t, 4),
        "percentage_complete": round(percentage, 2),
        "steps": steps
    }


# ==========================================
# MODULE 2: ANALOG ELECTRONICS
# ==========================================

def calculate_bjt_bias(
    vcc: float = 12.0,
    vbe: float = 0.7,
    rb: float = 300000.0,
    rc: float = 2000.0,
    re: float = 500.0,
    beta: float = 100.0
) -> Dict[str, Any]:
    """
    BJT Common Emitter with Emitter Degeneration DC Bias Point:
    IB = (VCC - VBE) / (RB + (beta + 1)*RE)
    IC = beta * IB, IE = (beta + 1) * IB
    VCE = VCC - IC*RC - IE*RE
    """
    if vcc <= vbe:
        return {"error": "VCC must be greater than VBE (0.7V)."}
    if rb < 0 or rc < 0 or re < 0:
        return {"error": "Resistances cannot be negative."}

    denom = rb + (beta + 1.0) * re
    ib = (vcc - vbe) / denom if denom > 0 else 0.0
    ic_active = beta * ib
    ie_active = (beta + 1.0) * ib
    vce_active = vcc - (ic_active * rc) - (ie_active * re)

    if vce_active > 0.2:
        region = "Active"
        ic = ic_active
        ie = ie_active
        vce = vce_active
        vc = vcc - (ic * rc)
        ve = ie * re
        vb = vbe + ve
        steps = [
            f"Base Current: I_B = \\frac{{V_{{CC}} - V_{{BE}}}}{{R_B + (\\beta + 1)R_E}} = \\frac{{{vcc} - {vbe}}}{{{rb} + ({beta+1}) \\times {re}}} = {ib*1e6:.3f} \\,\\mu\\text{{A}}",
            f"Collector Current: I_C = \\beta I_B = {beta} \\times {ib*1e6:.3f} \\,\\mu\\text{{A}} = {ic*1000:.3f} \\text{{ mA}}",
            f"Emitter Current: I_E = (\\beta + 1) I_B = {ie*1000:.3f} \\text{{ mA}}",
            f"Collector-Emitter Voltage: V_{{CE}} = V_{{CC}} - I_C R_C - I_E R_E = {vce:.3f} \\text{{ V}}",
            f"Operating Mode: {region} (V_{{CE}} = {vce:.2f}\\text{{ V}} > 0.2\\text{{ V}})"
        ]
    else:
        region = "Saturation"
        vce = 0.2
        r_total = rc + re
        ic = max(0.0, (vcc - 0.2) / r_total) if r_total > 0 else 0.0
        ie = ic + ib
        ve = ie * re
        vc = ve + 0.2
        vb = ve + vbe
        steps = [
            f"Base Current: I_B = \\frac{{V_{{CC}} - V_{{BE}}}}{{R_B + (\\beta + 1)R_E}} = {ib*1e6:.3f} \\,\\mu\\text{{A}}",
            f"Active check V_{{CE,active}} = {vce_active:.3f} \\text{{ V}} \\le 0.2 \\text{{ V}} (Transistor enters Saturation)",
            f"Collector-Emitter Voltage clamped: V_{{CE,sat}} \\approx 0.200 \\text{{ V}}",
            f"Saturation Collector Current: I_{{C,sat}} \\approx \\frac{{V_{{CC}} - V_{{CE,sat}}}}{{R_C + R_E}} = {ic*1000:.3f} \\text{{ mA}}",
            f"Operating Mode: {region} (Forced \\beta_{{forced}} = \\frac{{I_C}}{{I_B}} = {ic/ib if ib > 0 else 0:.1f} < \\beta)"
        ]

    return {
        "success": True,
        "ib_uA": round(ib * 1e6, 3),
        "ic_mA": round(ic * 1000, 3),
        "ie_mA": round(ie * 1000, 3),
        "vce_V": round(vce, 3),
        "vc_V": round(vc, 3),
        "ve_V": round(ve, 3),
        "vb_V": round(vb, 3),
        "operating_region": region,
        "steps": steps
    }


def calculate_555_timer_astable(
    ra_ohm: float = 10000.0,
    rb_ohm: float = 10000.0,
    c_farad: float = 1e-7
) -> Dict[str, Any]:
    """
    555 Timer in Astable Multivibrator Mode:
    T_high = 0.693 * (RA + RB) * C
    T_low = 0.693 * RB * C
    f = 1.44 / ((RA + 2*RB) * C)
    Duty Cycle = (RA + RB) / (RA + 2*RB) * 100%
    """
    if ra_ohm <= 0 or rb_ohm <= 0 or c_farad <= 0:
        return {"error": "Component values must be positive non-zero."}

    t_high = 0.693 * (ra_ohm + rb_ohm) * c_farad
    t_low = 0.693 * rb_ohm * c_farad
    period = t_high + t_low
    frequency = 1.44 / ((ra_ohm + 2.0 * rb_ohm) * c_farad)
    duty_cycle = (ra_ohm + rb_ohm) / (ra_ohm + 2.0 * rb_ohm) * 100.0

    steps = [
        f"Charge time (Output High): t_{{high}} = 0.693(R_A + R_B)C = 0.693({ra_ohm} + {rb_ohm})({c_farad:.2e}) = {t_high*1000:.3f} \\text{{ ms}}",
        f"Discharge time (Output Low): t_{{low}} = 0.693(R_B)C = 0.693({rb_ohm})({c_farad:.2e}) = {t_low*1000:.3f} \\text{{ ms}}",
        f"Total period: T = t_{{high}} + t_{{low}} = {period*1000:.3f} \\text{{ ms}}",
        f"Oscillation frequency: f = \\frac{{1.44}}{{(R_A + 2 R_B) C}} = {frequency:.2f} \\text{{ Hz}}",
        f"Duty cycle: D = \\frac{{R_A + R_B}}{{R_A + 2 R_B}} \\times 100\\% = {duty_cycle:.2f}\\%"
    ]

    return {
        "success": True,
        "frequency_Hz": round(frequency, 2),
        "period_ms": round(period * 1000, 3),
        "t_high_ms": round(t_high * 1000, 3),
        "t_low_ms": round(t_low * 1000, 3),
        "duty_cycle_percent": round(duty_cycle, 2),
        "steps": steps
    }


def calculate_filter_cutoff(
    filter_type: str = "rc_lowpass",
    r: float = 1000.0,
    c: Optional[float] = None,
    l: Optional[float] = None,
    target_frequency: Optional[float] = None
) -> Dict[str, Any]:
    """
    Passive RC/RL Cutoff frequency.
    """
    steps = []
    fc = None

    if filter_type in ["rc_lowpass", "rc_highpass"]:
        if c is not None and c > 0:
            fc = 1.0 / (2.0 * math.pi * r * c)
            steps.append(f"Cut-off frequency: f_c = \\frac{{1}}{{2\\pi R C}} = \\frac{{1}}{{2\\pi \\times {r} \\times {c:.3e}}} = {fc:.3f} \\text{{ Hz}}")
        elif target_frequency is not None and target_frequency > 0:
            c = 1.0 / (2.0 * math.pi * r * target_frequency)
            fc = target_frequency
            steps.append(f"Required Capacitance: C = \\frac{{1}}{{2\\pi R f_c}} = {c:.3e} \\text{{ F}} ({c*1e9:.2f} \\text{{ nF}})")
        else:
            return {"error": "Provide either C or target_frequency."}

    elif filter_type in ["rl_lowpass", "rl_highpass"]:
        if l is not None and l > 0:
            fc = r / (2.0 * math.pi * l)
            steps.append(f"Cut-off frequency: f_c = \\frac{{R}}{{2\\pi L}} = \\frac{{{r}}}{{2\\pi \\times {l:.3e}}} = {fc:.3f} \\text{{ Hz}}")
        elif target_frequency is not None and target_frequency > 0:
            l = r / (2.0 * math.pi * target_frequency)
            fc = target_frequency
            steps.append(f"Required Inductance: L = \\frac{{R}}{{2\\pi f_c}} = {l:.3e} \\text{{ H}} ({l*1e3:.2f} \\text{{ mH}})")
        else:
            return {"error": "Provide either L or target_frequency."}

    freqs = np.logspace(np.log10(max(fc * 0.01, 1)), np.log10(fc * 100), 20)
    mag_db = []
    for f in freqs:
        ratio = f / fc
        if "lowpass" in filter_type:
            h_mag = 1.0 / math.sqrt(1 + ratio**2)
        else:
            h_mag = ratio / math.sqrt(1 + ratio**2)
        mag_db.append(round(20 * math.log10(h_mag), 2))

    return {
        "success": True,
        "filter_type": filter_type,
        "cutoff_frequency_Hz": round(fc, 3),
        "cutoff_frequency_kHz": round(fc / 1e3, 3),
        "attenuation_at_cutoff_dB": -3.01,
        "roll_off_rate": "-20 dB/decade (-6 dB/octave) 1st order",
        "resistance_Ohm": r,
        "capacitance_F": c,
        "inductance_H": l,
        "steps": steps,
        "bode_preview": {
            "frequencies_Hz": [round(float(f), 2) for f in freqs[::3]],
            "magnitude_dB": mag_db[::3]
        }
    }


def calculate_opamp(
    topology: str,
    rf: float,
    rin: float,
    vin: float = 1.0,
    gbw_hz: Optional[float] = None
) -> Dict[str, Any]:
    """
    Op-Amp Closed-Loop Gain and Bandwidth.
    """
    if rin <= 0 or rf < 0:
        return {"error": "Resistances must be positive (Rin > 0, Rf >= 0)."}

    steps = []
    if topology == "inverting":
        gain = -(rf / rin)
        steps.append(f"Inverting Voltage Gain: A_v = -\\frac{{R_f}}{{R_{{in}}}} = -\\frac{{{rf}}}{{{rin}}} = {gain:.4f}")
    elif topology == "non_inverting":
        gain = 1.0 + (rf / rin)
        steps.append(f"Non-Inverting Voltage Gain: A_v = 1 + \\frac{{R_f}}{{R_1}} = 1 + \\frac{{{rf}}}{{{rin}}} = {gain:.4f}")
    elif topology == "follower":
        gain = 1.0
        steps.append("Buffer / Follower Gain: A_v = 1.0 (Unity Gain)")
    else:
        return {"error": f"Unknown topology {topology}. Choose inverting, non_inverting, or follower."}

    vout = gain * vin
    steps.append(f"Output Voltage: V_{{out}} = A_v \\times V_{{in}} = {gain:.4f} \\times {vin} = {vout:.4f} \\text{{ V}}")
    gain_db = 20.0 * math.log10(abs(gain)) if abs(gain) > 0 else -100.0

    bandwidth_3db = None
    if gbw_hz and gbw_hz > 0:
        noise_gain = 1.0 + (rf / rin) if topology == "inverting" else gain
        bandwidth_3db = gbw_hz / noise_gain
        steps.append(f"3dB Bandwidth: f_{{3dB}} = \\frac{{GBW}}{{A_{{noise}}}} = \\frac{{{gbw_hz:.3e}}}{{{noise_gain:.3f}}} = {bandwidth_3db:.3f} \\text{{ Hz}}")

    return {
        "success": True,
        "topology": topology,
        "voltage_gain": round(gain, 4),
        "voltage_gain_dB": round(gain_db, 2),
        "vin_V": vin,
        "vout_V": round(vout, 4),
        "bandwidth_3dB_Hz": round(bandwidth_3db, 2) if bandwidth_3db else None,
        "steps": steps
    }


# ==========================================
# MODULE 3: DIGITAL ELECTRONICS
# ==========================================

def calculate_number_base_conversion(
    value_str: str,
    from_base: int = 10
) -> Dict[str, Any]:
    """
    Converts numbers across Binary, Decimal, Hexadecimal, and Octal.
    Also provides 8-bit and 16-bit 2's complement representation.
    """
    clean_str = value_str.strip()
    try:
        val_int = int(clean_str, from_base)
    except ValueError:
        return {"error": f"Invalid string '{clean_str}' for base {from_base}."}

    val_bin = bin(val_int)
    val_hex = hex(val_int).upper()
    val_oct = oct(val_int)

    # 8-bit two's complement if in range
    twos_comp_8bit = None
    if -128 <= val_int <= 255:
        twos_8 = val_int & 0xFF
        twos_comp_8bit = f"{twos_8:08b}"

    steps = [
        f"Decimal representation: {val_int}",
        f"Binary representation: {val_bin}",
        f"Hexadecimal representation: {val_hex}",
        f"Octal representation: {val_oct}",
    ]
    if twos_comp_8bit:
        steps.append(f"8-bit binary pattern: {twos_comp_8bit}")

    return {
        "success": True,
        "decimal": val_int,
        "binary": val_bin,
        "hexadecimal": val_hex,
        "octal": val_oct,
        "twos_complement_8bit": twos_comp_8bit,
        "steps": steps
    }


def calculate_timing_slack(
    t_clk_period_ns: float = 10.0,
    t_cq_ns: float = 1.0,
    t_comb_max_ns: float = 6.0,
    t_comb_min_ns: float = 1.5,
    t_setup_ns: float = 1.0,
    t_hold_ns: float = 0.5,
    clock_skew_ns: float = 0.2
) -> Dict[str, Any]:
    """
    Digital synchronous timing analysis:
    Setup Slack = T_clk + T_skew - (T_cq + T_comb_max + T_setup)
    Hold Slack = (T_cq + T_comb_min) - (T_hold + T_skew)
    Max Frequency = 1 / (T_cq + T_comb_max + T_setup)
    """
    # Setup constraint
    required_setup_time = t_cq_ns + t_comb_max_ns + t_setup_ns
    setup_slack = (t_clk_period_ns + clock_skew_ns) - required_setup_time
    max_freq_mhz = 1000.0 / required_setup_time if required_setup_time > 0 else 0.0

    # Hold constraint
    arrival_hold_time = t_cq_ns + t_comb_min_ns
    required_hold_time = t_hold_ns + clock_skew_ns
    hold_slack = arrival_hold_time - required_hold_time

    steps = [
        f"Setup arrival time: t_{{arr}} = t_{{cq}} + t_{{comb,max}} + t_{{setup}} = {t_cq_ns} + {t_comb_max_ns} + {t_setup_ns} = {required_setup_time:.3f} \\text{{ ns}}",
        f"Setup Slack: S_{{setup}} = (T_{{clk}} + T_{{skew}}) - t_{{arr}} = ({t_clk_period_ns} + {clock_skew_ns}) - {required_setup_time:.3f} = {setup_slack:.3f} \\text{{ ns}}",
        f"Hold Slack: S_{{hold}} = (t_{{cq}} + t_{{comb,min}}) - (t_{{hold}} + T_{{skew}}) = ({t_cq_ns} + {t_comb_min_ns}) - ({t_hold_ns} + {clock_skew_ns}) = {hold_slack:.3f} \\text{{ ns}}",
        f"Maximum operating frequency: f_{{max}} = \\frac{{1}}{{t_{{cq}} + t_{{comb,max}} + t_{{setup}}}} = {max_freq_mhz:.2f} \\text{{ MHz}}"
    ]

    return {
        "success": True,
        "setup_slack_ns": round(setup_slack, 3),
        "hold_slack_ns": round(hold_slack, 3),
        "max_frequency_MHz": round(max_freq_mhz, 2),
        "setup_violation": setup_slack < 0,
        "hold_violation": hold_slack < 0,
        "timing_status": "Met" if setup_slack >= 0 and hold_slack >= 0 else "Violated",
        "steps": steps
    }


# ==========================================
# MODULE 5: VLSI & SEMICONDUCTORS
# ==========================================

def calculate_cmos_delay(
    v_dd: float = 1.2,
    c_load_ff: float = 10.0,
    r_eq_nmos_kohm: float = 1.5,
    mobility_ratio_pn: float = 2.5
) -> Dict[str, Any]:
    """
    CMOS Inverter propagation delay (Elmore RC model).
    """
    c_load = c_load_ff * 1e-15
    rn = r_eq_nmos_kohm * 1e3
    rp = rn * mobility_ratio_pn

    t_phl = 0.69 * rn * c_load
    t_plh = 0.69 * rp * c_load
    t_pd = (t_phl + t_plh) / 2.0

    steps = [
        f"NMOS discharge delay: t_{{pHL}} = 0.69 \\cdot R_n \\cdot C_L = 0.69 \\times {rn} \\times {c_load:.2e} = {t_phl*1e12:.3f} \\text{{ ps}}",
        f"PMOS charge delay: t_{{pLH}} = 0.69 \\cdot R_p \\cdot C_L = 0.69 \\times {rp} \\times {c_load:.2e} = {t_plh*1e12:.3f} \\text{{ ps}}",
        f"Average propagation delay: t_{{pd}} = \\frac{{t_{{pHL}} + t_{{pLH}}}}{{2}} = {t_pd*1e12:.3f} \\text{{ ps}}"
    ]

    return {
        "success": True,
        "t_phl_ps": round(t_phl * 1e12, 3),
        "t_plh_ps": round(t_plh * 1e12, 3),
        "t_pd_avg_ps": round(t_pd * 1e12, 3),
        "recommended_wp_wn_ratio": round(mobility_ratio_pn, 2),
        "steps": steps
    }


# ==========================================
# MODULE 6: SIGNALS AND SYSTEMS
# ==========================================

def calculate_fir_filter_taps(
    num_taps: int = 15,
    cutoff_normalized: float = 0.25,
    window_type: str = "hamming"
) -> Dict[str, Any]:
    """
    Generates exact linear-phase FIR low-pass filter coefficients using windowed sinc method.
    cutoff_normalized: 0 to 0.5 (where 0.5 is Nyquist).
    """
    if num_taps < 3 or num_taps % 2 == 0:
        num_taps = num_taps + 1 if num_taps % 2 == 0 else num_taps  # Ensure odd length for Type I linear phase

    m = (num_taps - 1) / 2.0
    n = np.arange(num_taps)

    # Ideal sinc impulse response
    h_ideal = 2.0 * cutoff_normalized * np.sinc(2.0 * cutoff_normalized * (n - m))

    # Window function
    if window_type.lower() == "hanning":
        w = 0.5 - 0.5 * np.cos(2.0 * np.pi * n / (num_taps - 1))
    elif window_type.lower() == "blackman":
        w = 0.42 - 0.5 * np.cos(2.0 * np.pi * n / (num_taps - 1)) + 0.08 * np.cos(4.0 * np.pi * n / (num_taps - 1))
    else:  # Hamming default
        w = 0.54 - 0.46 * np.cos(2.0 * np.pi * n / (num_taps - 1))

    h = h_ideal * w
    h = h / np.sum(h)  # Normalize to unity DC gain

    steps = [
        f"Filter Order: N = {num_taps - 1} ({num_taps} taps, symmetric Type-I FIR)",
        f"Cutoff frequency: \\omega_c = {cutoff_normalized * 2}\\pi \\text{{ rad/sample}} (normalized)",
        f"Window applied: {window_type.capitalize()} window with -53 dB sidelobe suppression",
        f"Center tap weight h[{int(m)}]: {h[int(m)]:.5f}",
        "Unity DC gain normalization applied: \\sum h[n] = 1.0"
    ]

    return {
        "success": True,
        "num_taps": num_taps,
        "window_type": window_type,
        "coefficients": [round(float(x), 6) for x in h],
        "center_tap": round(float(h[int(m)]), 6),
        "steps": steps
    }


# ==========================================
# MODULE 8: ANTENNAS & RF
# ==========================================

def calculate_vswr_and_return_loss(
    reflection_coeff_mag: Optional[float] = None,
    vswr: Optional[float] = None,
    return_loss_db: Optional[float] = None,
    z_load_ohm: Optional[float] = None,
    z0_ohm: float = 50.0
) -> Dict[str, Any]:
    """
    RF Transmission Line & S11 Parameters:
    gamma = |(ZL - Z0)/(ZL + Z0)|
    VSWR = (1 + gamma) / (1 - gamma)
    Return Loss (dB) = -20 * log10(gamma)
    Mismatch Loss (dB) = -10 * log10(1 - gamma^2)
    """
    gamma = reflection_coeff_mag
    steps = []

    if z_load_ohm is not None:
        gamma = abs(z_load_ohm - z0_ohm) / (z_load_ohm + z0_ohm)
        steps.append(f"Reflection Coefficient: |\\Gamma| = \\left|\\frac{{Z_L - Z_0}}{{Z_L + Z_0}}\\right| = \\left|\\frac{{{z_load_ohm} - {z0_ohm}}}{{{z_load_ohm} + {z0_ohm}}}\\right| = {gamma:.4f}")
    elif vswr is not None and vswr >= 1.0:
        gamma = (vswr - 1.0) / (vswr + 1.0)
        steps.append(f"From VSWR: |\\Gamma| = \\frac{{\\text{{VSWR}} - 1}}{{\\text{{VSWR}} + 1}} = \\frac{{{vswr} - 1}}{{{vswr} + 1}} = {gamma:.4f}")
    elif return_loss_db is not None and return_loss_db > 0:
        gamma = 10.0 ** (-return_loss_db / 20.0)
        steps.append(f"From Return Loss: |\\Gamma| = 10^{{-\\text{{RL}}/20}} = 10^{{-{return_loss_db}/20}} = {gamma:.4f}")

    if gamma is None or gamma < 0 or gamma >= 1.0:
        return {"error": "Reflection coefficient must satisfy 0 <= |gamma| < 1."}

    calculated_vswr = (1.0 + gamma) / (1.0 - gamma) if gamma < 0.999 else 999.0
    rl_db = -20.0 * math.log10(gamma) if gamma > 1e-6 else 60.0
    mismatch_loss_db = -10.0 * math.log10(1.0 - gamma**2) if gamma < 0.999 else 30.0

    steps.append(f"VSWR: \\text{{VSWR}} = \\frac{{1 + |\\Gamma|}}{{1 - |\\Gamma|}} = {calculated_vswr:.3f}")
    steps.append(f"Return Loss: \\text{{RL}} = -20\\log_{{10}}(|\\Gamma|) = {rl_db:.2f} \\text{{ dB}}")
    steps.append(f"Mismatch Loss: \\text{{ML}} = -10\\log_{{10}}(1 - |\\Gamma|^2) = {mismatch_loss_db:.3f} \\text{{ dB}}")

    return {
        "success": True,
        "reflection_coefficient": round(gamma, 4),
        "vswr": round(calculated_vswr, 3),
        "return_loss_dB": round(rl_db, 2),
        "mismatch_loss_dB": round(mismatch_loss_db, 3),
        "match_quality": "Excellent (<1.2 VSWR)" if calculated_vswr < 1.2 else ("Acceptable (<2.0 VSWR)" if calculated_vswr < 2.0 else "Poor/Reflective"),
        "steps": steps
    }


def calculate_friis_link_budget(
    frequency_hz: float,
    distance_m: float,
    tx_power_dbm: float,
    tx_gain_dbi: float = 0.0,
    rx_gain_dbi: float = 0.0,
    rx_sensitivity_dbm: Optional[float] = None
) -> Dict[str, Any]:
    """
    Friis Transmission Equation & RF Link Budget.
    """
    c_light = 299792458.0
    wavelength = c_light / frequency_hz

    fspl_db = 20.0 * math.log10(distance_m) + 20.0 * math.log10(frequency_hz) + 20.0 * math.log10(4.0 * math.pi / c_light)
    rx_power_dbm = tx_power_dbm + tx_gain_dbi + rx_gain_dbi - fspl_db
    rx_power_watts = 10.0 ** ((rx_power_dbm - 30.0) / 10.0)

    fade_margin = None
    if rx_sensitivity_dbm is not None:
        fade_margin = rx_power_dbm - rx_sensitivity_dbm

    steps = [
        f"Wavelength: \\lambda = \\frac{{c}}{{f}} = \\frac{{3 \\times 10^8}}{{{frequency_hz:.3e}}} = {wavelength:.4f} \\text{{ m}}",
        f"Free Space Path Loss: \\text{{FSPL}} = 20\\log_{{10}}\\left(\\frac{{4\\pi d}}{{\\lambda}}\\right) = {fspl_db:.2f} \\text{{ dB}}",
        f"Received Power: P_r = P_t + G_t + G_r - \\text{{FSPL}} = {tx_power_dbm} + {tx_gain_dbi} + {rx_gain_dbi} - {fspl_db:.2f} = {rx_power_dbm:.2f} \\text{{ dBm}}",
    ]
    if fade_margin is not None:
        steps.append(f"Fade Margin: M = P_r - P_{{sens}} = {rx_power_dbm:.2f} - ({rx_sensitivity_dbm}) = {fade_margin:.2f} \\text{{ dB}}")

    return {
        "success": True,
        "frequency_MHz": round(frequency_hz / 1e6, 3),
        "distance_m": distance_m,
        "wavelength_m": round(wavelength, 4),
        "fspl_dB": round(fspl_db, 2),
        "rx_power_dBm": round(rx_power_dbm, 2),
        "rx_power_nW": round(rx_power_watts * 1e9, 4),
        "fade_margin_dB": round(fade_margin, 2) if fade_margin is not None else None,
        "link_status": "Viable (>10dB margin)" if (fade_margin is None or fade_margin > 10.0) else "Degraded/Unstable",
        "steps": steps
    }


def calculate_antenna_directivity(
    theta_1_deg: float,
    theta_2_deg: float,
    efficiency: float = 0.9
) -> Dict[str, Any]:
    """
    Antenna Directivity from Kraus HPBW formula.
    """
    if theta_1_deg <= 0 or theta_2_deg <= 0:
        return {"error": "Beamwidths must be strictly positive."}

    d_approx = 41253.0 / (theta_1_deg * theta_2_deg)
    d_dbi = 10.0 * math.log10(d_approx)
    gain_linear = efficiency * d_approx
    gain_dbi = 10.0 * math.log10(gain_linear)

    steps = [
        f"Kraus Approximation: D \\approx \\frac{{41253}}{{\\Theta_{{1d}} \\times \\Theta_{{2d}}}} = \\frac{{41253}}{{{theta_1_deg} \\times {theta_2_deg}}} = {d_approx:.2f}",
        f"Directivity in dBi: D_{{dBi}} = 10\\log_{{10}}(D) = {d_dbi:.2f} \\text{{ dBi}}",
        f"Antenna Gain: G = \\eta \\times D = {efficiency} \\times {d_approx:.2f} = {gain_linear:.2f}",
        f"Gain in dBi: G_{{dBi}} = 10\\log_{{10}}(G) = {gain_dbi:.2f} \\text{{ dBi}}"
    ]

    return {
        "success": True,
        "hpbw_theta1_deg": theta_1_deg,
        "hpbw_theta2_deg": theta_2_deg,
        "directivity_linear": round(d_approx, 2),
        "directivity_dBi": round(d_dbi, 2),
        "efficiency": efficiency,
        "gain_linear": round(gain_linear, 2),
        "gain_dBi": round(gain_dbi, 2),
        "steps": steps
    }


# ==========================================
# MODULE 9: COMMUNICATION SYSTEMS
# ==========================================

def calculate_shannon_capacity(
    bandwidth_hz: float,
    snr_db: float
) -> Dict[str, Any]:
    """
    Shannon-Hartley Channel Capacity:
    C = B * log2(1 + SNR_linear)
    """
    if bandwidth_hz <= 0:
        return {"error": "Bandwidth must be positive."}

    snr_linear = 10.0 ** (snr_db / 10.0)
    capacity_bps = bandwidth_hz * math.log2(1.0 + snr_linear)
    spectral_efficiency = capacity_bps / bandwidth_hz

    steps = [
        f"Linear SNR: \\text{{SNR}}_{{lin}} = 10^{{\\text{{SNR}}_{{dB}}/10}} = 10^{{{snr_db}/10}} = {snr_linear:.2f}",
        f"Shannon Capacity: C = B \\log_2(1 + \\text{{SNR}}) = {bandwidth_hz/1e6:.2f} \\text{{ MHz}} \\times \\log_2(1 + {snr_linear:.2f}) = {capacity_bps/1e6:.2f} \\text{{ Mbps}}",
        f"Spectral Efficiency: \\eta = \\frac{{C}}{{B}} = {spectral_efficiency:.2f} \\text{{ bps/Hz}}"
    ]

    return {
        "success": True,
        "bandwidth_MHz": round(bandwidth_hz / 1e6, 3),
        "snr_dB": snr_db,
        "snr_linear": round(snr_linear, 2),
        "capacity_bps": round(capacity_bps, 2),
        "capacity_Mbps": round(capacity_bps / 1e6, 3),
        "spectral_efficiency_bps_per_hz": round(spectral_efficiency, 3),
        "steps": steps
    }


def calculate_pcm_snr(
    num_bits: int
) -> Dict[str, Any]:
    """
    PCM Quantization Signal-to-Quantization-Noise Ratio:
    SQNR ≈ 6.02 * N + 1.76 dB (for full-scale sinusoidal input)
    Number of Quantization Levels: L = 2^N
    """
    if num_bits <= 0 or num_bits > 64:
        return {"error": "Number of bits N must be between 1 and 64."}

    levels = 2 ** num_bits
    sqnr_db = 6.02 * num_bits + 1.76

    steps = [
        f"Quantization levels: L = 2^N = 2^{{{num_bits}}} = {levels}",
        f"Signal-to-Quantization Noise: \\text{{SQNR}} = 6.02 N + 1.76 = 6.02({num_bits}) + 1.76 = {sqnr_db:.2f} \\text{{ dB}}",
        "Assumes full-scale sinusoidal input spanning dynamic range."
    ]

    return {
        "success": True,
        "num_bits": num_bits,
        "quantization_levels": levels,
        "sqnr_dB": round(sqnr_db, 2),
        "steps": steps
    }


# ==========================================
# MODULE 12: ENGINEERING MATHEMATICS
# ==========================================

def calculate_complex_arithmetic(
    real: float,
    imag: float
) -> Dict[str, Any]:
    """
    Complex number conversions: Rectangular to Polar & Exponential forms.
    Z = R + jX = |Z| * exp(j * theta)
    """
    c = complex(real, imag)
    magnitude = abs(c)
    phase_rad = math.atan2(imag, real)
    phase_deg = math.degrees(phase_rad)

    steps = [
        f"Rectangular form: Z = {real:.4f} + j({imag:.4f})",
        f"Magnitude: |Z| = \\sqrt{{{real:.2f}^2 + {imag:.2f}^2}} = {magnitude:.4f}",
        f"Phase angle: \\theta = \\arctan\\left(\\frac{{{imag}}}{{{real}}}\\right) = {phase_deg:.2f}^\\circ ({phase_rad:.4f} \\text{{ rad}})",
        f"Polar form: Z = {magnitude:.4f} \\angle {phase_deg:.2f}^\\circ",
        f"Euler exponential: Z = {magnitude:.4f} e^{{j {phase_rad:.4f}}}"
    ]

    return {
        "success": True,
        "real": round(real, 4),
        "imag": round(imag, 4),
        "magnitude": round(magnitude, 4),
        "phase_deg": round(phase_deg, 2),
        "phase_rad": round(phase_rad, 4),
        "steps": steps
    }


def calculate_db_conversion(
    val: float,
    conversion_type: str = "dbm_to_w"
) -> Dict[str, Any]:
    """
    Engineering dB and Unit Conversions:
    - dbm_to_w: dBm -> Watts
    - w_to_dbm: Watts -> dBm
    - ratio_to_db: Linear power ratio -> dB
    - db_to_ratio: dB -> Linear power ratio
    """
    steps = []
    if conversion_type == "dbm_to_w":
        # W = 10^((dBm - 30) / 10)
        p_watts = 10.0 ** ((val - 30.0) / 10.0)
        p_mw = p_watts * 1000.0
        steps.append(f"P(W) = 10^{{({val} - 30)/10}} = {p_watts:.4e} \\text{{ W}} ({p_mw:.3f} \\text{{ mW}})")
        return {"success": True, "input_dBm": val, "power_Watts": p_watts, "power_mW": round(p_mw, 4), "steps": steps}

    elif conversion_type == "w_to_dbm":
        if val <= 0:
            return {"error": "Power must be strictly positive."}
        p_dbm = 10.0 * math.log10(val * 1000.0)
        steps.append(f"P(dBm) = 10\\log_{{10}}({val} \\times 1000) = {p_dbm:.2f} \\text{{ dBm}}")
        return {"success": True, "input_Watts": val, "power_dBm": round(p_dbm, 2), "steps": steps}

    elif conversion_type == "ratio_to_db":
        if val <= 0:
            return {"error": "Ratio must be strictly positive."}
        db = 10.0 * math.log10(val)
        steps.append(f"\\text{{dB}} = 10\\log_{{10}}({val}) = {db:.2f} \\text{{ dB}}")
        return {"success": True, "ratio": val, "value_dB": round(db, 2), "steps": steps}

    elif conversion_type == "db_to_ratio":
        ratio = 10.0 ** (val / 10.0)
        steps.append(f"\\text{{Ratio}} = 10^{{{val}/10}} = {ratio:.4f}")
        return {"success": True, "value_dB": val, "linear_ratio": round(ratio, 4), "steps": steps}

    return {"error": f"Unknown conversion type '{conversion_type}'."}
