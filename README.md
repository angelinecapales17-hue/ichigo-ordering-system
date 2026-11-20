# ICHIGO Ordering System

Responsive Node.js + Express + MySQL ordering and store-management application based on the updated ICHIGO Figma screens.

## Quick start

1. Start MySQL in XAMPP.
2. Import `database/schema.sql` for a fresh database. For an existing ICHIGO database, import `database/upgrade.sql` (adds inventory, suppliers, reviews and integration-event tables without deleting existing records).
3. Open this folder in VS Code — it must be the folder containing `package.json`.
4. Run `npm install`.
5. Copy `.env.example` to `.env`; configure the MySQL password and a long random `JWT_SECRET`.
6. Run `npm start`.
7. Visit `http://localhost:3000`.

## Port 3000 already in use?

On Windows PowerShell:
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F
```
Only stop the process if it is an old ICHIGO/Node server you intend to close. Alternatively, set another free `PORT` in `.env`.

## Portals

- **Customer:** account registration/login, category-based menu, drink customization, cart, pickup/delivery checkout, order history/status tracker, reviews and profile.
- **Admin:** overview, product management, inventory valuation, low-stock monitoring, stock restock, supplier lead-time records, order monitoring, rider dispatch, staff/customer management, daily sales reports, payment verification and store settings.
- **Cashier:** POS menu, customized counter orders, active queue and order history.
- **Rider:** delivery board, accept delivery, assigned deliveries and delivery milestone updates.

## SIA 101 integration

The system combines Request-Response REST APIs, a central Hub-and-Spoke Express API, and a database-backed Publish-Subscribe event feed (`GET /api/events`). See `SIA101-ALIGNMENT.md` for the system concept, subsystem list, architecture, Level 1 DFD, 15 data flows, process diagrams, API samples, and current limitations.

## Important limits

GCash, Maya, QR Ph and online banking selections are recorded for verification; live gateway processing is not connected. The event feed is polled from MySQL, not pushed over WebSockets. Inventory is tracked with restock history, but ingredient consumption is not automatically deducted from drink recipes. This is a local development/academic project and needs security, testing, backups and payment integration before production use.


## Rider portal update (Figma alignment)

The rider portal now follows the rider-specific screens in the updated Figma:
- Active Delivery Assignment with order, customer, contact, address and item details
- Route preview and an Open Directions link to Google Maps
- Call Customer action (uses the customer's saved phone number)
- Arrival notification action recorded in `system_events` as `rider.arriving`
- Mark as Delivered / Completed action with confirmation
- Delivery Successful state and shift dispatch summary (remaining tasks, completed deliveries and recorded COD)
- Accept & Start Delivery Route for unassigned delivery orders

No additional database migration is required for this rider update if you have already imported the updated `database/upgrade.sql`, because it uses the existing `system_events` table.
