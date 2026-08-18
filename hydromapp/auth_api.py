"""Session-based auth API helpers for the React SPA."""
from __future__ import annotations

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import Dam, UserProfile

User = get_user_model()


def _json_error(message, status=400, **extra):
    payload = {'error': message, **extra}
    return JsonResponse(payload, status=status)


def _parse_json(request):
    import json

    try:
        return json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return None


def serialize_auth_user(user):
    profile = getattr(user, 'userprofile', None)
    full_name = (user.get_full_name() or '').strip()
    return {
        'name': full_name or user.username,
        'email': user.email or user.username,
        'verified': bool(user.is_active),
        'phone': getattr(profile, 'phone_number', '') if profile else '',
        'department': getattr(profile, 'department', '') if profile else '',
        'station': getattr(profile, 'station', '') if profile else '',
        'role': getattr(profile, 'role', '') if profile else '',
    }


def _match_dam_for_station(station: str):
    station = (station or '').strip()
    if not station:
        return None
    lowered = station.lower()
    for dam in Dam.objects.all():
        name = dam.name.lower()
        if name in lowered or lowered in name:
            return dam
        token = name.split()[0]
        if token and token in lowered:
            return dam
    return None


@ensure_csrf_cookie
@require_GET
def api_auth_csrf(request):
    """Ensure the csrftoken cookie is set for SPA POSTs."""
    return JsonResponse({'csrfToken': get_token(request)})


@require_GET
def api_auth_me(request):
    if not request.user.is_authenticated:
        return _json_error('Not authenticated', status=401)
    return JsonResponse({'user': serialize_auth_user(request.user)})


@require_POST
def api_auth_signup(request):
    """
    Create a pending Hydro-M account (is_active=False).
    An admin must activate the user in Django admin before login works.
    """
    payload = _parse_json(request)
    if payload is None:
        return _json_error('Invalid JSON body')

    name = str(payload.get('name') or '').strip()
    email = str(payload.get('email') or '').strip().lower()
    phone = str(payload.get('phone') or '').strip()
    department = str(payload.get('department') or '').strip()
    station = str(payload.get('station') or '').strip()
    role = str(payload.get('role') or '').strip()
    password = str(payload.get('password') or '')

    if not all([name, email, phone, department, station, role, password]):
        return _json_error('All signup fields are required.')

    if User.objects.filter(email__iexact=email).exists() or User.objects.filter(username__iexact=email).exists():
        return _json_error('An account with this email already exists.', status=409)

    try:
        validate_password(password)
    except ValidationError as exc:
        return _json_error(' '.join(exc.messages))

    parts = name.split(None, 1)
    first_name = parts[0]
    last_name = parts[1] if len(parts) > 1 else ''

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=False,
            )
            profile, _created = UserProfile.objects.get_or_create(user=user)
            profile.phone_number = phone[:20]
            profile.department = department[:120]
            profile.station = station[:120]
            profile.role = role[:120]
            profile.dam = _match_dam_for_station(station)
            profile.save()
    except Exception as exc:  # noqa: BLE001
        return _json_error(f'Could not create account: {exc}', status=500)

    return JsonResponse(
        {
            'message': 'Account created. An administrator must approve your access before you can sign in.',
            'email': email,
            'status': 'pending_approval',
        },
        status=201,
    )


@require_POST
def api_auth_verify(request):
    """Email self-verification is disabled; admin approval is required."""
    return _json_error(
        'Email verification is no longer used. An administrator must approve your account.',
        status=410,
    )


@require_POST
def api_auth_login(request):
    payload = _parse_json(request)
    if payload is None:
        return _json_error('Invalid JSON body')

    email = str(payload.get('email') or '').strip().lower()
    password = str(payload.get('password') or '')
    if not email or not password:
        return _json_error('Email and password are required.')

    try:
        existing = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        try:
            existing = User.objects.get(username__iexact=email)
        except User.DoesNotExist:
            return _json_error('Invalid email or password.', status=401)

    # Check password even for inactive users so we don't leak existence poorly,
    # but give a clear pending-approval message when credentials are correct.
    if not existing.check_password(password):
        return _json_error('Invalid email or password.', status=401)

    if not existing.is_active:
        return _json_error(
            'Your account is pending administrator approval. Please try again after you are approved.',
            status=403,
        )

    user = authenticate(request, username=existing.username, password=password)
    if user is None:
        return _json_error('Invalid email or password.', status=401)

    login(request, user)
    return JsonResponse({'user': serialize_auth_user(user)})


@require_POST
def api_auth_logout(request):
    logout(request)
    return JsonResponse({'message': 'Logged out'})
