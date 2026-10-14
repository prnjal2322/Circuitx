# CircuitX Verified Engineering Calculators

To ensure mathematical precision, CircuitX implements built-in numerical solvers powered by NumPy and SciPy. These calculators run directly on the backend to provide verified step-by-step solutions without relying on generative LLM arithmetic.

---

### 1. Ohm's Law & DC Power Solver
- **Governing Equations**:
  $$V = I \cdot R$$
  $$P = V \cdot I = I^2 R = \frac{V^2}{R}$$
- **Parameters**: Accepts any two non-zero values among Voltage ($V$), Current ($I$), Resistance ($R$), and Power ($P$), and derives the remaining two variables.

---

### 2. Voltage & Current Dividers
- **Voltage Divider with Optional Load**:
  $$R_{2,\text{eff}} = R_2 \parallel R_L = \frac{R_2 R_L}{R_2 + R_L}$$
  $$V_{\text{out}} = V_{\text{in}} \cdot \frac{R_{2,\text{eff}}}{R_1 + R_{2,\text{eff}}}$$
- **Current Divider (Parallel Branches)**:
  $$I_1 = I_{\text{total}} \cdot \frac{R_2}{R_1 + R_2}, \quad I_2 = I_{\text{total}} \cdot \frac{R_1}{R_1 + R_2}$$

---

### 3. RLC Resonance & Impedance Solver
- **Governing Equations**:
  $$f_0 = \frac{1}{2\pi \sqrt{L \cdot C}}$$
  $$\omega_0 = \frac{1}{\sqrt{L \cdot C}}$$
  $$Z_0 = \sqrt{\frac{L}{C}}$$
  $$Q_{\text{series}} = \frac{1}{R} \sqrt{\frac{L}{C}}, \quad Q_{\text{parallel}} = R \sqrt{\frac{C}{L}}$$
- **Complex Impedance at Frequency $f$**:
  $$X_L = 2\pi f L, \quad X_C = \frac{1}{2\pi f C}$$
  $$Z_{\text{series}} = R + j(X_L - X_C)$$

---

### 4. Passive Filter Cut-Off Solver
- **RC Low-Pass / High-Pass**:
  $$f_c = \frac{1}{2\pi R C}$$
- **RL Low-Pass / High-Pass**:
  $$f_c = \frac{R}{2\pi L}$$
- Computes -3 dB roll-off point, attenuation, and frequency sweep points for Bode plot previews.

---

### 5. BJT Common-Emitter DC Bias Point (Active & Saturation)
- **Base Current**:
  $$I_B = \frac{V_{CC} - V_{BE}}{R_B + (\beta + 1)R_E}$$
- **Active Mode Check**:
  $$V_{CE,\text{active}} = V_{CC} - I_C R_C - I_E R_E$$
- **Saturation Fallback**:
  If $V_{CE,\text{active}} \le 0.2\,\text{V}$, the transistor enters Saturation:
  $$V_{CE,\text{sat}} \approx 0.2\,\text{V}, \quad I_{C,\text{sat}} \approx \frac{V_{CC} - V_{CE,\text{sat}}}{R_C + R_E}, \quad \beta_{\text{forced}} = \frac{I_{C,\text{sat}}}{I_B} < \beta$$

---

### 6. 555 Astable Multivibrator Timer
- **High and Low Charge Times**:
  $$t_{\text{high}} = 0.693 \cdot (R_A + R_B) \cdot C$$
  $$t_{\text{low}} = 0.693 \cdot R_B \cdot C$$
- **Frequency and Duty Cycle**:
  $$T = t_{\text{high}} + t_{\text{low}} = 0.693 \cdot (R_A + 2R_B) \cdot C$$
  $$f = \frac{1.44}{(R_A + 2R_B) \cdot C}, \quad D = \frac{R_A + R_B}{R_A + 2R_B} \times 100\%$$

---

### 7. Synchronous Digital Timing Slack Solver
- **Setup Slack**:
  $$\text{Slack}_{\text{setup}} = (T_{\text{clk}} + T_{\text{skew}}) - (t_{\text{cq}} + t_{\text{comb,max}} + t_{\text{setup}})$$
- **Hold Slack**:
  $$\text{Slack}_{\text{hold}} = (t_{\text{cq}} + t_{\text{comb,min}}) - (t_{\text{hold}} + T_{\text{skew}})$$
- Reports timing closure status ("Met" vs "Violated").

---

### 8. Number Base Radix & Two's Complement Solver
- Converts between Decimal, Hexadecimal, Binary, and Octal.
- Formats signed two's complement binary representation for arbitrary bit widths (e.g., 8, 16, 32-bit).

---

### 9. Operational Amplifier Solver
- **Inverting Amplifier**:
  $$A_v = -\frac{R_f}{R_{\text{in}}}$$
- **Non-Inverting Amplifier**:
  $$A_v = 1 + \frac{R_f}{R_1}$$
- **Voltage Follower**:
  $$A_v = 1.0$$
- **Gain-Bandwidth Product (GBW)**:
  $$f_{3\text{dB}} = \frac{\text{GBW}}{|A_{\text{noise}}|}$$

---

### 10. Antenna Directivity & Gain Solver
- **Kraus' Approximation**:
  $$D \approx \frac{41253}{\Theta_{1d} \cdot \Theta_{2d}}$$
- **Directivity in dBi**:
  $$D_{\text{dBi}} = 10\log_{10}(D)$$
- **Antenna Gain with Efficiency $\eta$**:
  $$G = \eta \cdot D, \quad G_{\text{dBi}} = 10\log_{10}(G)$$

---

### 11. Friis Transmission Formula & RF Link Budget
- **Free Space Path Loss (FSPL)**:
  $$\text{FSPL (dB)} = 20\log_{10}(d) + 20\log_{10}(f) + 20\log_{10}\left(\frac{4\pi}{c}\right)$$
- **Received Power**:
  $$P_r (\text{dBm}) = P_t (\text{dBm}) + G_t (\text{dBi}) + G_r (\text{dBi}) - \text{FSPL (dB)}$$
- **Fade Margin**:
  $$M = P_r - P_{\text{sensitivity}}$$

---

### 12. Shannon Channel Capacity Solver
- **Shannon-Hartley Theorem**:
  $$C = B \log_2(1 + \text{SNR}_{\text{linear}})$$
  $$\text{SNR}_{\text{linear}} = 10^{\frac{\text{SNR}_{\text{dB}}}{10}}$$
- Computes spectral efficiency $\eta_C = \frac{C}{B}$ in $\text{bps/Hz}$.

---

### 13. FIR Filter Synthesis (Windowed Sinc)
- **Ideal Low-Pass Sinc Impulse Response**:
  $$h_d[n] = 2 f_c \frac{\sin(2\pi f_c (n - M))}{\pi (n - M)}, \quad M = \frac{N - 1}{2}$$
- **Supported Window Functions**: Hamming, Hanning, Blackman, Rectangular.
- Outputs symmetrical filter taps and coefficients.

---

### 14. VSWR & Return Loss Solver
- **Reflection Coefficient**:
  $$\Gamma = \frac{Z_L - Z_0}{Z_L + Z_0}, \quad |\Gamma| = \frac{|Z_L - Z_0|}{|Z_L + Z_0|}$$
- **VSWR & Return Loss**:
  $$\text{VSWR} = \frac{1 + |\Gamma|}{1 - |\Gamma|}$$
  $$\text{Return Loss (dB)} = -20 \log_{10}(|\Gamma|)$$

---

### 15. CMOS Inverter Elmore RC Delay Solver
- **Propagation Delay Model**:
  $$t_{pHL} = 0.69 \cdot R_n \cdot C_L$$
  $$t_{pLH} = 0.69 \cdot R_p \cdot C_L$$
  $$t_{pd} = \frac{t_{pHL} + t_{pLH}}{2}$$
- Recommends symmetric $W_p / W_n$ sizing based on carrier mobility ratio $\mu_n / \mu_p \approx 2.5$.
