"""
CircuitX — Deterministic Engineering Calculation Engine.

Provides high-precision mathematical solvers powered by NumPy and SciPy:
1. Unit Conversion (SI Prefixes, Decibel Power/Voltage, Frequency/Wavelength).
2. Resistor Networks (Series and Parallel equivalent resistance).
3. Ohm's Law and Power (V, I, R, P derivations).
4. Complex Impedance & Phasors (R + jX, polar magnitude & phase).
5. RF & Electromagnetic Wave Propagation (Frequency, Wavelength, Dielectric Media).
6. Antenna Directivity, Gain, Effective Aperture, and Radiation Resistance.
7. Communication Systems (Shannon Channel Capacity, Thermal Noise Floor, PCM SQNR).
8. FIR Filter Design (Windowed Sinc coefficients & Frequency Response spectrum).
"""

import math
from typing import Dict, List, Optional, Any, Union
import numpy as np
from scipy import signal


# Speed of light in vacuum (m/s)
SPEED_OF_LIGHT = 299792458.0
# Boltzmann constant (J/K)
BOLTZMANN_K = 1.380649e-23
# Standard temperature (Kelvin, 290 K ~ 17°C)
T_STANDARD_KELVIN = 290.0


# --- 1. Unit Conversions ---

def parse_si_string(val: Union[str, float, int]) -> float:
    """
    Parses a string with engineering SI prefixes into a standard float.
    '2k' -> 2000.0, '500u' -> 5e-4, '10M' -> 1e7, '100n' -> 1e-7, '15p' -> 1.5e-11
    """
    if isinstance(val, (int, float)):
        return float(val)
    s = str(val).strip().replace("µ", "u").lower()
    multipliers = {
        "p": 1e-12, "n": 1e-9, "u": 1e-6, "m": 1e-3,
        "k": 1e3, "meg": 1e6, "g": 1e9, "t": 1e12
    }
    for suff, mult in multipliers.items():
        if s.endswith(suff):
            return float(s[:-len(suff)]) * mult
    return float(s)


def format_si_value(val: float, unit: str = "") -> str:
    """
    Formats a floating-point number into an engineering-formatted string with SI prefix.
    """
    if abs(val) < 1e-15:
        return f"0.00 {unit}".strip()
    
    abs_v = abs(val)
    sign = "-" if val < 0 else ""
    
    prefixes = [
        (1e12, "T"),
        (1e9, "G"),
        (1e6, "M"),
        (1e3, "k"),
        (1.0, ""),
        (1e-3, "m"),
        (1e-6, "μ"),
        (1e-9, "n"),
        (1e-12, "p"),
    ]
    
    for factor, prefix in prefixes:
        if abs_v >= factor * 0.999:
            scaled = abs_v / factor
            return f"{sign}{scaled:.3f} {prefix}{unit}".strip()
            
    return f"{val:.3e} {unit}".strip()


def convert_units(
    category: str,
    value: float,
    from_unit: str,
    to_unit: str
) -> Dict[str, Any]:
    """
    Converts values between supported engineering units:
    - power: 'w', 'mw', 'dbm', 'dbw'
    - frequency_wavelength: 'hz', 'khz', 'mhz', 'ghz', 'm', 'cm', 'mm'
    - angle: 'deg', 'rad'
    """
    cat = category.lower()
    f_u = from_unit.lower()
    t_u = to_unit.lower()

    if cat == "power":
        # Convert from_unit to Watts
        if f_u == "w":
            p_watts = value
        elif f_u == "mw":
            p_watts = value * 1e-3
        elif f_u == "dbm":
            p_watts = 10.0 ** ((value - 30.0) / 10.0)
        elif f_u == "dbw":
            p_watts = 10.0 ** (value / 10.0)
        else:
            return {"error": f"Unsupported power unit: {from_unit}"}

        # Convert Watts to to_unit
        if t_u == "w":
            result = p_watts
        elif t_u == "mw":
            result = p_watts * 1e3
        elif t_u == "dbm":
            if p_watts <= 0:
                return {"error": "Power in Watts must be positive to convert to dBm."}
            result = 10.0 * math.log10(p_watts * 1e3)
        elif t_u == "dbw":
            if p_watts <= 0:
                return {"error": "Power in Watts must be positive to convert to dBW."}
            result = 10.0 * math.log10(p_watts)
        else:
            return {"error": f"Unsupported power unit: {to_unit}"}

        return {
            "success": True,
            "category": "power",
            "input_value": value,
            "from_unit": from_unit,
            "output_value": round(result, 6),
            "to_unit": to_unit,
            "p_watts": p_watts,
            "formula": "P(dBm) = 10*log10(P(mW)), P(W) = 10^((P(dBm)-30)/10)"
        }

    elif cat == "angle":
        if f_u in ("deg", "degrees"):
            rad = math.radians(value)
            deg = value
        elif f_u in ("rad", "radians"):
            deg = math.degrees(value)
            rad = value
        else:
            return {"error": f"Unsupported angle unit: {from_unit}"}

        res = deg if t_u in ("deg", "degrees") else rad
        return {
            "success": True,
            "category": "angle",
            "input_value": value,
            "from_unit": from_unit,
            "output_value": round(res, 6),
            "to_unit": to_unit
        }

    return {"error": f"Unsupported conversion category: {category}"}


# --- 2. Series & Parallel Networks ---

def calculate_resistor_network(
    topology: str,
    resistors: List[float]
) -> Dict[str, Any]:
    """
    Computes equivalent resistance for series or parallel configurations.
    Example: [1000, 2000] series -> 3000 Ohm
    Example: [1000, 1000] parallel -> 500 Ohm
    """
    if not resistors:
        return {"error": "Must provide at least one resistor value."}
    
    for r in resistors:
        if r <= 0:
            return {"error": f"Resistor values must be strictly positive. Received: {r} Ω"}

    top = topology.lower().strip()
    if top == "series":
        r_eq = sum(resistors)
        formula = "\\sum_{i} R_i"
        steps = [f"R_{{eq}} = {' + '.join([f'{r:g}\\Omega' for r in resistors])} = {r_eq:g} \\,\\Omega"]
    elif top == "parallel":
        recip_sum = sum(1.0 / r for r in resistors)
        r_eq = 1.0 / recip_sum
        formula = "\\left( \\sum_{i} \\frac{1}{R_i} \\right)^{-1}"
        steps = [f"\\frac{{1}}{{R_{{eq}}}} = {' + '.join([f'\\frac{{1}}{{{r:g}}}' for r in resistors])} = {recip_sum:.6e} \\,\\Omega^{{-1}}",
                 f"R_{{eq}} = \\frac{{1}}{{{recip_sum:.6e}}} = {r_eq:g} \\,\\Omega"]
    else:
        return {"error": f"Unsupported topology: '{topology}'. Must be 'series' or 'parallel'."}

    return {
        "success": True,
        "topology": top,
        "num_resistors": len(resistors),
        "resistors": resistors,
        "equivalent_resistance_Ohm": round(r_eq, 6),
        "formatted_equivalent": format_si_value(r_eq, "Ω"),
        "formula": formula,
        "steps": steps
    }


# --- 3. Ohm's Law & Power Verification ---

def calculate_ohms_law_exact(
    voltage: Optional[float] = None,
    current: Optional[float] = None,
    resistance: Optional[float] = None,
    power: Optional[float] = None
) -> Dict[str, Any]:
    """
    Deterministic Ohm's Law solver with exact validation:
    - 10 V across 2 kΩ must produce 5 mA.
    - 12 V across 6 Ω must produce 2 A and 24 W.
    """
    params = {"V": voltage, "I": current, "R": resistance, "P": power}
    given = {k: v for k, v in params.items() if v is not None}

    if len(given) < 2:
        return {"error": "At least two parameters among Voltage (V), Current (I), Resistance (R), and Power (P) are required."}

    v, i, r, p = voltage, current, resistance, power

    # Derive missing variables
    if v is not None and r is not None:
        if r <= 0:
            return {"error": "Resistance must be strictly positive."}
        i = v / r
        p = v * i
    elif v is not None and i is not None:
        if i == 0:
            return {"error": "Current cannot be zero when voltage is specified."}
        r = v / i
        p = v * i
    elif v is not None and p is not None:
        if v == 0:
            return {"error": "Voltage cannot be zero when non-zero power is specified."}
        i = p / v
        r = v / i
    elif i is not None and r is not None:
        if r <= 0:
            return {"error": "Resistance must be strictly positive."}
        v = i * r
        p = (i ** 2) * r
    elif i is not None and p is not None:
        if i == 0:
            return {"error": "Current cannot be zero."}
        v = p / i
        r = v / i
    elif r is not None and p is not None:
        if r <= 0 or p < 0:
            return {"error": "Resistance and Power must be positive."}
        v = math.sqrt(p * r)
        i = v / r

    steps = [
        f"Voltage: V = {v:.6g} \\text{{ V}} ({format_si_value(v, 'V')})",
        f"Current: I = {i:.6g} \\text{{ A}} ({format_si_value(i, 'A')})",
        f"Resistance: R = {r:.6g} \\,\\Omega ({format_si_value(r, 'Ω')})",
        f"Power: P = {p:.6g} \\text{{ W}} ({format_si_value(p, 'W')})"
    ]

    return {
        "success": True,
        "voltage_V": round(v, 6),
        "current_A": round(i, 6),
        "resistance_Ohm": round(r, 6),
        "power_W": round(p, 6),
        "current_mA": round(i * 1000.0, 6),
        "formatted_voltage": format_si_value(v, "V"),
        "formatted_current": format_si_value(i, "A"),
        "formatted_resistance": format_si_value(r, "Ω"),
        "formatted_power": format_si_value(p, "W"),
        "steps": steps
    }


# --- 4. Complex Impedance & Phasors ---

def calculate_complex_impedance(
    resistance: float,
    inductance: float = 0.0,
    capacitance: Optional[float] = None,
    frequency: float = 1000.0,
    topology: str = "series"
) -> Dict[str, Any]:
    """
    Computes total complex impedance Z = R + jX and admittance Y = G + jB:
    Z_mag = |Z|, Z_phase = arg(Z) in degrees.
    """
    if frequency <= 0:
        return {"error": "Operating frequency must be strictly positive."}
    if resistance < 0:
        return {"error": "Resistance cannot be negative."}

    omega = 2.0 * math.pi * frequency
    xl = omega * inductance if inductance > 0 else 0.0
    xc = (1.0 / (omega * capacitance)) if (capacitance is not None and capacitance > 0) else 0.0

    if topology.lower() == "series":
        reactance = xl - xc
        z = complex(resistance, reactance)
    elif topology.lower() == "parallel":
        y_r = 1.0 / resistance if resistance > 0 else 0.0
        y_l = -1.0 / xl if xl > 0 else 0.0
        y_c = 1.0 / xc if xc > 0 else 0.0
        y = complex(y_r, y_c + y_l)
        z = 1.0 / y if abs(y) > 0 else complex(float("inf"), 0.0)
    else:
        return {"error": f"Unsupported topology: '{topology}'. Must be 'series' or 'parallel'."}

    z_mag = abs(z)
    z_phase_rad = math.atan2(z.imag, z.real)
    z_phase_deg = math.degrees(z_phase_rad)

    nature = "Resistive"
    if abs(z.imag) > 1e-6:
        nature = "Inductive" if z.imag > 0 else "Capacitive"

    steps = [
        f"Angular Frequency: \\omega = 2\\pi f = 2\\pi \\times {frequency:g} = {omega:.3e} \\text{{ rad/s}}",
        f"Inductive Reactance: X_L = \\omega L = {xl:.3f} \\,\\Omega",
        f"Capacitive Reactance: X_C = \\frac{{1}}{{\\omega C}} = {xc:.3f} \\,\\Omega",
        f"Net Reactance ({topology}): X = {z.imag:.3f} \\,\\Omega",
        f"Complex Impedance: Z = {z.real:.3f} + j({z.imag:.3f}) \\,\\Omega",
        f"Polar Form: |Z| = {z_mag:.3f} \\,\\Omega, \\quad \\angle Z = {z_phase_deg:.2f}^\\circ"
    ]

    return {
        "success": True,
        "frequency_Hz": frequency,
        "omega_rad_s": round(omega, 4),
        "real_Ohm": round(z.real, 4),
        "imag_Ohm": round(z.imag, 4),
        "magnitude_Ohm": round(z_mag, 4),
        "phase_deg": round(z_phase_deg, 2),
        "phase_rad": round(z_phase_rad, 4),
        "nature": nature,
        "steps": steps
    }


# --- 5. Frequency & Wavelength Solver ---

def calculate_frequency_wavelength(
    frequency: Optional[float] = None,
    wavelength: Optional[float] = None,
    relative_permittivity: float = 1.0
) -> Dict[str, Any]:
    """
    Computes frequency, wavelength, phase velocity, and wave number in dielectric medium:
    v_p = c / sqrt(er)
    lambda = v_p / f
    k = 2*pi / lambda
    """
    if relative_permittivity <= 0:
        return {"error": "Relative permittivity (er) must be strictly positive."}

    v_p = SPEED_OF_LIGHT / math.sqrt(relative_permittivity)

    if frequency is not None and frequency > 0:
        f = frequency
        lam = v_p / f
    elif wavelength is not None and wavelength > 0:
        lam = wavelength
        f = v_p / lam
    else:
        return {"error": "Must provide either positive frequency (Hz) or wavelength (meters)."}

    omega = 2.0 * math.pi * f
    k = 2.0 * math.pi / lam

    steps = [
        f"Phase velocity in medium (\\epsilon_r = {relative_permittivity:.2f}): v_p = \\frac{{c}}{{\\sqrt{{\\epsilon_r}}}} = {v_p:.3e} \\text{{ m/s}}",
        f"Cyclic Frequency: f = {f:.3e} \\text{{ Hz}} ({format_si_value(f, 'Hz')})",
        f"Wavelength: \\lambda = \\frac{{v_p}}{{f}} = {lam:.4f} \\text{{ m}} ({format_si_value(lam, 'm')})",
        f"Wavenumber: k = \\frac{{2\\pi}}{{\\lambda}} = {k:.4f} \\text{{ rad/m}}",
        f"Quarter-wavelength (\\lambda/4): {lam/4.0:.4f} \\text{{ m}} ({format_si_value(lam/4.0, 'm')})"
    ]

    return {
        "success": True,
        "frequency_Hz": round(f, 4),
        "wavelength_m": round(lam, 6),
        "phase_velocity_m_s": round(v_p, 2),
        "wavenumber_rad_m": round(k, 4),
        "quarter_wavelength_m": round(lam / 4.0, 6),
        "relative_permittivity": relative_permittivity,
        "formatted_frequency": format_si_value(f, "Hz"),
        "formatted_wavelength": format_si_value(lam, "m"),
        "steps": steps
    }


# --- 6. Antenna Engineering Calculations ---

def calculate_antenna_properties(
    antenna_type: str = "kraus",
    hpbw_theta_1_deg: Optional[float] = 30.0,
    hpbw_theta_2_deg: Optional[float] = 40.0,
    efficiency: float = 0.9,
    frequency_hz: Optional[float] = 2.4e9,
    dipole_length_m: Optional[float] = None
) -> Dict[str, Any]:
    """
    Computes directivity, gain, effective aperture, and radiation resistance:
    - Kraus: D = 41253 / (theta1 * theta2)
    - Effective Aperture: Ae = (lambda^2 / 4*pi) * Gain
    - Dipole: Half-wave R_rad = 73.1 Ohm, Short dipole R_rad = 80*pi^2 * (L/lambda)^2
    """
    steps = []
    result: Dict[str, Any] = {"success": True, "antenna_type": antenna_type}

    if antenna_type.lower() == "kraus":
        if not hpbw_theta_1_deg or not hpbw_theta_2_deg or hpbw_theta_1_deg <= 0 or hpbw_theta_2_deg <= 0:
            return {"error": "Half-Power Beamwidths (HPBW) must be strictly positive."}

        d_linear = 41253.0 / (hpbw_theta_1_deg * hpbw_theta_2_deg)
        d_dbi = 10.0 * math.log10(d_linear)
        gain_linear = efficiency * d_linear
        gain_dbi = 10.0 * math.log10(gain_linear)

        steps.append(f"Kraus Directivity: D \\approx \\frac{{41253}}{{{hpbw_theta_1_deg}^\\circ \\times {hpbw_theta_2_deg}^\\circ}} = {d_linear:.2f} ({d_dbi:.2f} \\text{{ dBi}})")
        steps.append(f"Antenna Gain (\\eta = {efficiency*100:.1f}\\%): G = \\eta \\cdot D = {gain_linear:.2f} ({gain_dbi:.2f} \\text{{ dBi}})")

        result.update({
            "directivity_linear": round(d_linear, 4),
            "directivity_dBi": round(d_dbi, 2),
            "gain_linear": round(gain_linear, 4),
            "gain_dBi": round(gain_dbi, 2),
            "efficiency": efficiency
        })

        if frequency_hz and frequency_hz > 0:
            lam = SPEED_OF_LIGHT / frequency_hz
            ae = ((lam ** 2) / (4.0 * math.pi)) * gain_linear
            steps.append(f"Wavelength (f = {format_si_value(frequency_hz, 'Hz')}): \\lambda = {lam:.4f} \\text{{ m}}")
            steps.append(f"Effective Aperture: A_e = \\frac{{\\lambda^2}}{{4\\pi}} G = {ae:.4e} \\text{{ m}}^2")
            result["wavelength_m"] = round(lam, 6)
            result["effective_aperture_m2"] = round(ae, 6)

    elif antenna_type.lower() == "half_wave_dipole":
        # Standard ideal half-wave dipole: D = 1.64 (2.15 dBi), R_rad = 73.1 Ohm
        d_linear = 1.64
        d_dbi = 2.15
        gain_linear = efficiency * d_linear
        gain_dbi = 10.0 * math.log10(gain_linear)
        r_rad = 73.13

        steps.append("Ideal Half-Wave Dipole: Directivity D = 1.643 (2.15 dBi)")
        steps.append(f"Radiation Resistance: R_{{rad}} = 73.13 \\,\\Omega")
        steps.append(f"Gain (\\eta = {efficiency*100:.1f}\\%): G = {gain_linear:.2f} ({gain_dbi:.2f} \\text{{ dBi}})")

        result.update({
            "directivity_linear": d_linear,
            "directivity_dBi": d_dbi,
            "gain_linear": round(gain_linear, 4),
            "gain_dBi": round(gain_dbi, 2),
            "radiation_resistance_Ohm": r_rad
        })

    result["steps"] = steps
    return result


# --- 7. Communication Systems Formulas ---

def calculate_shannon_capacity(
    bandwidth_hz: float,
    snr_db: Optional[float] = None,
    snr_linear: Optional[float] = None
) -> Dict[str, Any]:
    """
    Shannon-Hartley channel capacity theorem:
    C = B * log2(1 + SNR)
    Spectral efficiency = C / B in bps/Hz.
    """
    if bandwidth_hz <= 0:
        return {"error": "Bandwidth must be strictly positive."}

    if snr_db is not None:
        snr_lin = 10.0 ** (snr_db / 10.0)
    elif snr_linear is not None and snr_linear >= 0:
        snr_lin = snr_linear
        snr_db = 10.0 * math.log10(snr_lin) if snr_lin > 0 else -100.0
    else:
        return {"error": "Must provide SNR in dB or linear ratio."}

    capacity_bps = bandwidth_hz * math.log2(1.0 + snr_lin)
    spectral_efficiency = capacity_bps / bandwidth_hz

    steps = [
        f"Bandwidth: B = {format_si_value(bandwidth_hz, 'Hz')}",
        f"Signal-to-Noise Ratio: {snr_db:.2f} \\text{{ dB}} \\implies \\text{{SNR}}_{{\\text{{linear}}}} = {snr_lin:.2f}",
        f"Shannon Capacity: C = B \\log_2(1 + \\text{{SNR}}) = {format_si_value(capacity_bps, 'bps')}",
        f"Spectral Efficiency: \\eta = \\frac{{C}}{{B}} = {spectral_efficiency:.3f} \\text{{ bps/Hz}}"
    ]

    return {
        "success": True,
        "bandwidth_Hz": bandwidth_hz,
        "snr_db": round(snr_db, 2),
        "snr_linear": round(snr_lin, 4),
        "capacity_bps": round(capacity_bps, 2),
        "capacity_Mbps": round(capacity_bps / 1e6, 4),
        "spectral_efficiency_bps_hz": round(spectral_efficiency, 4),
        "formatted_capacity": format_si_value(capacity_bps, "bps"),
        "steps": steps
    }


def calculate_thermal_noise_floor(
    bandwidth_hz: float,
    temperature_k: float = 290.0,
    noise_figure_db: float = 0.0
) -> Dict[str, Any]:
    """
    Thermal Noise Floor calculation:
    P_N = k * T * B (in Watts)
    P_N(dBm) = -174 dBm/Hz + 10*log10(B) + NF
    """
    if bandwidth_hz <= 0 or temperature_k <= 0:
        return {"error": "Bandwidth and Temperature must be strictly positive."}

    p_noise_w = BOLTZMANN_K * temperature_k * bandwidth_hz
    p_noise_dbm = 10.0 * math.log10(p_noise_w * 1e3) + noise_figure_db

    steps = [
        f"Thermal Noise Spectral Density: N_0 = k T = {BOLTZMANN_K * temperature_k:.3e} \\text{{ W/Hz}} (-174 \\text{{ dBm/Hz}} at 290 K)",
        f"Channel Bandwidth: B = {format_si_value(bandwidth_hz, 'Hz')} (10 \\log_{{10}}(B) = {10.0 * math.log10(bandwidth_hz):.2f} \\text{{ dB}})",
        f"Total Thermal Noise Floor: P_N = -174 + 10 \\log_{{10}}(B) + \\text{{NF}} = {p_noise_dbm:.2f} \\text{{ dBm}}"
    ]

    return {
        "success": True,
        "bandwidth_Hz": bandwidth_hz,
        "temperature_K": temperature_k,
        "noise_figure_dB": noise_figure_db,
        "noise_power_W": float(p_noise_w),
        "noise_power_dBm": round(p_noise_dbm, 2),
        "steps": steps
    }


# --- 8. Basic FIR Filter Calculations ---

def calculate_fir_filter_design(
    num_taps: int = 31,
    cutoff_normalized: float = 0.25,
    filter_type: str = "lowpass",
    window_type: str = "hamming"
) -> Dict[str, Any]:
    """
    Synthesizes FIR filter using windowed sinc method (SciPy firwin)
    and computes complete frequency response |H(f)| across 128 normalized frequency points.
    """
    if num_taps < 3 or num_taps > 255:
        return {"error": "num_taps must be between 3 and 255."}
    if cutoff_normalized <= 0.0 or cutoff_normalized >= 0.5:
        return {"error": "cutoff_normalized must be between 0.0 and 0.5 (Nyquist)."}

    # firwin requires cutoff scaled to Nyquist (where 1.0 = Nyquist = 0.5 Fs)
    cutoff_nyq = cutoff_normalized * 2.0

    # Handle even number of taps for highpass
    if filter_type.lower() == "highpass" and num_taps % 2 == 0:
        num_taps += 1

    try:
        taps = signal.firwin(
            num_taps,
            cutoff_nyq,
            pass_zero=(filter_type.lower() == "lowpass"),
            window=window_type.lower()
        )
    except Exception as e:
        return {"error": f"FIR filter design failed: {str(e)}"}

    # Frequency response via freqz
    w, h = signal.freqz(taps, worN=128)
    freqs_norm = (w / (2.0 * math.pi)).tolist()
    mag_linear = np.abs(h).tolist()
    mag_db = (20.0 * np.log10(np.maximum(np.abs(h), 1e-6))).tolist()
    phase_deg = np.degrees(np.unwrap(np.angle(h))).tolist()

    group_delay_samples = (num_taps - 1) / 2.0

    steps = [
        f"Windowed Sinc FIR Filter: N = {num_taps} taps, Cutoff = {cutoff_normalized:.3f} \\times F_s, Window = {window_type.capitalize()}",
        f"Linear Phase Filter Group Delay: \\tau_g = \\frac{{N - 1}}{{2}} = {group_delay_samples:.1f} \\text{{ samples}}",
        f"Center Tap h[{int(group_delay_samples)}]: {taps[int(group_delay_samples)]:.6f}"
    ]

    return {
        "success": True,
        "num_taps": num_taps,
        "cutoff_normalized": cutoff_normalized,
        "filter_type": filter_type,
        "window_type": window_type,
        "group_delay_samples": group_delay_samples,
        "coefficients": [round(float(c), 6) for c in taps],
        "frequency_response": {
            "frequencies_normalized": [round(f, 4) for f in freqs_norm],
            "magnitude_linear": [round(m, 4) for m in mag_linear],
            "magnitude_dB": [round(db, 2) for db in mag_db],
            "phase_deg": [round(p, 2) for p in phase_deg]
        },
        "steps": steps
    }
