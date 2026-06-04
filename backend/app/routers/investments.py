from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session

from ..crud.audit_log import create_audit_log
from ..crud.investment import (
    create_investment,
    delete_investment,
    get_investment_by_id,
    get_investment_types_for_company,
    get_investments,
    update_investment,
)
from ..database import get_session
from ..deps import get_current_user, require_permission
from ..models.user import User
from ..schemas.investment import (
    InvestmentCreate,
    InvestmentList,
    InvestmentRead,
    InvestmentTypeOptionRead,
    InvestmentUpdate,
)

router = APIRouter(prefix="/investments", tags=["investments"])


def _handle_validation_error(exc: ValueError) -> None:
    message = str(exc)
    code = status.HTTP_404_NOT_FOUND if message.endswith("not found") else status.HTTP_400_BAD_REQUEST
    raise HTTPException(status_code=code, detail=message)


@router.get("", response_model=InvestmentList)
def list_investments(
    search: str | None = None,
    asset_management_company_id: int | None = None,
    investment_type_id: int | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    session: Session = Depends(get_session),
    _: User = Depends(require_permission("investments.view")),
):
    try:
        return get_investments(
            session,
            search=search,
            asset_management_company_id=asset_management_company_id,
            investment_type_id=investment_type_id,
            status=status_filter,
            sort_by=sort_by,
            sort_dir=sort_dir,
            page=page,
            page_size=page_size,
        )
    except ValueError as exc:
        _handle_validation_error(exc)


@router.get("/options/investment-types", response_model=list[InvestmentTypeOptionRead])
def list_investment_type_options(
    asset_management_company_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
):
    return get_investment_types_for_company(session, asset_management_company_id)


@router.get("/{investment_id}", response_model=InvestmentRead)
def get_investment_endpoint(
    investment_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_permission("investments.view")),
):
    item = get_investment_by_id(session, investment_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment not found")
    from ..crud.investment import _to_read

    return _to_read(item, session)


@router.post("", response_model=InvestmentRead, status_code=status.HTTP_201_CREATED)
def create_investment_endpoint(
    data: InvestmentCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("investments.create")),
):
    try:
        result = create_investment(session, data, current_user.id)
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment",
            entity_id=result.id,
            action="create",
            details={"new": result.model_dump(mode="json")},
        )
        return result
    except ValueError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment",
            entity_id=None,
            action="create_failed",
            details={"data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        _handle_validation_error(exc)
    except FileExistsError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment",
            entity_id=None,
            action="create_failed",
            details={"data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.put("/{investment_id}", response_model=InvestmentRead)
def update_investment_endpoint(
    investment_id: int,
    data: InvestmentUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("investments.update")),
):
    existing = get_investment_by_id(session, investment_id)
    if existing is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment",
            entity_id=investment_id,
            action="update_failed",
            details={"reason": "not_found"},
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment not found")
    from ..crud.investment import _to_read

    before = _to_read(existing, session).model_dump(mode="json")
    try:
        result = update_investment(session, investment_id, data, current_user.id)
    except ValueError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment",
            entity_id=investment_id,
            action="update_failed",
            details={"old": before, "data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        _handle_validation_error(exc)
    except FileExistsError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment",
            entity_id=investment_id,
            action="update_failed",
            details={"old": before, "data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="investment",
        entity_id=investment_id,
        action="update",
        details={"old": before, "new": result.model_dump(mode="json")},
    )
    return result


@router.delete("/{investment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investment_endpoint(
    investment_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("investments.delete")),
):
    existing = get_investment_by_id(session, investment_id)
    if existing is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment",
            entity_id=investment_id,
            action="delete_failed",
            details={"reason": "not_found"},
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment not found")
    from ..crud.investment import _to_read

    before = _to_read(existing, session).model_dump(mode="json")
    result = delete_investment(session, investment_id)
    if result is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment",
            entity_id=investment_id,
            action="delete_failed",
            details={"old": before, "reason": "referenced"},
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete investment with associated records",
        )
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="investment",
        entity_id=investment_id,
        action="delete",
        details={"old": before},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
