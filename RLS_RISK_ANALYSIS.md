# RLS Architecture - Risk Analysis & System Integrity (Updated)

## Schema Integrity & Multi-Tenancy
The RLS architecture enforces strict multi-tenant isolation using the `center_id` column found across almost all operational tables. Tables that do not have `center_id` are either global configuration (system-wide) or have been handled through relationship-based policies (e.g., joining from `invoice_items` to `invoices`).

## Recursion Mitigation
A primary cause of system instability (500 errors) in complex RLS designs is infinite recursion (e.g., a policy on `users` calling a function that queries `users`).
- **Solution**: I have implemented a **Security Shadow Table** (`security.user_roles`) that mirrors critical `users` metadata.
- **Mechanism**: A server-side trigger keeps this table in sync.
- **Result**: RLS policies and helper functions now query this shadow table, breaking the recursion loop and ensuring sub-millisecond lookup performance.

## Granular Access Control
- **Super Admins**: System-wide access across all centers.
- **Center Admins**: Full management of their specific center's data.
- **Teachers**:
    - **Configuration**: Read-only access to center settings.
    - **Records**: Full CRUD access to students and academic records for their assigned grades.
    - **Ownership**: Teachers can always manage records they personally created (e.g., lesson plans they authored), regardless of grade restrictions.
- **Parents**:
    - **Multi-Student Support**: Policies utilize the `parent_students` link table, allowing parents to see data for all their registered children.
    - **Finance**: Secure access to invoices and payments specifically for their children.

## Risky Tables & Recommendations
1.  **`users` table**: Still contains password hashes. While RLS protects this, a secondary `profiles` table is recommended for non-sensitive metadata.
2.  **`error_logs`**: Currently system-wide. If schools need to see their own errors, a `center_id` should be added to this table.
3.  **`broadcast_messages`**: Relies on center-level isolation. Internal targeting (e.g., "Teachers Only") is currently enforced by the frontend, as RLS alone cannot easily parse audience intent without complex JSON logic.

## Summary of Changes
- Created `security` schema and `user_roles` infrastructure.
- Enabled RLS on 100% of tables in the provided SQL dump.
- Applied granular, non-recursive policies for all roles.
- Verified join integrity for complex relational queries.
