"""
CircuitX — Universal Electronics Engineering AI Assistant
FastAPI Backend Application
"""

import os
import shutil
import uuid
import json
import time
import logging
from collections import defaultdict, deque
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, PlainTextResponse, JSONResponse
from pydantic import BaseModel, Field

import config
import database as db
import calculators as calc
import ai_service as ai
import circuit_solver
import calculation_engine as calc_engine
import simulators
from task_router import classify_task
from domain_workflows import DOMAIN_WORKFLOWS


# --- Redacting Log Filter for Credentials ---
class SensitiveRedactingFilter(logging.Filter):
    """Filters logs and scrubs any sensitive OpenAI API keys or credentials."""
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = ai.redact_sensitive_info(record.msg)
        if record.args:
            record.args = tuple(
                ai.redact_sensitive_info(arg) if isinstance(arg, str) else arg
                for arg in record.args
            )
        return True

logging.getLogger().addFilter(SensitiveRedactingFilter())

# In-memory rate limiting sliding window (IP -> timestamps deque)
_rate_limit_records = defaultdict(deque)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database on startup
    db.init_db()
    yield


app = FastAPI(
    title="CircuitX API",
    description="Universal Electronics Engineering AI Assistant with Real OpenAI SDK Integration & Verified Solvers",
    version="1.0.0",
    lifespan=lifespan
)

# Explicit CORS Origins
allowed_origins = [
    config.FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
# Remove duplicates while preserving order
unique_origins = list(dict.fromkeys(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=unique_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    """
    Security Middleware:
    1. Enforces maximum request body size limit (10MB).
    2. Enforces IP-based sliding window rate limiting.
    3. Injects defensive HTTP security headers (nosniff, DENY, strict referrer).
    """
    # 1. Enforce payload size limit
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > config.MAX_REQUEST_SIZE_BYTES:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request entity too large. Maximum allowed size is {config.MAX_REQUEST_SIZE_BYTES // (1024*1024)} MB."}
                )
        except ValueError:
            pass

    # 2. Rate limiting check (exempt health check and documentation)
    exempt_paths = {"/health", "/api/health", "/docs", "/openapi.json", "/api/safety"}
    if config.RATE_LIMIT_ENABLED and request.url.path not in exempt_paths:
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        window = _rate_limit_records[client_ip]
        # Discard records older than 60 seconds
        while window and window[0] < now - 60.0:
            window.popleft()
        if len(window) >= config.RATE_LIMIT_PER_MINUTE:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please wait a moment before sending another request."},
                headers={"Retry-After": "60"}
            )
        window.append(now)

    # 3. Process request
    response = await call_next(request)

    # 4. Inject defensive security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    return response


# --- Request & Response Models ---

class ConversationCreate(BaseModel):
    title: Optional[str] = "New Engineering Session"
    domain: Optional[str] = "general"


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    domain: Optional[str] = None


class MessageAttachment(BaseModel):
    name: str = Field(..., max_length=256)
    type: str = Field(..., max_length=128)
    content: str = Field(..., max_length=1000000)  # Max 1MB per attachment


class ChatRequest(BaseModel):
    conversation_id: str = Field(..., min_length=1, max_length=128)
    message: str = Field(..., min_length=1, max_length=config.MAX_MESSAGE_LENGTH)
    domain: Optional[str] = "general"
    attachments: Optional[List[MessageAttachment]] = []


class TaskClassifyRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=config.MAX_MESSAGE_LENGTH)


class OhmsLawRequest(BaseModel):
    voltage: Optional[float] = None
    current: Optional[float] = None
    resistance: Optional[float] = None
    power: Optional[float] = None


class RLCRequest(BaseModel):
    resistance: float = Field(..., gt=0)
    inductance: float = Field(..., gt=0)
    capacitance: float = Field(..., gt=0)
    frequency: Optional[float] = None
    topology: Optional[str] = "series"


class FilterRequest(BaseModel):
    filter_type: str = "rc_lowpass"
    resistance: float = 1000.0
    capacitance: Optional[float] = None
    inductance: Optional[float] = None
    target_frequency: Optional[float] = None


class FriisRequest(BaseModel):
    frequency_hz: float = Field(..., gt=0)
    distance_m: float = Field(..., gt=0)
    tx_power_dbm: float = 20.0
    tx_gain_dbi: float = 0.0
    rx_gain_dbi: float = 0.0
    rx_sensitivity_dbm: Optional[float] = None


class OpAmpRequest(BaseModel):
    topology: str = "inverting"
    rf: float = 10000.0
    rin: float = 1000.0
    vin: float = 1.0
    gbw_hz: Optional[float] = 1000000.0


class AntennaDirectivityRequest(BaseModel):
    theta_1_deg: float = Field(..., gt=0)
    theta_2_deg: float = Field(..., gt=0)
    efficiency: float = 0.9


class CMOSDelayRequest(BaseModel):
    v_dd: float = 1.2
    c_load_ff: float = 10.0
    r_eq_nmos_kohm: float = 1.5
    mobility_ratio_pn: float = 2.5


class VoltageDividerRequest(BaseModel):
    vin: float
    r1: float = Field(..., gt=0)
    r2: float = Field(..., gt=0)
    r_load: Optional[float] = None


class CurrentDividerRequest(BaseModel):
    itotal: float
    r1: float = Field(..., gt=0)
    r2: float = Field(..., gt=0)


class TransientRCRLRequest(BaseModel):
    circuit_type: str = "rc"
    v_initial: float = 0.0
    v_final: float = 10.0
    r: float = Field(..., gt=0)
    c: Optional[float] = None
    l: Optional[float] = None
    t: float = Field(..., gt=0)


class BJTBiasRequest(BaseModel):
    vcc: float = 12.0
    vbe: float = 0.7
    rb: float = 100000.0
    rc: float = 2000.0
    re: float = 500.0
    beta: float = 100.0


class Timer555Request(BaseModel):
    ra_ohm: float = Field(..., gt=0)
    rb_ohm: float = Field(..., gt=0)
    c_farad: float = Field(..., gt=0)


class NumberBaseRequest(BaseModel):
    value_str: str = Field(..., min_length=1, max_length=64)
    from_base: int = 10


class TimingSlackRequest(BaseModel):
    t_clk_period_ns: float = Field(..., gt=0)
    t_cq_ns: float = 1.0
    t_comb_max_ns: float = 6.0
    t_comb_min_ns: float = 1.5
    t_setup_ns: float = 1.0
    t_hold_ns: float = 0.5
    clock_skew_ns: float = 0.2


class FIRFilterRequest(BaseModel):
    num_taps: int = Field(15, ge=3, le=1023)
    cutoff_normalized: float = Field(0.25, gt=0, lt=0.5)
    window_type: str = "hamming"


class VSWRRequest(BaseModel):
    reflection_coeff_mag: Optional[float] = None
    vswr: Optional[float] = None
    return_loss_db: Optional[float] = None
    z_load_ohm: Optional[float] = None
    z0_ohm: float = 50.0


class ShannonCapacityRequest(BaseModel):
    bandwidth_hz: float = Field(..., gt=0)
    snr_db: float


class PCMSNRRequest(BaseModel):
    num_bits: int = Field(..., ge=1, le=64)


class ComplexArithmeticRequest(BaseModel):
    real: float
    imag: float


class DBConversionRequest(BaseModel):
    val: float
    conversion_type: str = "dbm_to_w"


# --- Circuit Solver & Expanded Calculations Models ---

class NetlistSolveRequest(BaseModel):
    netlist: Optional[str] = None
    components: Optional[List[circuit_solver.CircuitComponent]] = None
    ground_node: Optional[str] = None


class NetlistParseRequest(BaseModel):
    netlist: str


class UnitConvertRequest(BaseModel):
    category: str
    value: float
    from_unit: str
    to_unit: str


class ResistorNetworkRequest(BaseModel):
    topology: str = "series"  # 'series' or 'parallel'
    resistors: List[float]


class OhmsLawExactRequest(BaseModel):
    voltage: Optional[float] = None
    current: Optional[float] = None
    resistance: Optional[float] = None
    power: Optional[float] = None


class ComplexImpedanceRequest(BaseModel):
    resistance: float
    inductance: float = 0.0
    capacitance: Optional[float] = None
    frequency: float = 1000.0
    topology: str = "series"


class FrequencyWavelengthRequest(BaseModel):
    frequency: Optional[float] = None
    wavelength: Optional[float] = None
    relative_permittivity: float = 1.0


class AntennaPropertiesRequest(BaseModel):
    antenna_type: str = "kraus"
    hpbw_theta_1_deg: Optional[float] = 30.0
    hpbw_theta_2_deg: Optional[float] = 40.0
    efficiency: float = 0.9
    frequency_hz: Optional[float] = 2.4e9


class ThermalNoiseRequest(BaseModel):
    bandwidth_hz: float
    temperature_k: float = 290.0
    noise_figure_db: float = 0.0


class FirFilterSpectrumRequest(BaseModel):
    num_taps: int = 31
    cutoff_normalized: float = 0.25
    filter_type: str = "lowpass"
    window_type: str = "hamming"


class VerilogSimRequest(BaseModel):
    code: str
    testbench_code: Optional[str] = None
    timeout_sec: float = 5.0


class VerilogLintRequest(BaseModel):
    code: str


class KeyConfigRequest(BaseModel):
    api_key: str
    provider: Optional[str] = "groq"
    model: Optional[str] = None


# --- Health & Diagnostic Endpoints ---

def _build_health_data():
    has_key = bool(config.OPENAI_API_KEY)
    is_groq = bool(config.OPENAI_BASE_URL and "groq" in config.OPENAI_BASE_URL) or (has_key and config.OPENAI_API_KEY.startswith("gsk_"))
    provider = "Groq" if is_groq else ("OpenAI" if has_key else "None")
    return {
        "status": "healthy",
        "app": "CircuitX",
        "tagline": "Your AI-Powered Electronics Engineering Assistant",
        "version": "1.0.0",
        "openai_configured": has_key,
        "openai_model": config.OPENAI_MODEL,
        "provider": provider,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "task_router_active": True,
        "deterministic_calculators_ready": True
    }


@app.get("/health")
def get_root_health():
    """System health check endpoint at /health."""
    return _build_health_data()


@app.get("/api/health")
def get_api_health():
    """System health check endpoint at /api/health."""
    return _build_health_data()


@app.post("/api/settings/key")
def update_api_key(req: KeyConfigRequest):
    """Sets and persists LLM API key (OpenAI or Groq) at runtime."""
    key = req.api_key.strip()
    if not key:
        raise HTTPException(status_code=400, detail="API key cannot be empty.")

    config.OPENAI_API_KEY = key
    ai.OPENAI_API_KEY = key
    if key.startswith("gsk_") or req.provider == "groq":
        config.OPENAI_BASE_URL = "https://api.groq.com/openai/v1"
        config.OPENAI_MODEL = req.model or "qwen/qwen3.8-27b"
        ai.OPENAI_BASE_URL = config.OPENAI_BASE_URL
        ai.OPENAI_MODEL = config.OPENAI_MODEL
    else:
        config.OPENAI_BASE_URL = None
        config.OPENAI_MODEL = req.model or "gpt-4o-mini"
        ai.OPENAI_BASE_URL = None
        ai.OPENAI_MODEL = config.OPENAI_MODEL

    # Persist to .env
    env_path = config.BASE_DIR / ".env"
    if not env_path.is_file():
        env_path = config.ROOT_DIR / ".env"

    lines = []
    if env_path.is_file():
        lines = env_path.read_text(encoding="utf-8").splitlines()

    new_lines = []
    key_written = False
    base_url_written = False
    model_written = False

    for line in lines:
        if line.startswith("OPENAI_API_KEY=") or line.startswith("GROQ_API_KEY="):
            if not key_written:
                new_lines.append(f"OPENAI_API_KEY={key}")
                key_written = True
        elif line.startswith("OPENAI_BASE_URL="):
            if config.OPENAI_BASE_URL:
                new_lines.append(f"OPENAI_BASE_URL={config.OPENAI_BASE_URL}")
            base_url_written = True
        elif line.startswith("OPENAI_MODEL="):
            new_lines.append(f"OPENAI_MODEL={config.OPENAI_MODEL}")
            model_written = True
        else:
            new_lines.append(line)

    if not key_written:
        new_lines.append(f"OPENAI_API_KEY={key}")
    if not base_url_written and config.OPENAI_BASE_URL:
        new_lines.append(f"OPENAI_BASE_URL={config.OPENAI_BASE_URL}")
    if not model_written:
        new_lines.append(f"OPENAI_MODEL={config.OPENAI_MODEL}")

    env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    return _build_health_data()


@app.get("/api/safety")
def get_safety_guidelines():
    """Returns engineering safety guidelines and disclaimers for hazardous hardware operations."""
    return {
        "status": "active",
        "verification_mandate": "AI-generated designs, schematics, netlists, and calculations are assistive tools and require independent verification and peer review before physical bench implementation. Safety-critical and regulated designs require qualified professional engineering review.",
        "hazards": [
            {
                "category": "High Voltage / Mains Power",
                "threshold": "> 50 V AC or > 120 V DC",
                "hazards": "Electric shock, ventricular fibrillation, arc flash, insulation breakdown.",
                "precautions": "Galvanic isolation transformers, differential probes, certified earth ground, fuse/breaker sizing, insulated bench tools."
            },
            {
                "category": "High Current / High Power",
                "threshold": "> 5 A or > 50 W",
                "hazards": "Thermal runaway, PCB trace vaporization, severe contact burns, fire.",
                "precautions": "Conductor sizing (AWG ampacity), thermal relief, active heatsinking, current-limiting power supplies."
            },
            {
                "category": "Battery Chemistry (LiPo / Li-ion)",
                "threshold": "Lithium cells, high-discharge packs",
                "hazards": "Thermal runaway, venting with flame, toxic gas emission, destructive short-circuit.",
                "precautions": "Dedicated Battery Management System (BMS), cell temperature monitoring, overcharge/under-voltage protection, flame-retardant enclosures."
            },
            {
                "category": "Radio Frequency & Microwave Power",
                "threshold": "> 1 W ERP or > 1 GHz",
                "hazards": "Deep dielectric tissue burns, cataracts, electromagnetic interference (EMI).",
                "precautions": "Matched 50-ohm dummy loads, Faraday shielding, never look directly into open waveguides or horn antennas."
            }
        ]
    }


# --- Universal Task Router Endpoint ---

@app.post("/api/task-router/classify")
def classify_endpoint(req: TaskClassifyRequest):
    """
    Classifies arbitrary natural-language electronics queries across 14 technical domains.
    Detects whether prompt is numerical, theoretical, or code-based, and finds relevant solvers.
    """
    return classify_task(req.prompt)


# --- Conversation Management Endpoints ---

@app.get("/api/conversations")
def list_conversations():
    """Returns all saved conversations ordered by latest activity."""
    return db.get_all_conversations()


@app.post("/api/conversations")
def create_new_conversation(data: ConversationCreate):
    """Creates a new conversation session."""
    conv_id = str(uuid.uuid4())
    conv = db.create_conversation(conv_id, data.title or "New Engineering Session", data.domain or "general")
    return conv


@app.get("/api/conversations/{conv_id}")
def get_conversation(conv_id: str):
    """Retrieves conversation details and all message history."""
    conv = db.get_conversation_by_id(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = db.get_conversation_messages(conv_id)
    return {**conv, "messages": messages}


@app.put("/api/conversations/{conv_id}")
def update_conversation(conv_id: str, data: ConversationUpdate):
    """Updates title or domain of an existing conversation."""
    success = db.update_conversation(conv_id, data.title, data.domain)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True, "conversation_id": conv_id}


@app.delete("/api/conversations/{conv_id}")
def delete_conversation(conv_id: str):
    """Permanently deletes a conversation and all its messages."""
    success = db.delete_conversation(conv_id)
    if not success:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True, "deleted_id": conv_id}


@app.delete("/api/conversations/{conv_id}/messages")
def clear_conversation_messages(conv_id: str):
    """Clears all messages from a conversation while preserving session metadata."""
    db.clear_messages(conv_id)
    return {"success": True, "conversation_id": conv_id}


# --- AI Chat Workspace Endpoints ---

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    """
    Standard JSON Chat completion endpoint.
    Routes task, manages conversation context, queries OpenAI SDK,
    and returns assistant response.
    """
    # 1. Store user message in DB
    user_msg_id = str(uuid.uuid4())
    user_attachments = [a.model_dump() for a in (req.attachments or [])]
    
    full_prompt = req.message
    if user_attachments:
        attachment_text = "\n\nAttached Engineering Files:\n"
        for att in user_attachments:
            attachment_text += f"--- {att['name']} ({att['type']}) ---\n{att['content'][:4000]}\n"
        full_prompt += attachment_text

    db.add_message(
        msg_id=user_msg_id,
        conv_id=req.conversation_id,
        role="user",
        content=full_prompt,
        attachments=user_attachments
    )

    # Auto-generate title if this is the first message
    existing_messages = db.get_conversation_messages(req.conversation_id)
    if len(existing_messages) <= 1:
        first_line = req.message.split("\n")[0].strip()
        auto_title = (first_line[:40] + "...") if len(first_line) > 40 else first_line
        classification = classify_task(req.message)
        db.update_conversation(req.conversation_id, title=auto_title, domain=classification["primary_domain"])

    # 2. Build trimmed context for AI
    history = [{"role": m["role"], "content": m["content"]} for m in existing_messages]

    # 3. Generate response via OpenAI SDK
    assistant_content = await ai.generate_chat_response(messages=history)

    # 4. Store assistant message in DB
    assistant_msg_id = str(uuid.uuid4())
    db.add_message(
        msg_id=assistant_msg_id,
        conv_id=req.conversation_id,
        role="assistant",
        content=assistant_content,
        metadata={"model": config.OPENAI_MODEL, "domain": req.domain}
    )

    return {
        "success": True,
        "message_id": assistant_msg_id,
        "role": "assistant",
        "content": assistant_content,
        "conversation_id": req.conversation_id
    }


@app.post("/api/chat/stream")
async def chat_stream_endpoint(req: ChatRequest):
    """
    Server-Sent Events (SSE) streaming chat endpoint.
    Reliably streams real-time token chunks to client.
    """
    user_msg_id = str(uuid.uuid4())
    user_attachments = [a.model_dump() for a in (req.attachments or [])]
    full_prompt = req.message
    if user_attachments:
        attachment_text = "\n\nAttached Engineering Files:\n"
        for att in user_attachments:
            attachment_text += f"--- {att['name']} ({att['type']}) ---\n{att['content'][:4000]}\n"
        full_prompt += attachment_text

    db.add_message(
        msg_id=user_msg_id,
        conv_id=req.conversation_id,
        role="user",
        content=full_prompt,
        attachments=user_attachments
    )

    existing_messages = db.get_conversation_messages(req.conversation_id)
    if len(existing_messages) <= 1:
        first_line = req.message.split("\n")[0].strip()
        auto_title = (first_line[:40] + "...") if len(first_line) > 40 else first_line
        classification = classify_task(req.message)
        db.update_conversation(req.conversation_id, title=auto_title, domain=classification["primary_domain"])

    history = [{"role": m["role"], "content": m["content"]} for m in existing_messages]

    async def event_generator():
        accumulated = []
        try:
            async for chunk in ai.generate_chat_stream(messages=history):
                accumulated.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            full_response = "".join(accumulated)
            assistant_msg_id = str(uuid.uuid4())
            db.add_message(
                msg_id=assistant_msg_id,
                conv_id=req.conversation_id,
                role="assistant",
                content=full_response,
                metadata={"model": config.OPENAI_MODEL, "domain": req.domain}
            )
            yield f"data: {json.dumps({'done': True, 'message_id': assistant_msg_id})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# --- Verified Engineering Calculations Endpoints ---

@app.post("/api/calc/ohms-law")
def calc_ohms_law(data: OhmsLawRequest):
    """Calculate DC Ohm's Law and Power."""
    res = calc.calculate_ohms_law(data.voltage, data.current, data.resistance, data.power)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/rlc")
def calc_rlc(data: RLCRequest):
    """Calculate RLC resonance, Q-factor, bandwidth, and complex impedance."""
    res = calc.calculate_rlc(data.resistance, data.inductance, data.capacitance, data.frequency, data.topology or "series")
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/filter-cutoff")
def calc_filter(data: FilterRequest):
    """Calculate passive RC/RL filter cut-off frequency and component values."""
    res = calc.calculate_filter_cutoff(data.filter_type, data.resistance, data.capacitance, data.inductance, data.target_frequency)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/friis-link-budget")
def calc_friis(data: FriisRequest):
    """Calculate Friis free-space path loss and RF link budget."""
    res = calc.calculate_friis_link_budget(
        data.frequency_hz, data.distance_m, data.tx_power_dbm, data.tx_gain_dbi, data.rx_gain_dbi, data.rx_sensitivity_dbm
    )
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/opamp")
def calc_opamp(data: OpAmpRequest):
    """Calculate Inverting, Non-Inverting, and Buffer Op-Amp voltage gain and 3dB bandwidth."""
    res = calc.calculate_opamp(data.topology, data.rf, data.rin, data.vin, data.gbw_hz)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/antenna-directivity")
def calc_antenna(data: AntennaDirectivityRequest):
    """Calculate antenna directivity and gain using Kraus HPBW approximation."""
    res = calc.calculate_antenna_directivity(data.theta_1_deg, data.theta_2_deg, data.efficiency)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/cmos-delay")
def calc_cmos(data: CMOSDelayRequest):
    """Calculate CMOS inverter propagation delay using Elmore RC model."""
    res = calc.calculate_cmos_delay(data.v_dd, data.c_load_ff, data.r_eq_nmos_kohm, data.mobility_ratio_pn)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/voltage-divider")
def calc_voltage_divider(data: VoltageDividerRequest):
    """Calculate Voltage Divider output and power."""
    res = calc.calculate_voltage_divider(data.vin, data.r1, data.r2, data.r_load)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/current-divider")
def calc_current_divider(data: CurrentDividerRequest):
    """Calculate Current Divider branches and equivalent parallel resistance."""
    res = calc.calculate_current_divider(data.itotal, data.r1, data.r2)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/transient-rc-rl")
def calc_transient(data: TransientRCRLRequest):
    """Calculate RC/RL exponential transient step response."""
    res = calc.calculate_transient_rc_rl(data.circuit_type, data.v_initial, data.v_final, data.r, data.c, data.l, data.t)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/bjt-bias")
def calc_bjt(data: BJTBiasRequest):
    """Calculate BJT Common Emitter Q-point (IB, IC, VCE, active/saturation region)."""
    res = calc.calculate_bjt_bias(data.vcc, data.vbe, data.rb, data.rc, data.re, data.beta)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/timer-555")
def calc_timer_555(data: Timer555Request):
    """Calculate 555 Astable frequency, period, and duty cycle."""
    res = calc.calculate_555_timer_astable(data.ra_ohm, data.rb_ohm, data.c_farad)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/number-base")
def calc_number_base(data: NumberBaseRequest):
    """Convert number across binary, decimal, octal, hex, and 2's complement."""
    res = calc.calculate_number_base_conversion(data.value_str, data.from_base)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/timing-slack")
def calc_timing_slack(data: TimingSlackRequest):
    """Calculate synchronous digital setup/hold slack and maximum clock frequency."""
    res = calc.calculate_timing_slack(
        data.t_clk_period_ns, data.t_cq_ns, data.t_comb_max_ns, data.t_comb_min_ns,
        data.t_setup_ns, data.t_hold_ns, data.clock_skew_ns
    )
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/fir-filter")
def calc_fir(data: FIRFilterRequest):
    """Generate linear-phase FIR low-pass filter taps via windowed sinc method."""
    res = calc.calculate_fir_filter_taps(data.num_taps, data.cutoff_normalized, data.window_type)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/vswr-return-loss")
def calc_vswr(data: VSWRRequest):
    """Calculate RF reflection coefficient, VSWR, and return loss."""
    res = calc.calculate_vswr_and_return_loss(
        data.reflection_coeff_mag, data.vswr, data.return_loss_db, data.z_load_ohm, data.z0_ohm
    )
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/shannon-capacity")
def calc_shannon(data: ShannonCapacityRequest):
    """Calculate theoretical Shannon-Hartley channel capacity and spectral efficiency."""
    res = calc.calculate_shannon_capacity(data.bandwidth_hz, data.snr_db)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/pcm-snr")
def calc_pcm_snr(data: PCMSNRRequest):
    """Calculate PCM quantization SQNR and level count."""
    res = calc.calculate_pcm_snr(data.num_bits)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/complex-math")
def calc_complex_math(data: ComplexArithmeticRequest):
    """Convert complex impedance / number between rectangular and polar/Euler forms."""
    res = calc.calculate_complex_arithmetic(data.real, data.imag)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/db-conversion")
def calc_db_conversion(data: DBConversionRequest):
    """Perform engineering dBm, Watts, and ratio conversions."""
    res = calc.calculate_db_conversion(data.val, data.conversion_type)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


# --- Circuit Solver Endpoints ---

@app.post("/api/circuit/solve")
def solve_circuit_api(req: NetlistSolveRequest):
    """
    Deterministic Modified Nodal Analysis (MNA) DC circuit solver.
    Solves all node voltages, branch currents, powers, conservation residuals,
    and returns a verified SVG schematic.
    """
    try:
        if req.components:
            comps = req.components
        elif req.netlist:
            comps = circuit_solver.parse_spice_netlist(req.netlist)
        else:
            raise HTTPException(status_code=400, detail="Must provide either 'netlist' text or 'components' list.")

        result = circuit_solver.solve_dc_circuit(comps, req.ground_node)
        return result
    except circuit_solver.CircuitParseError as e:
        raise HTTPException(status_code=400, detail=f"Netlist Syntax Error: {str(e)}")
    except circuit_solver.CircuitValidationError as e:
        raise HTTPException(status_code=400, detail=f"Circuit Validation Error: {str(e)}")
    except circuit_solver.CircuitSingularMatrixError as e:
        raise HTTPException(status_code=400, detail=f"Singular Matrix: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solver Error: {str(e)}")


@app.post("/api/circuit/parse")
def parse_netlist_api(req: NetlistParseRequest):
    """Parses raw SPICE netlist text into structured CircuitComponent elements."""
    try:
        comps = circuit_solver.parse_spice_netlist(req.netlist)
        return {"success": True, "num_components": len(comps), "components": comps}
    except circuit_solver.CircuitParseError as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- High-Precision Calculation Engine Endpoints ---

@app.post("/api/calc/convert-units")
def convert_units_api(req: UnitConvertRequest):
    res = calc_engine.convert_units(req.category, req.value, req.from_unit, req.to_unit)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/resistor-network")
def calc_resistor_network_api(req: ResistorNetworkRequest):
    res = calc_engine.calculate_resistor_network(req.topology, req.resistors)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/ohms-law-exact")
def calc_ohms_law_exact_api(req: OhmsLawExactRequest):
    res = calc_engine.calculate_ohms_law_exact(req.voltage, req.current, req.resistance, req.power)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/complex-impedance")
def calc_complex_impedance_api(req: ComplexImpedanceRequest):
    res = calc_engine.calculate_complex_impedance(req.resistance, req.inductance, req.capacitance, req.frequency, req.topology)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/frequency-wavelength")
def calc_frequency_wavelength_api(req: FrequencyWavelengthRequest):
    res = calc_engine.calculate_frequency_wavelength(req.frequency, req.wavelength, req.relative_permittivity)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/antenna-properties")
def calc_antenna_properties_api(req: AntennaPropertiesRequest):
    res = calc_engine.calculate_antenna_properties(req.antenna_type, req.hpbw_theta_1_deg, req.hpbw_theta_2_deg, req.efficiency, req.frequency_hz)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/thermal-noise")
def calc_thermal_noise_api(req: ThermalNoiseRequest):
    res = calc_engine.calculate_thermal_noise_floor(req.bandwidth_hz, req.temperature_k, req.noise_figure_db)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


@app.post("/api/calc/fir-filter-spectrum")
def calc_fir_filter_spectrum_api(req: FirFilterSpectrumRequest):
    res = calc_engine.calculate_fir_filter_design(req.num_taps, req.cutoff_normalized, req.filter_type, req.window_type)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res


# --- Simulation Tool Integration Endpoints ---

@app.get("/api/sim/status")
def get_simulators_status():
    """Returns real installation status, version, and setup guides for external simulation engines."""
    return simulators.sim_manager.get_all_tools_status()


@app.post("/api/sim/verilog")
def run_verilog_simulation_api(req: VerilogSimRequest):
    """
    Executes or lints Verilog simulation in a sandboxed directory with timeout.
    If Icarus Verilog is not installed, executes the structural HDL linter and returns setup instructions.
    """
    return simulators.sim_manager.run_verilog_simulation(req.code, req.testbench_code, req.timeout_sec)


@app.post("/api/sim/verilog/lint")
def lint_verilog_api(req: VerilogLintRequest):
    """Directly executes the deterministic Verilog structural linter."""
    return simulators.sim_manager.lint_verilog_code(req.code)


# --- File Upload Endpoints ---

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/api/upload")
async def upload_file_api(file: UploadFile = File(...)):
    """
    Handles secure file uploads: images, Verilog (.v, .sv), SPICE netlists (.cir, .sp), MATLAB (.m), text (.txt).
    Validates file size (max 10MB) and extension.
    Extracts text previews for code/netlists.
    Never executes uploaded files automatically.
    """
    allowed_extensions = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".v", ".sv", ".cir", ".sp", ".m", ".txt", ".pdf", ".csv"}
    filename = file.filename or "upload.bin"
    ext = os.path.splitext(filename)[1].lower()

    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(allowed_extensions))}"
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds maximum limit of 10 MB.")

    file_id = str(uuid.uuid4())
    safe_name = f"{file_id}_{os.path.basename(filename)}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)

    with open(file_path, "wb") as f:
        f.write(content)

    is_text = ext in {".v", ".sv", ".cir", ".sp", ".m", ".txt", ".csv"}
    text_content = None
    if is_text:
        try:
            text_content = content.decode("utf-8", errors="replace")
        except Exception:
            pass

    return {
        "success": True,
        "file_id": file_id,
        "filename": filename,
        "extension": ext,
        "size_bytes": len(content),
        "is_text": is_text,
        "text_preview": text_content[:2000] if text_content else None,
        "content_type": file.content_type
    }


# --- Domain Workflows Endpoint ---

@app.get("/api/workflows")
def get_all_workflows():
    """Returns domain workflows, checklists, and assumptions for all 12 modules."""
    return DOMAIN_WORKFLOWS


# --- Enhanced Export Report Endpoint ---

@app.get("/api/export/{conv_id}")
def export_conversation(conv_id: str, format: str = Query("markdown", pattern="^(markdown|json|csv|html)$")):
    """Export conversation session as formatted Markdown, JSON, CSV, or HTML report."""
    conv = db.get_conversation_by_id(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = db.get_conversation_messages(conv_id)

    title = conv.get("title", "CircuitX Engineering Report")
    domain = conv.get("domain", "general").replace("_", " ").title()
    date_str = conv.get("created_at", "")[:10]

    if format == "json":
        return JSONResponse(content={"conversation": conv, "messages": messages})

    elif format == "csv":
        import io
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Message_ID", "Role", "Timestamp", "Domain", "Content"])
        for msg in messages:
            writer.writerow([msg["id"], msg["role"], msg.get("created_at", ""), domain, msg["content"]])
        return PlainTextResponse(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="CircuitX_{conv_id[:8]}.csv"'}
        )

    elif format == "html":
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{title} - CircuitX Report</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0B1120; color: #E2E8F0; padding: 2rem; max-width: 900px; margin: auto; }}
    h1 {{ color: #00E5FF; border-bottom: 2px solid #1E293B; padding-bottom: 0.5rem; }}
    .meta {{ color: #94A3B8; font-size: 0.9rem; margin-bottom: 2rem; }}
    .message {{ background: #0F172A; border: 1px solid #1E293B; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; }}
    .user {{ border-left: 4px solid #38BDF8; }}
    .assistant {{ border-left: 4px solid #00E5FF; }}
    .role {{ font-weight: bold; font-size: 0.85rem; text-transform: uppercase; margin-bottom: 0.5rem; color: #38BDF8; }}
    pre {{ background: #020617; padding: 1rem; border-radius: 6px; overflow-x: auto; color: #38BDF8; font-family: monospace; }}
  </style>
</head>
<body>
  <h1>{title}</h1>
  <div class="meta">Domain: <strong>{domain}</strong> | Date: <strong>{date_str}</strong> | Generated by: <strong>CircuitX Engineering Assistant</strong></div>
"""
        for msg in messages:
            css_class = "user" if msg["role"] == "user" else "assistant"
            role_title = "User Query" if msg["role"] == "user" else "CircuitX Analysis"
            escaped_content = msg["content"].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br>")
            html += f"""  <div class="message {css_class}">
    <div class="role">{role_title}</div>
    <div>{escaped_content}</div>
  </div>\n"""
        html += "</body>\n</html>"
        return PlainTextResponse(
            content=html,
            media_type="text/html",
            headers={"Content-Disposition": f'attachment; filename="CircuitX_{conv_id[:8]}.html"'}
        )

    # Default: Markdown
    md = f"# {title}\n\n"
    md += f"**Domain:** {domain}  \n"
    md += f"**Generated by:** CircuitX — Universal Electronics Engineering AI Assistant  \n"
    md += f"**Date:** {date_str}  \n\n"
    md += "---\n\n"

    for msg in messages:
        role_label = "👤 **User Query**" if msg["role"] == "user" else "⚡ **CircuitX Engineering Analysis**"
        md += f"### {role_label}\n\n"
        md += f"{msg['content']}\n\n"
        md += "---\n\n"

    return PlainTextResponse(
        content=md,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="CircuitX_{conv_id[:8]}.md"'}
    )
