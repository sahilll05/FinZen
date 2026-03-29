"""
Intelligence audit logging service.
Stores append-only JSONL records for compliance and traceability.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict
from uuid import uuid4


_AUDIT_PATH = Path(__file__).resolve().parents[2] / "data" / "intelligence_audit.jsonl"


def log_intelligence_audit(event: Dict[str, Any]) -> str:
    """Append an intelligence audit event and return the generated audit_id."""
    _AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)

    audit_id = str(uuid4())
    record = {
        "audit_id": audit_id,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        **event,
    }

    with _AUDIT_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=True) + "\n")

    return audit_id
