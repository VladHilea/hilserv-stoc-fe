# Hilserv WMS Frontend

This is the Warehouse Management System (WMS) client application, built with **SvelteKit 5 (runes)**, **Vite**, and **Tailwind CSS v4**. It features high-fidelity glassmorphic designs, sound alerts, and thermal print helpers.

---

## Prerequisites

Ensure you have the following installed on your local machine/server:
1. **Node.js** (v18 or newer recommended)
2. **pnpm** (Version 10+, **MUST** be used instead of npm/yarn)

---

## Configuration & Proxy

By default, the Vite configuration contains a built-in proxy settings block in `vite.config.ts` to redirect all `/api/v1` AJAX requests directly to the local NestJS backend server running on port `3001`:

```typescript
server: {
  proxy: {
    '/api/v1': {
      target: 'http://localhost:3001',
      changeOrigin: true
    }
  }
}
```

Make sure your NestJS backend service is started and running on port `3001` to perform successful authentication, lookups, and custody registrations.

---

## Running the Application

All commands should be executed from the repository root, using `pnpm --filter wms-frontend`:

### Development Server
Brings up the hot-reloading Dev Server:
```bash
pnpm --filter wms-frontend dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to access the dashboard.

### Production Build & Preview
Validates TypeScript rules, compiles CSS assets, and optimizes the bundle structure:
```bash
# Build the client and SSR resources
pnpm --filter wms-frontend build

# Preview the production distribution locally
pnpm --filter wms-frontend preview
```

---

## View Capabilities

The frontend contains these core pages:

1.  **Authentication (`/login`)**:
    *   **Operator PIN-pad form**: 10-digit pad widget that automatically submits credentials on the 4th/6th digit, ideal for tablets or handheld touch terminals.
    *   **Barcode scanner input**: Allows employees to log in immediately by scanning their printed WMS badges.
    *   **Administrator credentials form**: Standard email/password connection interface.
2.  **Dashboard (`/`)**:
    *   Analytics counters for received (bought) and exited (sold) tires.
    *   Live supplier target rebate progress bars reflecting the percentage of completions within dates and custom categories.
    *   Real-time statistics query filters (supplier, brand, dimension, season).
3.  **Scanner Floor (`/scanner`)**:
    *   **Scan-In mode**: Scans manufacturer EANs, inputs DOTs, and generates unique serial ID barcodes. Utilizes HTML5 Web Audio API to synthetically trigger success beeps or old DOT alert sirens. Integrates browser thermal print handlers.
    *   **Location assignment mode**: Fast movement log linking serials to warehouse sections.
    *   **Scan-Out mode**: Marks serials as sold or returned.
    *   **Add new tire backup dialog**: Allows cataloguing untracked tires on the fly if EAN lookup returns a 404.
4.  **Courier Reception (`/reception`)**:
    *   Drag-and-drop file uploader parsing PDF delivery notes or Excel packing sheets.
    *   Real-time verification checklist comparison grid (Expected Quantity vs. Scanned count).
5.  **Tire Hotel (`/hotel`)**:
    *   Active custody list searchable by license plates.
    *   Checkout/Return set custody release.
    *   Custody check-in wizard with set copy helpers (copying tire 1 data to other wheels).
6.  **Settings Panel (`/settings`)**: Restricted to WMS Admins.
    *   Manage tax rates, environmental EcoTaxa categories, and minimum DOT age rules.
    *   Administrate user records (Create Admin, create Employee, manage PINs/Badges).
    *   Setup supplier logistic configurations and cron targets.
