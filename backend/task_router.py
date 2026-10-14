"""
CircuitX Universal Task Router & Classification Layer
Automatically classifies incoming natural-language electronics engineering prompts,
identifies multi-domain queries, selects domain guidelines, and suggests verified calculation tools.
"""

import re
from typing import List, Dict, Any, Optional

# Domain definitions and pattern keywords
DOMAIN_PATTERNS = {
    "circuit_calculations": [
        r"\bohms?\b", r"\bkirchhoff", r"\bkvl\b", r"\bkcl\b", r"\bcurrent\b", r"\bvoltage\b",
        r"\bresistance\b", r"\bpower\s+dissipation\b", r"\bvoltage\s+divider\b",
        r"\bcurrent\s+divider\b", r"\bthevenin\b", r"\bnorton\b", r"\bmesh\s+current",
        r"\bnodal\s+analysis", r"\bimpedance\b", r"\breactance\b", r"\badmittance\b",
        r"\brlc\b", r"\bresonance\b", r"\bq\s*factor\b"
    ],
    "circuit_theory": [
        r"\bnetwork\s+theorem", r"\bsuperposition\b", r"\bmaximum\s+power\s+transfer\b",
        r"\bmillman\b", r"\btellegen\b", r"\btwo-port\b", r"\bh-parameters?\b",
        r"\bz-parameters?\b", r"\by-parameters?\b", r"\bac\s+circuit", r"\bdc\s+circuit",
        r"\bphasors?\b", r"\btransient\s+response\b", r"\btime\s+constant\b", r"\bsteady\s+state\b"
    ],
    "analog_electronics": [
        r"\bop-?amp\b", r"\boperational\s+amplifier\b", r"\binverting\s+amplifier\b",
        r"\bnon-inverting\b", r"\bdifferential\s+amplifier\b", r"\btransistor\b",
        r"\bbjt\b", r"\bmosfet\b", r"\bdiodes?\b", r"\bzeners?\b", r"\bbiasing\b",
        r"\bsmall-signal\b", r"\bgain-bandwidth\b", r"\bactive\s+filter\b", r"\bsallen-key\b",
        r"\bbode\s+plot\b", r"\bfeedback\b", r"\bosciallator\b", r"\b555\s+timer\b"
    ],
    "digital_logic": [
        r"\bboolean\b", r"\bk-?maps?\b", r"\bkarnaugh\b", r"\blogic\s+gates?\b",
        r"\band\s+gate\b", r"\bor\s+gate\b", r"\bxor\b", r"\bnand\b", r"\bnor\b",
        r"\bmultiplexer\b", r"\bmux\b", r"\bdemux\b", r"\bdecoder\b", r"\bencoder\b",
        r"\bflip-?flops?\b", r"\blatches?\b", r"\bcrypt\b", r"\bcounters?\b",
        r"\bshift\s+registers?\b", r"\btruth\s+table\b", r"\bminterms?\b", r"\bmaxterms?\b"
    ],
    "verilog_systemverilog": [
        r"\bverilog\b", r"\bsystemverilog\b", r"\bvhd\b", r"\bvhdl\b", r"\brtl\b",
        r"\btestbench\b", r"\bfsm\b", r"\bstate\s+machine\b", r"\bnon-blocking\b",
        r"\bblocking\s+assignment\b", r"\balways\s*@", r"\bposedge\b", r"\bnegedge\b",
        r"\bassign\b", r"\bwire\b", r"\breg\b", r"\bparameter\b", r"\binitial\s+begin\b"
    ],
    "vlsi": [
        r"\bvlsi\b", r"\bcmos\b", r"\bnmos\b", r"\bpmos\b", r"\bstick\s+diagram\b",
        r"\beuler\s+path\b", r"\belmore\s+delay\b", r"\blogical\s+effort\b", r"\bsetup\s+time\b",
        r"\bhold\s+time\b", r"\btiming\s+slack\b", r"\bclock\s+skew\b", r"\bpropagation\s+delay\b",
        r"\bdrc\b", r"\blvs\b", r"\bnoise\s+margin\b", r"\bvtc\b", r"\bstandard\s+cell\b"
    ],
    "signals_systems": [
        r"\bfourier\b", r"\bfft\b", r"\bdft\b", r"\bctft\b", r"\bdtft\b", r"\blaplace\b",
        r"\bz-transform\b", r"\bconvolution\b", r"\blti\s+systems?\b", r"\bimpulse\s+response\b",
        r"\btransfer\s+function\b", r"\bfir\b", r"\biir\b", r"\bbutterworth\b",
        r"\bchebyshev\b", r"\bnyquist\s+rate\b", r"\bsampling\s+theorem\b", r"\bpoles?\s+and\s+zeros?\b"
    ],
    "matlab": [
        r"\bmatlab\b", r"\boctave\b", r"\bsimulink\b", r"\bode45\b", r"\bfreqz\b",
        r"\bbode\(", r"\bfft\(", r"\bplot\(", r"\bscripts?\b", r"\bvectorized\b"
    ],
    "antenna_engineering": [
        r"\bantennas?\b", r"\bdirectivity\b", r"\bradiation\s+pattern\b", r"\bhalf-power\s+beamwidth\b",
        r"\bhpbw\b", r"\beffective\s+aperture\b", r"\bdipole\b", r"\bmonopole\b", r"\bhorn\s+antenna\b",
        r"\bmicrostrip\s+patch\b", r"\breflection\s+coefficient\b", r"\bvswr\b", r"\bs11\b",
        r"\bsmith\s+chart\b", r"\bquarter-wave\b"
    ],
    "communication_systems": [
        r"\bcommunication\b", r"\blink\s+budget\b", r"\bfriis\b", r"\bfsps?\b",
        r"\bpath\s+loss\b", r"\bshannon\b", r"\bchannel\s+capacity\b", r"\bsnr\b",
        r"\bber\b", r"\bbit\s+error\s+rate\b", r"\bbpsk\b", r"\bqpsk\b", r"\bqam\b",
        r"\bam\b", r"\bfm\b", r"\bmodulation\b", r"\bdemodulation\b", r"\bconstellation\b"
    ],
    "electromagnetic_theory": [
        r"\bmaxwell", r"\belectromagnetic\b", r"\bpoynting\b", r"\bwave\s+equation\b",
        r"\bplane\s+waves?\b", r"\bboundary\s+conditions?\b", r"\bhelmholtz\b",
        r"\bintrinsic\s+impedance\b", r"\bwaveguide\b", r"\bte10\b", r"\btm\s+modes?\b",
        r"\bgauss\'?s\s+law\b", r"\bfaraday\'?s\s+law\b", r"\bampere\b", r"\bcurl\b", r"\bdivergence\b"
    ],
    "embedded_systems": [
        r"\bembedded\b", r"\biot\b", r"\bmicrocontroller\b", r"\bmcu\b", r"\barm\s+cortex\b",
        r"\besp32\b", r"\bstm32\b", r"\barduino\b", r"\bfreertos\b", r"\bgpio\b",
        r"\binterrupts?\b", r"\bisr\b", r"\bhal\b", r"\buart\b", r"\bspi\b", r"\bi2c\b",
        r"\bcan\s+bus\b", r"\btimers?\b", r"\bpwm\b", r"\badc\b", r"\bdac\b", r"\bdma\b"
    ],
    "engineering_mathematics": [
        r"\bdifferential\s+equations?\b", r"\beigenvalues?\b", r"\beigenvectors?\b",
        r"\blinear\s+algebra\b", r"\bcomplex\s+numbers?\b", r"\bvector\s+calculus\b",
        r"\bgradient\b", r"\bmatrix\b", r"\bintegral\b", r"\bpartial\s+fraction\b"
    ],
    "simulation_debugging": [
        r"\bspice\b", r"\bltspice\b", r"\bngspice\b", r"\bnetlists?\b", r"\bsimulation\b",
        r"\boscilloscope\b", r"\blogic\s+analyzer\b", r"\bsignal\s+integrity\b",
        r"\bground\s+bounce\b", r"\bracing?\b", r"\brace\s+conditions?\b", r"\bmetastability\b",
        r"\bglitch\b", r"\bdebug\b"
    ]
}


def classify_task(prompt: str) -> Dict[str, Any]:
    """
    Analyzes natural language prompt and classifies it into one or more domains.
    Detects task format (numerical, theory, code), short-answer preference,
    and associated deterministic calculation tools.
    """
    p_lower = prompt.lower()

    # 1. Domain scoring
    scores: Dict[str, int] = {}
    for domain, patterns in DOMAIN_PATTERNS.items():
        score = 0
        for pat in patterns:
            matches = len(re.findall(pat, p_lower))
            score += matches * 2
        if score > 0:
            scores[domain] = score

    # Sort domains by score
    sorted_domains = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    detected_domains = [d[0] for d in sorted_domains]

    primary_domain = detected_domains[0] if detected_domains else "circuit_calculations"

    # 2. Detect task type
    is_numerical = bool(re.search(
        r"\b(calculate|compute|solve|find|determine|value|magnitude|current|voltage|power|frequency|resistance|ratio|delay|directivity)\b",
        p_lower
    ) and re.search(r"\d+", prompt))

    is_code = bool(re.search(
        r"\b(code|verilog|vhdl|matlab|python|c\+\+|c\b|script|testbench|module|function|firmware|driver|implementation|fsm)\b",
        p_lower
    ))

    is_theory = bool(re.search(
        r"\b(explain|what\s+is|define|how\s+does|working\s+principle|theory|difference\s+between|compare|derive|laws?)\b",
        p_lower
    )) and not is_numerical

    if is_code:
        task_type = "code"
    elif is_numerical:
        task_type = "numerical"
    elif is_theory:
        task_type = "theory"
    else:
        task_type = "general"

    # 3. Detect short answer request
    is_short = bool(re.search(r"\b(short\s+answer|briefly|one\s+sentence|concise|just\s+the\s+number|quick)\b", p_lower))

    # 4. Relevant deterministic calculators
    relevant_tools = []
    if any(k in p_lower for k in ["ohm", "voltage", "current", "power", "v = i", "resistance"]) and any(c.isdigit() for c in prompt):
        relevant_tools.append("ohms_law")
    if any(k in p_lower for k in ["rlc", "resonance", "resonant", "quality factor", "q-factor"]):
        relevant_tools.append("rlc")
    if any(k in p_lower for k in ["cutoff", "cut-off", "filter", "rc filter", "rl filter"]):
        relevant_tools.append("filter")
    if any(k in p_lower for k in ["friis", "link budget", "path loss", "fspl", "received power"]):
        relevant_tools.append("friis")
    if any(k in p_lower for k in ["opamp", "op-amp", "inverting", "non-inverting"]):
        relevant_tools.append("opamp")
    if any(k in p_lower for k in ["directivity", "antenna gain", "kraus", "beamwidth", "hpbw"]):
        relevant_tools.append("antenna")
    if any(k in p_lower for k in ["cmos", "inverter delay", "elmore", "tpd", "propagation delay"]):
        relevant_tools.append("cmos")

    return {
        "primary_domain": primary_domain,
        "detected_domains": detected_domains if detected_domains else ["circuit_calculations"],
        "is_multi_domain": len(detected_domains) > 1,
        "task_type": task_type,
        "is_short_answer": is_short,
        "relevant_tools": relevant_tools,
        "domain_score": scores.get(primary_domain, 0)
    }
