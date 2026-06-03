import json
from typing import Any

from sqlmodel import Session

from ..models.audit_log import AuditLog


def create_audit_log(
    session: Session,
    *,
    actor_user_id: int | None,
    entity_type: str,
    entity_id: int | None,
    action: str,
    details: dict[str, Any],
) -> AuditLog:
    entry = AuditLog(
        actor_user_id=actor_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        details=json.dumps(details, ensure_ascii=False, sort_keys=True, default=str),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry
