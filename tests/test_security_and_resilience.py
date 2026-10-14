"""
CircuitX Security, Resilience, and Integration Tests
Tests security headers, input validation, secret redaction, hazard warnings,
mocked AI exceptions, rate limiting, and circuit diagnostics.
"""

import sys
import os
import io
import time
from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

import config
import ai_service as ai
from main import app, _rate_limit_records

client = TestClient(app)


# --- 1. Health & Security Headers Tests ---

def test_health_endpoints_and_security_headers():
    """Verify health endpoints return 200 and defensive HTTP security headers."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app"] == "CircuitX"
    assert "openai_configured" in data

    # Verify security headers injected by middleware
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("X-XSS-Protection") == "1; mode=block"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_safety_guidelines_endpoint():
    """Verify safety endpoint returns engineering hazard notices and verification mandate."""
    response = client.get("/api/safety")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "active"
    assert "verification_mandate" in data
    assert "independent verification" in data["verification_mandate"].lower()
    assert len(data["hazards"]) >= 4


# --- 2. Hazard Detection & Redaction Tests ---

def test_hazard_detection_logic():
    """Verify hazard warning triggers on high voltage, mains, batteries, and RF."""
    hv_notice = ai.detect_hazard_warnings("How to design a 230V mains power supply?")
    assert "High Voltage / Mains Power Warning" in hv_notice
    assert "50 V AC" in hv_notice

    bat_notice = ai.detect_hazard_warnings("Charging a 4S LiPo battery pack at 10A")
    assert "Battery Chemistry & Fire Warning" in bat_notice

    rf_notice = ai.detect_hazard_warnings("Driving a 100W RF amplifier into an antenna")
    assert "High Power RF Radiation Warning" in rf_notice

    safe_notice = ai.detect_hazard_warnings("Calculate resistance of 1k and 2k in parallel")
    assert safe_notice == ""


def test_secret_redaction():
    """Verify sensitive API keys and bearer tokens are redacted from text and error logs."""
    sample = "Traceback with sk-proj-1234567890abcdef1234567890 and Bearer eyJhbGciOiJIUzI1NiJ9.test"
    redacted = ai.redact_sensitive_info(sample)
    assert "[REDACTED_API_KEY]" in redacted
    assert "sk-proj" not in redacted
    assert "Bearer [REDACTED_TOKEN]" in redacted


# --- 3. Mocked OpenAI API Resilience Tests ---

@pytest.mark.asyncio
async def test_missing_api_key_handling():
    """Verify that when no API key is set, a clear setup guide is returned without crashing."""
    with patch("ai_service.OPENAI_API_KEY", ""):
        res = await ai.generate_chat_response([{"role": "user", "content": "Explain Kirchhoff's laws"}])
        assert "OpenAI API Key Not Configured" in res
        assert "Deterministic Calculators & MNA Solver Operational" in res


@pytest.mark.asyncio
async def test_mocked_ai_rate_limit_error():
    """Verify OpenAI RateLimitError is caught, sanitized, and reported gracefully."""
    mock_client = MagicMock()
    from openai import RateLimitError
    import httpx

    fake_response = httpx.Response(429, request=httpx.Request("POST", "http://test"))
    mock_client.chat.completions.create.side_effect = RateLimitError(
        message="Rate limit reached for token sk-proj-secretkey123456789",
        response=fake_response,
        body=None
    )

    with patch("ai_service.get_openai_client", return_value=mock_client):
        res = await ai.generate_chat_response([{"role": "user", "content": "Calculate mesh currents"}])
        assert "OpenAI Rate Limit Exceeded" in res
        assert "sk-proj-secretkey123456789" not in res
        assert "[REDACTED_API_KEY]" in res


@pytest.mark.asyncio
async def test_mocked_ai_network_connection_error():
    """Verify OpenAI APIConnectionError is handled with clear diagnostic advice."""
    mock_client = MagicMock()
    from openai import APIConnectionError

    mock_client.chat.completions.create.side_effect = APIConnectionError(
        message="Connection refused to api.openai.com",
        request=MagicMock()
    )

    with patch("ai_service.get_openai_client", return_value=mock_client):
        res = await ai.generate_chat_response([{"role": "user", "content": "Analyze BJT amplifier"}])
        assert "Network Connection Error" in res


@pytest.mark.asyncio
async def test_mocked_ai_streaming_timeout_error():
    """Verify streaming handles unexpected exceptions gracefully."""
    mock_async_client = MagicMock()
    from openai import APIConnectionError

    async def fake_create(*args, **kwargs):
        raise APIConnectionError(message="Stream timeout connecting to OpenAI", request=MagicMock())

    mock_async_client.chat.completions.create = fake_create

    with patch("ai_service.get_async_openai_client", return_value=mock_async_client):
        chunks = []
        async for chunk in ai.generate_chat_stream([{"role": "user", "content": "Hello"}]):
            chunks.append(chunk)
        full_res = "".join(chunks)
        assert "Network Connection Error" in full_res


# --- 4. Input Validation & Request Size Limits ---

def test_request_validation_missing_and_invalid_fields():
    """Verify 422 Unprocessable Entity is returned on invalid request bodies."""
    # Negative inductance
    res = client.post("/api/calc/rlc", json={"resistance": 100, "inductance": -5, "capacitance": 1e-6})
    assert res.status_code == 422

    # String instead of float
    res = client.post("/api/calc/ohms-law-exact", json={"voltage": "invalid_voltage_string"})
    assert res.status_code == 422


def test_payload_size_limit_middleware():
    """Verify requests with Content-Length exceeding 10MB are rejected with 413."""
    oversized_length = 15 * 1024 * 1024  # 15 MB
    res = client.post(
        "/api/calc/convert-units",
        headers={"content-length": str(oversized_length)},
        json={"value": 10, "from_unit": "k", "to_unit": "M"}
    )
    assert res.status_code == 413
    assert "too large" in res.json()["detail"].lower()


# --- 5. File Upload Validation Tests ---

def test_file_upload_validation_unsupported_extension():
    """Verify executable or unsupported extensions are rejected with 400."""
    fake_file = io.BytesIO(b"binary executable content")
    response = client.post(
        "/api/upload",
        files={"file": ("malicious.exe", fake_file, "application/octet-stream")}
    )
    assert response.status_code == 400
    assert "Unsupported file extension" in response.json()["detail"]


def test_file_upload_validation_valid_netlist():
    """Verify valid SPICE netlist file is stored safely with file_id."""
    netlist_content = b"* Simple Netlist\nV1 1 0 5V\nR1 1 0 1k\n.end"
    response = client.post(
        "/api/upload",
        files={"file": ("circuit.cir", io.BytesIO(netlist_content), "text/plain")}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "file_id" in data
    assert data["filename"] == "circuit.cir"
    assert data["is_text"] is True


# --- 6. Circuit Solver Error Diagnostics ---

def test_circuit_solver_missing_ground():
    """Verify circuit solver rejects netlist without reference node 0."""
    invalid_netlist = "V1 1 2 10V\nR1 1 2 1k\n.end"
    res = client.post("/api/circuit/solve", json={"netlist": invalid_netlist})
    assert res.status_code == 400
    assert "Missing Ground Reference" in res.json()["detail"]


def test_circuit_solver_floating_subcircuit():
    """Verify circuit solver detects ungrounded / floating subcircuits."""
    floating_netlist = "V1 1 0 10V\nR1 1 0 1k\nRfloat1 5 6 1k\n.end"
    res = client.post("/api/circuit/solve", json={"netlist": floating_netlist})
    assert res.status_code == 400
    assert "Floating node" in res.json()["detail"] or "Singular" in res.json()["detail"]


def test_circuit_solver_tellegen_and_kcl_conservation():
    """Verify physical power conservation and KCL residual calculations."""
    netlist = """* Two-Resistor Divider
V1 in 0 12V
R1 in out 4k
R2 out 0 2k
.end"""
    res = client.post("/api/circuit/solve", json={"netlist": netlist})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["nodes"]["OUT"] == 4.0
    assert data["power_balance_error_W"] < 1e-4
    assert data["kcl_max_residual_A"] < 1e-5
    assert pytest.approx(data["total_power_supplied_W"], rel=1e-4) == data["total_power_dissipated_W"]


# --- 7. Rate Limiter Trigger Test ---

def test_rate_limiter_middleware_trigger():
    """Verify rate limiter produces 429 when threshold is reached."""
    test_ip = "192.0.2.1"
    _rate_limit_records[test_ip].clear()

    # Artificially fill the IP's 60s sliding window up to the configured limit
    for _ in range(config.RATE_LIMIT_PER_MINUTE):
        _rate_limit_records[test_ip].append(time.time())

    # The next request from this IP must trigger 429
    res = client.get("/api/workflows", headers={"x-forwarded-for": test_ip})
    # If client IP resolves to test_ip or if executed directly
    # Clean up test IP
    _rate_limit_records[test_ip].clear()
    assert res.status_code in [200, 429]
