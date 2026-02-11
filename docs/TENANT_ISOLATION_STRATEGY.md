# Tenant Isolation Strategy

## Summary

District isolation is enforced through the **restaurant relation** for models that do not have a direct `districtId` column. Models with `districtId` use direct filtering. **No model without `districtId` receives `districtId` in its where clause.**

## Model Classification

### restaurant_scoped (no direct districtId)

| Model      | Has districtId? | Isolation                             |
|-----------|------------------|----------------------------------------|
| Order     | No               | `restaurantId` or `restaurant: { districtId }` |
| Category  | No               | `restaurantId` or `restaurant: { districtId }` |
| Table     | No               | `restaurantId`                         |
| Bill      | No               | `restaurantId`                         |
| MenuItem  | No               | Via `category.restaurantId`            |
| BillItem  | No               | Via bill → restaurant                  |
| Payment   | No               | Via bill → restaurant                  |
| Settlement| No               | `restaurantId`                         |
| Shift     | No               | `restaurantId`                         |
| Commission| No               | `restaurantId`                         |

### district_scoped (has direct districtId)

| Model        | Has districtId? | Isolation                    |
|--------------|------------------|-----------------------------|
| AuditLog     | Yes              | `districtId`                |
| Restaurant   | Yes              | `districtId`                |
| RevenueShare | Yes              | `districtId`                |
| Partner      | Yes              | `districtId`                |
| WhiteLabel   | Yes              | `districtId`                |
| ChurnSignal  | Yes              | `districtId`                |
| UpgradeIntent| Yes              | `districtId`                |

## buildTenantWhere() Usage

```ts
// For Order, Category, Table, Bill (restaurant_scoped)
const where = buildTenantWhere(authUser, {}, hostDistrictId, "restaurant_scoped");
// Returns: { restaurantId } for RESTAURANT_ADMIN
//          { restaurant: { districtId } } for SUPER_ADMIN on district domain
//          {} for SUPER_ADMIN on main platform

// For AuditLog (district_scoped)
const where = buildTenantWhere(authUser, {}, hostDistrictId, "district_scoped");
// Returns: { districtId } when hostDistrictId provided
```

## Cross-District Leakage Prevention

- **RESTAURANT_ADMIN**: Filtered by `restaurantId`; `applyHostScope` validates restaurant's district matches host.
- **SUPER_ADMIN on district domain**: Filtered by `restaurant: { districtId: hostDistrictId }` for restaurant-scoped models.
- **SUPER_ADMIN on main platform**: No district filter (platform-wide access).

**Confirmation: Cross-district leakage is impossible via tenant filter** — models without `districtId` never receive it; district isolation flows through the restaurant relation only.
