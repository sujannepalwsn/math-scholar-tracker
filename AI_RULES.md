# AI Rules and Tech Stack Guide

This document outlines the core technologies used in this application and provides guidelines for using specific libraries and tools.

## Tech Stack Overview

*   **Frontend Framework:** React
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **UI Component Library:** shadcn/ui (built on Radix UI)
*   **Routing:** React Router DOM
*   **Backend-as-a-Service (BaaS):** Supabase (PostgreSQL database, Authentication, Storage, Edge Functions)
*   **Data Fetching & Caching:** React Query (@tanstack/react-query)
*   **Icons:** Lucide React
*   **Toast Notifications:** Sonner
*   **Form Management & Validation:** React Hook Form with Zod
*   **Date Manipulation:** date-fns
*   **CSV Parsing:** PapaParse
*   **OCR (Optical Character Recognition):** Tesseract.js (for images) and PDF.js (for PDFs)
*   **Charting:** Recharts
*   **Password Hashing (Edge Functions):** bcryptjs

## Library Usage Rules

To maintain consistency, performance, and ease of maintenance, please adhere to the following guidelines when developing:

1.  **UI Components:**
    *   **Always** prioritize using components from `shadcn/ui`. These are pre-styled with Tailwind CSS and provide accessibility features.
    *   If a required component is not available in `shadcn/ui` or needs significant custom behavior, create a new component in `src/components/` and style it using Tailwind CSS. **Do not modify `shadcn/ui` source files directly.**

2.  **Styling:**
    *   **Exclusively** use Tailwind CSS utility classes for all styling.
    *   Avoid inline styles or creating new `.css` files for components. Global styles should be managed in `src/index.css`.

3.  **State Management & Data Fetching:**
    *   For server state (data fetched from Supabase), use **React Query** (`@tanstack/react-query`). This handles caching, revalidation, and loading states efficiently.
    *   For local component state, use React's `useState` or `useReducer` hooks.

4.  **Routing:**
    *   All client-side routing should be handled by **React Router DOM**.
    *   Keep the main application routes defined in `src/App.tsx`.

5.  **Backend Interaction:**
    *   Interact with the Supabase backend using the `@supabase/supabase-js` client.
    *   For database operations (CRUD), use the client's `from().select()`, `insert()`, `update()`, `delete()` methods.
    *   For authentication, use `supabase.auth` methods.
    *   For file uploads/downloads, use `supabase.storage`.
    *   For complex business logic, sensitive operations, or performance-critical tasks, implement **Supabase Edge Functions**.

6.  **Icons:**
    *   Use icons from the **Lucide React** library.

7.  **Notifications:**
    *   For user feedback and notifications (e.g., success/error messages), use the **Sonner** toast library.

8.  **Forms & Validation:**
    *   Use **React Hook Form** for managing form state and submissions.
    *   For schema-based form validation, integrate **Zod** with React Hook Form's resolvers.

9.  **Date Handling:**
    *   Use **date-fns** for all date parsing, formatting, and manipulation tasks.

10. **CSV Processing:**
    *   For parsing CSV data (e.g., bulk student uploads), use **PapaParse**.

11. **OCR:**
    *   For Optical Character Recognition from images, use **Tesseract.js**.
    *   For processing PDF files to extract images for OCR, use **PDF.js**.

12. **Charting:**
    *   For displaying charts and graphs in reports, use **Recharts**.

13. **Password Hashing (Edge Functions):**
    *   When handling passwords in Supabase Edge Functions, use `bcryptjs` for secure hashing.