# Tài liệu phân tích và thiết kế tóm tắt

## Tác nhân và Use Case nghiệp vụ

```mermaid
flowchart LR
  Tenant[Người thuê] --> Search[Tìm/lọc và Top-K]
  Tenant --> Booking[Đặt/đổi/hủy lịch]
  Tenant --> Rental[Cọc, ký hợp đồng, hóa đơn, đánh giá]
  Landlord[Chủ trọ] --> Catalog[CRUD khu trọ/phòng]
  Landlord --> Booking
  Landlord --> Contract[Hợp đồng, bàn giao, điện nước]
  Admin[Quản trị viên] --> Moderation[Kiểm duyệt tin]
  Admin --> Monitor[RBAC, dashboard, giám sát gợi ý]
  Booking --> Lock[(Unique room/date/slot + transaction)]
  Contract --> Notify[Hộp thư, SSE, FCM]
```

## Lớp dịch vụ thiết kế

```mermaid
classDiagram
  class NextRoute { +GET() +POST() +PUT() +PATCH() +DELETE() }
  class RequestSession { +getRequestSession() }
  class DatabaseService { +getRooms() +createRoom() +bookAppointment() +createContract() +createUtilityBill() }
  class Recommender { +scoreRoomsForUser() +getTopKRecommendations() +evaluateOffline() }
  class NotificationService { +notifyTenant() +publishRealtime() +sendPush() }
  class PrismaClient
  NextRoute --> RequestSession
  NextRoute --> DatabaseService
  DatabaseService --> PrismaClient
  DatabaseService --> Recommender
  DatabaseService --> NotificationService
```

## Mô hình dữ liệu trọng tâm

```mermaid
erDiagram
  LANDLORD ||--o{ PROJECT : owns
  PROJECT ||--o{ ROOM : contains
  USER ||--o{ APPOINTMENT : books
  ROOM ||--o{ APPOINTMENT : receives
  ROOM ||--o{ CONTRACT : leased_by
  CONTRACT ||--o{ UTILITY_BILL : bills
  CONTRACT ||--o{ HANDOVER : records
  USER ||--o{ INTERACTION_LOG : generates
  ROOM ||--o{ INTERACTION_LOG : targets
  USER ||--o{ NOTIFICATION : receives
```

Nguồn chính xác về cột, khóa và quan hệ là `web/prisma/schema.prisma`; sơ đồ này chỉ trình bày các thực thể cốt lõi để đưa vào báo cáo.
