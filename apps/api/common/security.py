def user_profile_scope(user):
    if not getattr(user, "is_authenticated", False):
        return None, None, False
    if getattr(user, "is_superuser", False):
        return None, None, True

    profile = getattr(user, "profile", None)
    if not profile:
        return None, None, False
    return getattr(profile, "tenant", None), getattr(profile, "store", None), False


def apply_user_scope(queryset, user, *, tenant_path="tenant", store_path="store"):
    tenant, store, unrestricted = user_profile_scope(user)
    if unrestricted:
        return queryset
    if store and store_path:
        return queryset.filter(**{store_path: store})
    if tenant and tenant_path:
        return queryset.filter(**{tenant_path: tenant})
    return queryset.none()


def user_can_access_customer(user, customer) -> bool:
    """Apply the same tenant/store boundary to writable customer relations."""
    tenant, store, unrestricted = user_profile_scope(user)
    if unrestricted:
        return True
    if store:
        return customer.store_id == store.id
    if tenant:
        return customer.tenant_id == tenant.id
    return False
