from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session

from ..crud.audit_log import create_audit_log
from ..crud.investment_type import (
    create_investment_type,
    delete_investment_type,
    get_investment_type_by_id,
    get_investment_types,
    update_investment_type,
    update_investment_type_status,
)
from ..database import get_session
from ..deps import require_permission
from ..models.user import User
from ..schemas.investment_type import (
    InvestmentTypeCreate,
    InvestmentTypeList,
    InvestmentTypeRead,
    InvestmentTypeStatusUpdate,
    InvestmentTypeUpdate,
)

router = APIRouter(prefix="/investment-types", tags=["investment-types"])


def _handle_validation_error(exc: ValueError) -> None:
    message = str(exc)
    code = status.HTTP_404_NOT_FOUND if message.endswith("not found") else status.HTTP_400_BAD_REQUEST
    raise HTTPException(status_code=code, detail=message)


@router.get("", response_model=InvestmentTypeList)
def list_investment_types(
    search: str | None = None,
    asset_management_company_id: int | None = None,
    investment_type_name: str | None = None,
    is_active: bool | None = None,
    sort_by: str = "investment_type_name",
    sort_dir: str = "asc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    session: Session = Depends(get_session),
    _: User = Depends(require_permission("investment_types.view")),
):
    return get_investment_types(
        session,
        search=search,
        asset_management_company_id=asset_management_company_id,
        investment_type_name=investment_type_name,
        is_active=is_active,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
    )


@router.get("/{investment_type_id}", response_model=InvestmentTypeRead)
def get_investment_type_endpoint(
    investment_type_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_permission("investment_types.view")),
):
    item = get_investment_type_by_id(session, investment_type_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment type not found")
    from ..crud.investment_type import _to_read

    return _to_read(item, session)


@router.post("", response_model=InvestmentTypeRead, status_code=status.HTTP_201_CREATED)
def create_investment_type_endpoint(
    data: InvestmentTypeCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("investment_types.create")),
):
    try:
        result = create_investment_type(session, data, current_user.id)
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_type",
            entity_id=result.id,
            action="create",
            details={"new": result.model_dump(mode="json")},
        )
        return result
    except ValueError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_type",
            entity_id=None,
            action="create_failed",
            details={"data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        _handle_validation_error(exc)
    except FileExistsError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_type",
            entity_id=None,
            action="create_failed",
            details={"data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.put("/{investment_type_id}", response_model=InvestmentTypeRead)
def update_investment_type_endpoint(
    investment_type_id: int,
    data: InvestmentTypeUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("investment_types.update")),
):
    existing = get_investment_type_by_id(session, investment_type_id)
    if existing is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_type",
            entity_id=investment_type_id,
            action="update_failed",
            details={"reason": "not_found"},
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment type not found")
    from ..crud.investment_type import _to_read

    before = _to_read(existing, session).model_dump(mode="json")
    try:
        result = update_investment_type(session, investment_type_id, data, current_user.id)
    except ValueError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_type",
            entity_id=investment_type_id,
            action="update_failed",
            details={"old": before, "data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        _handle_validation_error(exc)
    except FileExistsError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_type",
            entity_id=investment_type_id,
            action="update_failed",
            details={"old": before, "data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="investment_type",
        entity_id=investment_type_id,
        action="update",
        details={"old": before, "new": result.model_dump(mode="json")},
    )
    return result


@router.patch("/{investment_type_id}/status", response_model=InvestmentTypeRead)
def update_investment_type_status_endpoint(
    investment_type_id: int,
    data: InvestmentTypeStatusUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("investment_types.update")),
):
    existing = get_investment_type_by_id(session, investment_type_id)
    if existing is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_type",
            entity_id=investment_type_id,
            action="status_update_failed",
            details={"is_active": data.is_active, "reason": "not_found"},
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment type not found")
    from ..crud.investment_type import _to_read

    before = _to_read(existing, session).model_dump(mode="json")
    result = update_investment_type_status(
        session,
        investment_type_id,
        data.is_active,
        current_user.id,
    )
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="investment_type",
        entity_id=investment_type_id,
        action="status_update",
        details={"old": before, "new": result.model_dump(mode="json")},
    )
    return result


@router.delete("/{investment_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investment_type_endpoint(
    investment_type_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("investment_types.delete")),
):
    existing = get_investment_type_by_id(session, investment_type_id)
    if existing is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_type",
            entity_id=investment_type_id,
            action="delete_failed",
            details={"reason": "not_found"},
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment type not found")
    from ..crud.investment_type import _to_read

    before = _to_read(existing, session).model_dump(mode="json")
    result = delete_investment_type(session, investment_type_id)
    if result is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_type",
            entity_id=investment_type_id,
            action="delete_failed",
            details={"old": before, "reason": "referenced"},
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete investment type with associated records",
        )
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="investment_type",
        entity_id=investment_type_id,
        action="delete",
        details={"old": before},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
