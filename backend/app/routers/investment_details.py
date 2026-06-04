from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session

from ..crud.audit_log import create_audit_log
from ..crud.investment_detail import (
    create_investment_detail,
    delete_investment_detail,
    get_investment_detail_by_id,
    get_investment_details,
    get_investment_options_for_details,
    update_investment_detail,
)
from ..database import get_session
from ..deps import get_current_user, require_permission
from ..models.user import User
from ..schemas.investment_detail import (
    InvestmentDetailCreate,
    InvestmentDetailInvestmentOptionRead,
    InvestmentDetailList,
    InvestmentDetailRead,
    InvestmentDetailUpdate,
)

router = APIRouter(prefix="/investment-details", tags=["investment-details"])


def _handle_validation_error(exc: ValueError) -> None:
    message = str(exc)
    code = status.HTTP_404_NOT_FOUND if message.endswith("not found") else status.HTTP_400_BAD_REQUEST
    raise HTTPException(status_code=code, detail=message)


@router.get("", response_model=InvestmentDetailList)
def list_investment_details(
    search: str | None = None,
    asset_management_company_id: int | None = None,
    investment_type_id: int | None = None,
    investment_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    sort_by: str = "investment_date",
    sort_dir: str = "desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
):
    return get_investment_details(
        session,
        search=search,
        asset_management_company_id=asset_management_company_id,
        investment_type_id=investment_type_id,
        investment_id=investment_id,
        from_date=from_date,
        to_date=to_date,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
    )


@router.get("/options/investments", response_model=list[InvestmentDetailInvestmentOptionRead])
def list_investment_options(
    asset_management_company_id: int,
    investment_type_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
):
    return get_investment_options_for_details(
        session,
        asset_management_company_id=asset_management_company_id,
        investment_type_id=investment_type_id,
    )


@router.get("/{investment_detail_id}", response_model=InvestmentDetailRead)
def get_investment_detail_endpoint(
    investment_detail_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(get_current_user),
):
    item = get_investment_detail_by_id(session, investment_detail_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment detail not found")
    from ..crud.investment_detail import _to_read

    return _to_read(item, session)


@router.post("", response_model=InvestmentDetailRead, status_code=status.HTTP_201_CREATED)
def create_investment_detail_endpoint(
    data: InvestmentDetailCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("investment_details.create")),
):
    try:
        result = create_investment_detail(session, data, current_user.id)
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_detail",
            entity_id=result.id,
            action="create",
            details={"new": result.model_dump(mode="json")},
        )
        return result
    except ValueError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_detail",
            entity_id=None,
            action="create_failed",
            details={"data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        _handle_validation_error(exc)
    except FileExistsError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_detail",
            entity_id=None,
            action="create_failed",
            details={"data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.put("/{investment_detail_id}", response_model=InvestmentDetailRead)
def update_investment_detail_endpoint(
    investment_detail_id: int,
    data: InvestmentDetailUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("investment_details.update")),
):
    existing = get_investment_detail_by_id(session, investment_detail_id)
    if existing is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_detail",
            entity_id=investment_detail_id,
            action="update_failed",
            details={"reason": "not_found"},
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment detail not found")
    from ..crud.investment_detail import _to_read

    before = _to_read(existing, session).model_dump(mode="json")
    try:
        result = update_investment_detail(session, investment_detail_id, data, current_user.id)
    except ValueError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_detail",
            entity_id=investment_detail_id,
            action="update_failed",
            details={"old": before, "data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        _handle_validation_error(exc)
    except FileExistsError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_detail",
            entity_id=investment_detail_id,
            action="update_failed",
            details={"old": before, "data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="investment_detail",
        entity_id=investment_detail_id,
        action="update",
        details={"old": before, "new": result.model_dump(mode="json")},
    )
    return result


@router.delete("/{investment_detail_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_investment_detail_endpoint(
    investment_detail_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_permission("investment_details.delete")),
):
    existing = get_investment_detail_by_id(session, investment_detail_id)
    if existing is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="investment_detail",
            entity_id=investment_detail_id,
            action="delete_failed",
            details={"reason": "not_found"},
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment detail not found")
    from ..crud.investment_detail import _to_read

    before = _to_read(existing, session).model_dump(mode="json")
    delete_investment_detail(session, investment_detail_id)
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="investment_detail",
        entity_id=investment_detail_id,
        action="delete",
        details={"old": before},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
