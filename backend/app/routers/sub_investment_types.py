from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlmodel import Session

from ..crud.audit_log import create_audit_log
from ..crud.sub_investment_type import (
    create_sub_investment_type,
    delete_sub_investment_type,
    get_sub_investment_type_by_id,
    get_sub_investment_types,
    update_sub_investment_type,
    update_sub_investment_type_status,
)
from ..database import get_session
from ..deps import require_admin
from ..models.user import User
from ..schemas.sub_investment_type import (
    SubInvestmentTypeCreate,
    SubInvestmentTypeList,
    SubInvestmentTypeRead,
    SubInvestmentTypeStatusUpdate,
    SubInvestmentTypeUpdate,
)

router = APIRouter(prefix="/sub-investment-types", tags=["sub-investment-types"])


def _handle_validation_error(exc: ValueError) -> None:
    message = str(exc)
    code = status.HTTP_404_NOT_FOUND if message.endswith("not found") else status.HTTP_400_BAD_REQUEST
    raise HTTPException(status_code=code, detail=message)


@router.get("", response_model=SubInvestmentTypeList)
def list_sub_investment_types(
    search: str | None = None,
    asset_management_company_id: int | None = None,
    investment_type: str | None = None,
    is_active: bool | None = None,
    sort_by: str = "name",
    sort_dir: str = "asc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
):
    return get_sub_investment_types(
        session,
        search=search,
        asset_management_company_id=asset_management_company_id,
        investment_type=investment_type,
        is_active=is_active,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
    )


@router.get("/{sub_investment_type_id}", response_model=SubInvestmentTypeRead)
def get_sub_investment_type_endpoint(
    sub_investment_type_id: int,
    session: Session = Depends(get_session),
    _: User = Depends(require_admin),
):
    item = get_sub_investment_type_by_id(session, sub_investment_type_id)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sub-investment type not found")
    from ..crud.sub_investment_type import _to_read

    return _to_read(item, session)


@router.post("", response_model=SubInvestmentTypeRead, status_code=status.HTTP_201_CREATED)
def create_sub_investment_type_endpoint(
    data: SubInvestmentTypeCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    try:
        result = create_sub_investment_type(session, data, current_user.id)
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="sub_investment_type",
            entity_id=result.id,
            action="create",
            details={"new": result.model_dump(mode="json")},
        )
        return result
    except ValueError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="sub_investment_type",
            entity_id=None,
            action="create_failed",
            details={"data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        _handle_validation_error(exc)
    except FileExistsError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="sub_investment_type",
            entity_id=None,
            action="create_failed",
            details={"data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))


@router.put("/{sub_investment_type_id}", response_model=SubInvestmentTypeRead)
def update_sub_investment_type_endpoint(
    sub_investment_type_id: int,
    data: SubInvestmentTypeUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    existing = get_sub_investment_type_by_id(session, sub_investment_type_id)
    if existing is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="sub_investment_type",
            entity_id=sub_investment_type_id,
            action="update_failed",
            details={"reason": "not_found"},
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sub-investment type not found")
    from ..crud.sub_investment_type import _to_read

    before = _to_read(existing, session).model_dump(mode="json")
    try:
        result = update_sub_investment_type(session, sub_investment_type_id, data, current_user.id)
    except ValueError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="sub_investment_type",
            entity_id=sub_investment_type_id,
            action="update_failed",
            details={"old": before, "data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        _handle_validation_error(exc)
    except FileExistsError as exc:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="sub_investment_type",
            entity_id=sub_investment_type_id,
            action="update_failed",
            details={"old": before, "data": data.model_dump(mode="json"), "reason": str(exc)},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="sub_investment_type",
        entity_id=sub_investment_type_id,
        action="update",
        details={"old": before, "new": result.model_dump(mode="json")},
    )
    return result


@router.patch("/{sub_investment_type_id}/status", response_model=SubInvestmentTypeRead)
def update_sub_investment_type_status_endpoint(
    sub_investment_type_id: int,
    data: SubInvestmentTypeStatusUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    existing = get_sub_investment_type_by_id(session, sub_investment_type_id)
    if existing is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="sub_investment_type",
            entity_id=sub_investment_type_id,
            action="status_update_failed",
            details={"is_active": data.is_active, "reason": "not_found"},
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sub-investment type not found")
    from ..crud.sub_investment_type import _to_read

    before = _to_read(existing, session).model_dump(mode="json")
    result = update_sub_investment_type_status(
        session,
        sub_investment_type_id,
        data.is_active,
        current_user.id,
    )
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="sub_investment_type",
        entity_id=sub_investment_type_id,
        action="status_update",
        details={"old": before, "new": result.model_dump(mode="json")},
    )
    return result


@router.delete("/{sub_investment_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sub_investment_type_endpoint(
    sub_investment_type_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_admin),
):
    existing = get_sub_investment_type_by_id(session, sub_investment_type_id)
    if existing is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="sub_investment_type",
            entity_id=sub_investment_type_id,
            action="delete_failed",
            details={"reason": "not_found"},
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sub-investment type not found")
    from ..crud.sub_investment_type import _to_read

    before = _to_read(existing, session).model_dump(mode="json")
    result = delete_sub_investment_type(session, sub_investment_type_id)
    if result is None:
        create_audit_log(
            session,
            actor_user_id=current_user.id,
            entity_type="sub_investment_type",
            entity_id=sub_investment_type_id,
            action="delete_failed",
            details={"old": before, "reason": "referenced"},
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete sub-investment type with associated records",
        )
    create_audit_log(
        session,
        actor_user_id=current_user.id,
        entity_type="sub_investment_type",
        entity_id=sub_investment_type_id,
        action="delete",
        details={"old": before},
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
