# Level 0 Context Diagram

The Salon Booking and Appointment System is represented as one process (Process 0). Arrows show data crossing its boundary; internal modules and database tables are omitted.

```mermaid
flowchart LR
    C[Customer / Guest]
    A[Admin]
    K[Cashier]
    S(("0<br/>Salon Booking and<br/>Appointment System"))
    P["PayMongo<br/>GCash / QR Ph checkout"]
    N["Email / SMS Providers<br/>Gmail, TextBee"]
    G["Google Gemini API<br/>Optional"]

    C -->|"Contact details, service selections,<br/>booking and change requests,<br/>access verification, inquiries"| S
    S -->|"Services and availability, booking status,<br/>checkout link, appointment details,<br/>e-receipts, salon guidance"| C

    A -->|"Service and staff configuration,<br/>schedules, policies, user management,<br/>appointment updates, report queries"| S
    S -->|"Appointments, payments, receipts,<br/>commissions, reports"| A

    K -->|"Booking lookup, arrival records,<br/>service outcomes, payment details"| S
    S -->|"Appointment and customer details,<br/>amount due, payment status,<br/>receipts, collection summaries"| K

    S -->|"Checkout session requests,<br/>payment status queries, session expiry"| P
    P -->|"Checkout link, signed payment webhook events,<br/>verified transaction status"| S

    S -->|"Recipient details, booking notices,<br/>reminders, verification codes"| N
    N -->|"Submission acknowledgments,<br/>send errors"| S

    S -->|"Consultation questions, conversation context,<br/>salon guidance and service information"| G
    G -->|"Consultation answers,<br/>service recommendations"| S
```

## Scope notes

- Customer / Guest, Admin, and Cashier are the three human actors defined by the system rules (`UserRole` is `ADMIN` / `CASHIER`).
- Staff/stylists are managed operational records, not direct system users in the current MVP.
- The web frontend, REST API, PostgreSQL database, hold worker and notification worker are all internal to Process 0; the database is a data store inside the boundary, not an external entity.
- External providers are shown as supporting systems, selected by environment configuration (`PAYMENT_PROVIDER`, `NOTIFICATION_*_PROVIDER`, `CHATBOT_PROVIDER`). Test/disabled providers are not external systems.
- Email/SMS providers carry booking notices, reminders, appointment access codes and staff password-recovery codes. Their acceptance does not guarantee delivery to the customer.
- PayMongo payment success is recognized only after a signed webhook or server-to-server status retrieval; browser data alone is never trusted.
- Gemini provides guidance; the salon system remains authoritative for booking, scheduling, and payments. If Gemini is disabled or fails, a built-in guided chatbot answers instead.
- Facebook Messenger is excluded because its setup document describes a future implementation plan; no Messenger code exists in the application.

## Sources

- [System rules](SYSTEM_RULES.md): actors, permitted operations, payment boundary, notifications, and chatbot scope.
- [Architecture](ARCHITECTURE.md): system and provider boundaries.
- [Project README](../README.md): PayMongo, notifications, appointment verification, and reporting integrations.
- [Gemini setup](GEMINI_CHATBOT_SETUP.md): optional consultation integration.
- [Messenger implementation plan](FACEBOOK_MESSENGER_SETUP.md): planned integration status.
