# Profile Sidebar Avatar Address Design

## Goal

Improve the profile area so personal-account pages are grouped under "Trang cá nhân", remove role display from the profile page, support avatar upload, and require a real geocoded address before saving shipping addresses.

## Decisions

- Sidebar keeps "Đơn hàng của tôi" and "Thông báo" as top-level cross-MFE entries.
- "Trang cá nhân" becomes a parent section, with nested entries:
  - Thông tin cá nhân
  - Địa chỉ
  - Ví Lishop
  - Yêu thích
  - Hỗ trợ
- The profile page no longer shows `role`.
- Avatar upload is Phase 1 local-file handling:
  - Accept image files only.
  - Reject files larger than 2 MB.
  - Preview immediately.
  - Store the file as a data URL in the existing `avatarUrl` profile field.
- Address creation/editing requires selecting a geocoded result before saving.
- Address validation uses OpenStreetMap Nominatim from the browser, with no API key.
- No database migration in this phase. Latitude/longitude/place id can be added later if the product needs persistent map coordinates.

## Validation Behavior

- Users can type a query and search real address candidates.
- Choosing a candidate fills street/district/city from the geocoding result.
- Save is disabled until required contact fields are filled and a geocoded result has been selected.
- If geocoding fails or returns no candidates, the form shows a clear error and does not save.

## Non-Goals

- No binary file upload endpoint.
- No permanent latitude/longitude storage.
- No Google Maps API integration.
