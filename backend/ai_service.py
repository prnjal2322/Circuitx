"""
CircuitX AI Service
Implements official OpenAI Python SDK integration with domain classification,
strict engineering behavioral guidelines, structured response formatting,
and latency/cost-optimized context management.
"""

import re
from typing import List, Dict, Any, AsyncGenerator, Optional
import httpx
from openai import OpenAI, AsyncOpenAI, OpenAIError, APIConnectionError, RateLimitError, APIStatusError

from config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, MAX_CONTEXT_MESSAGES, REQUEST_TIMEOUT_SECONDS
from task_router import classify_task


def redact_sensitive_info(text: str) -> str:
    """Redacts potential API keys, bearer tokens, or private credentials from strings and error logs."""
    if not text:
        return ""
    # Redact OpenAI, Groq, and generic sk- style API keys
    redacted = re.sub(r"(?:sk-|gsk_)[a-zA-Z0-9_\-]{15,}", "[REDACTED_API_KEY]", str(text))
    # Redact Bearer tokens
    redacted = re.sub(r"Bearer\s+[a-zA-Z0-9_\-\.]{15,}", "Bearer [REDACTED_TOKEN]", redacted)
    # Redact file system user home paths if present in tracebacks
    redacted = re.sub(r"[C-Zc-z]:\\[Uu]sers\\[^\\]+\\", lambda _: "C:\\Users\\[REDACTED_USER]\\", redacted)
    return redacted


def detect_hazard_warnings(prompt: str) -> str:
    """
    Detects potential electrical and physical hazards (high voltage, mains, batteries, RF)
    and returns a prominent safety notice.
    """
    p_lower = prompt.lower()
    hazards = []

    if any(k in p_lower for k in ["230v", "220v", "110v", "120v", "240v", "480v", "mains", "high voltage", "grid", "flyback", "tesla coil", "kilovolt", "kv "]):
        hazards.append("**High Voltage / Mains Power Warning:** Voltages exceeding 50 V AC or 120 V DC present lethal electric shock and arc-flash hazards. Always employ certified galvanic isolation, differential probes, fuse protection, and proper earthing.")

    if any(k in p_lower for k in ["high current", "100a", "50a", "30a", "welder", "busbar", "arc flash"]):
        hazards.append("**High Current & Thermal Warning:** Currents exceeding 5 A can induce severe thermal dissipation ($I^2R$), trace vaporization, and arc-flash burns. Ensure correct conductor cross-section (AWG) and heatsinking.")

    if any(k in p_lower for k in ["lipo", "li-ion", "lithium", "18650", "battery charge", "bms", "thermal runaway"]):
        hazards.append("**Battery Chemistry & Fire Warning:** Lithium-based cells are susceptible to thermal runaway, swelling, and fire if overcharged, deeply discharged, or shorted. Always integrate a dedicated Battery Management System (BMS) with overcurrent and thermal cutoff.")

    if any(k in p_lower for k in ["magnetron", "klystron", "high power rf", "100w rf", "50w rf", "microwave power", "rf amplifier"]):
        hazards.append("**High Power RF Radiation Warning:** High-frequency, high-power electromagnetic radiation can cause deep tissue thermal burns and cataracts. Never operate open RF waveguides or power amplifiers without a matched 50 Ω dummy load and proper RF shielding.")

    if hazards:
        joined = "\n\n".join(hazards)
        return f"\n\n> [!CAUTION]\n> ### ⚠️ HAZARDOUS ENGINEERING TASK NOTICE\n> {joined}\n>\n> *Independent Verification Notice: CircuitX designs and calculations are assistive tools. Real-world fabrication of high-power or safety-critical circuits requires certified lab isolation and qualified engineering oversight.*"

    return ""


# Missing API Key Notice
API_KEY_MISSING_NOTICE = """### ⚠️ OpenAI API Key Not Configured

The CircuitX AI reasoning engine requires an OpenAI API key to process natural-language instructions.

#### How to configure:
1. Open or create `.env` in the project root or `backend/` directory.
2. Add your key and chosen model:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   ```
3. Restart the backend service.

> **Deterministic Calculators & MNA Solver Operational:**
> High-precision numerical calculators (Ohm's Law, RLC Resonance, Filter Cutoff, RF Link Budget, Op-Amps, Antenna Directivity, CMOS Delay, and the MNA DC Circuit Solver) remain fully operational and do not require an external API key.
"""

# Master CircuitX System Instructions
MASTER_SYSTEM_INSTRUCTION = """You are CircuitX, the Universal Electronics Engineering AI Assistant.
You behave as an authoritative, senior electronics engineer, hardware architect, and university professor.
You explain solutions with rigorous engineering accuracy, standard IEEE conventions, and practical design recommendations.

### Core Behavioral Guidelines:
1. **Identify the Engineering Domain**: Clearly understand the discipline (circuit theory, analog, digital, Verilog/HDL, VLSI, DSP/signals, RF/antennas, communications, embedded, or electromagnetics).
2. **Understand the Task & Requested Output**: Address exactly what is requested.
3. **Detect Missing Parameters**: If essential parameters are omitted (e.g., component values, frequencies, supply voltages), explicitly ask concise clarification questions or state realistic standard engineering assumptions.
4. **State Assumptions Explicitly**: Always list operating conditions (e.g., temperature T=300K, ideal op-amp assumptions, linear operation, steady-state DC/AC).
5. **Correct Units and Notation**: Always use standard SI engineering units and metric prefixes (e.g., kΩ, MΩ, pF, nF, µF, µH, mH, GHz, MHz, dBm, dBi, V/m).
6. **Show Formulas & Step-by-Step Derivations**: Express formulas and equations in LaTeX notation ($...$ for inline and $$...$$ for block math).
7. **Transparent & Accessible Explanations**: Explain results in simple, intuitive physical language by default, but provide advanced rigorous mathematical depth when prompted.
8. **Synthesizable Code & Complete Testbenches**: For HDL and embedded code, produce complete, synthesizable code with accompanying self-checking testbenches and execution instructions.
9. **Distinguish Theory vs. Physical Implementation**: Differentiate theoretical idealized models from real-world non-idealities (e.g., parasitic capacitance, finite slew rate, thermal noise, trace reflections).
10. **Acknowledge Uncertainty & Never Hallucinate**: Never invent simulation results, bench measurements, component part numbers, or specifications. If uncertain, state the boundary conditions.
11. **Diagrams**: When explaining topologies, state machines, or signal flows, generate clean Mermaid diagrams (```mermaid ... ```).
12. **Safety & Verification Mandate**: Whenever addressing high voltages (>50V AC / 120V DC), mains power, high currents, batteries, or RF transmitters, you MUST explicitly state the physical hazards and advise appropriate isolation and PPE. Emphasize that AI designs require independent verification prior to physical implementation.

### Response Formatting Requirements:

#### For Numerical Problems:
1. **Given Data**: List parameters with units.
2. **Required Quantity**: What is being solved.
3. **Assumptions**: Operating regime and model assumptions.
4. **Formula**: Governing equation in LaTeX.
5. **Substitution & Calculation**: Step-by-step arithmetic.
6. **Final Answer**: Clearly highlighted with units.
7. **Sanity Check / Verification**: Quick physical reasonableness check.

#### For Theory Questions:
1. **Definition**: Core technical definition.
2. **Working Principle**: Underlying physics and circuit mechanism.
3. **Important Equations**: Governing mathematical formulations.
4. **Example / Diagram**: Circuit schematic or Mermaid diagram where useful.
5. **Advantages, Limitations & Applications**: Practical tradeoffs.

#### For Code & HDL Tasks:
1. **Requirements**: Design specification and interface pins.
2. **Complete Code**: Fully written, synthesizable module in labeled block.
3. **Explanation**: Process breakdown (sequential vs combinational).
4. **Test Cases / Testbench**: Simulation harness with stimulus.
5. **Expected Behavior**: Waveforms or assertion checks.
6. **Execution Instructions**: How to compile or simulate (e.g., Icarus Verilog, ModelSim, Vivado).

*Adapt the formatting dynamically: When the user explicitly requests a short or brief answer, provide the concise result without redundant sections.*
"""


from domain_workflows import get_workflow_instructions


def build_system_prompt(prompt: str) -> str:
    """Builds a contextualized system prompt combining the master guidelines and task router analysis."""
    classification = classify_task(prompt)
    detected = classification["detected_domains"]
    task_type = classification["task_type"]

    guidance = f"\n\n### Task Classification Analysis:\n"
    guidance += f"- Primary Discipline: {classification['primary_domain'].replace('_', ' ').title()}\n"
    if classification["is_multi_domain"]:
        guidance += f"- Cross-Disciplinary Domains: {', '.join([d.replace('_', ' ').title() for d in detected])}\n"
        guidance += "- Multi-domain instruction: Address these connected domains holistically in your solution.\n"
    guidance += f"- Task Archetype: {task_type.capitalize()}\n"

    if classification["is_short_answer"]:
        guidance += "- User Preference: The user requested a concise / short answer. Provide the direct technical answer concisely.\n"

    if classification["relevant_tools"]:
        guidance += f"- Recommended Verified Calculation Solvers: {', '.join(classification['relevant_tools'])}\n"

    # Inject domain-specific workflow guidelines and checklists
    workflow_info = get_workflow_instructions(classification["primary_domain"])
    for d in detected:
        if d != classification["primary_domain"]:
            workflow_info += get_workflow_instructions(d)

    hazard_notice = detect_hazard_warnings(prompt)

    return MASTER_SYSTEM_INSTRUCTION + guidance + workflow_info + hazard_notice


def get_openai_client() -> Optional[OpenAI]:
    """Instantiates synchronous OpenAI/Groq client if API key is present."""
    if not OPENAI_API_KEY:
        return None
    kwargs = {"api_key": OPENAI_API_KEY, "timeout": httpx.Timeout(REQUEST_TIMEOUT_SECONDS, connect=10.0)}
    if OPENAI_BASE_URL:
        kwargs["base_url"] = OPENAI_BASE_URL
    return OpenAI(**kwargs)


def get_async_openai_client() -> Optional[AsyncOpenAI]:
    """Instantiates asynchronous OpenAI/Groq client if API key is present."""
    if not OPENAI_API_KEY:
        return None
    kwargs = {"api_key": OPENAI_API_KEY, "timeout": httpx.Timeout(REQUEST_TIMEOUT_SECONDS, connect=10.0)}
    if OPENAI_BASE_URL:
        kwargs["base_url"] = OPENAI_BASE_URL
    return AsyncOpenAI(**kwargs)


def prepare_conversation_context(messages: List[Dict[str, str]], system_prompt: str) -> List[Dict[str, str]]:
    """
    Trims conversation context to control latency and token costs.
    Preserves system prompt and last MAX_CONTEXT_MESSAGES messages.
    """
    trimmed = messages[-MAX_CONTEXT_MESSAGES:] if len(messages) > MAX_CONTEXT_MESSAGES else messages
    return [{"role": "system", "content": system_prompt}] + [
        {"role": m["role"], "content": m["content"]} for m in trimmed
    ]


async def generate_chat_response(messages: List[Dict[str, str]]) -> str:
    """
    Generates a full AI response using the official OpenAI SDK.
    Handles missing keys, timeouts, rate limits, and network errors gracefully.
    Redacts any sensitive tokens from error messages.
    """
    user_latest = messages[-1]["content"] if messages else ""
    system_prompt = build_system_prompt(user_latest)

    client = get_openai_client()
    if not client:
        return API_KEY_MISSING_NOTICE

    payload_messages = prepare_conversation_context(messages, system_prompt)

    try:
        response = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=payload_messages,
            temperature=0.2,
            max_tokens=3500
        )
        return response.choices[0].message.content or ""

    except RateLimitError as e:
        safe_msg = redact_sensitive_info(str(e))
        return f"### ⚠️ OpenAI Rate Limit Exceeded\n\nCircuitX received a rate limit from the OpenAI API: {safe_msg}.\n\nPlease wait a moment before resending your request."
    except APIConnectionError as e:
        safe_msg = redact_sensitive_info(str(e))
        return f"### ⚠️ Network Connection Error\n\nFailed to establish a connection to OpenAI API: {safe_msg}.\n\nPlease check your internet connection or proxy settings."
    except APIStatusError as e:
        safe_msg = redact_sensitive_info(e.message)
        return f"### ⚠️ OpenAI API Error ({e.status_code})\n\nThe OpenAI API returned an error status: {safe_msg}."
    except OpenAIError as e:
        safe_msg = redact_sensitive_info(str(e))
        return f"### ⚠️ OpenAI Service Exception\n\nAn error occurred while communicating with the OpenAI service: {safe_msg}."
    except Exception as e:
        safe_msg = redact_sensitive_info(str(e))
        return f"### ⚠️ Unexpected Backend Error\n\nAn unexpected error occurred: {safe_msg}."


async def generate_chat_stream(messages: List[Dict[str, str]]) -> AsyncGenerator[str, None]:
    """
    Generates streaming response chunks using the official AsyncOpenAI SDK.
    Emits raw text tokens as they arrive from the model with redacted errors.
    """
    user_latest = messages[-1]["content"] if messages else ""
    system_prompt = build_system_prompt(user_latest)

    client = get_async_openai_client()
    if not client:
        yield API_KEY_MISSING_NOTICE
        return

    payload_messages = prepare_conversation_context(messages, system_prompt)

    try:
        stream = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=payload_messages,
            temperature=0.2,
            max_tokens=3500,
            stream=True
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content

    except RateLimitError as e:
        yield f"\n\n### ⚠️ OpenAI Rate Limit Exceeded\n\n{redact_sensitive_info(str(e))}"
    except APIConnectionError as e:
        yield f"\n\n### ⚠️ Network Connection Error\n\n{redact_sensitive_info(str(e))}"
    except APIStatusError as e:
        yield f"\n\n### ⚠️ OpenAI API Error ({e.status_code})\n\n{redact_sensitive_info(e.message)}"
    except OpenAIError as e:
        yield f"\n\n### ⚠️ OpenAI Service Exception\n\n{redact_sensitive_info(str(e))}"
    except Exception as e:
        yield f"\n\n### ⚠️ Stream Error\n\n{redact_sensitive_info(str(e))}"
