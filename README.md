````
# Sewa-Setu (Student Collective Service Bridge)

## Problem Statement
Students around Ashok Rajpath rely on offline vendors for technical books, printing, and hostel services. Lack of organization causes higher costs, overcrowding, and wasted time. Sewa-Setu aggregates scattered student demand into collective bargaining power and structured vendor coordination. :contentReference[oaicite:0]{index=0}

## What This Platform Is (and is NOT)
Sewa-Setu is **not** a delivery app, marketplace, or vendor directory.  
It is a **collective coordination and bargaining system** that converts informal WhatsApp-style group buying into a transparent, predictable workflow for students and low-tech-friendly vendors.

## Core Modules Implemented
- **Bulk Technical Book Ordering**: Google Books API integration, Firestore caching, and tier-based discount engine.
- **Service Slot Booking**: Supports hyperlocal slots (Laundry, Printing, etc.) with:
  - Atomic participant updates using Firestore transactions
  - Duplicate booking prevention using `studentUIDs` array
  - Reliable expiry flip when `deadline < now`
  - 60-second backup expiry cleanup loop
- **Vendor Locator**: Offline vendor pins streamed in realtime using OpenStreetMap + Leaflet.

## Bulk Discount Tiers
| Participants | Discount |
|------------|----------|
| ≥ 5        | 15%      |
| ≥ 10       | 30%      |
| ≥ 20       | 40%      |
| ≥ 30       | 50%      |

## Order & Slot Lifecycle States
- `open` → accepting participants/bookings  
- `threshold_reached` → minimum group size satisfied  
- `in_progress` → vendor fulfilling request (admin confirmation layer)  
- `completed` → fulfilled successfully  
- `expired` → auto-flipped when deadline passes  

## Firestore Collections Used
- `users` — stores student UID on login  
- `groupOrders` — tracks bulk technical book orders  
- `vendors` — hyperlocal vendor metadata + lat/lng  
- `serviceSlots` — slot objects for Laundry/Printing with atomic safety  

## How to Test in Browser Console
After opening `vendorsMap.html` or `dashboard.html`, run:

```js
const slotId = await window.createSlot("demoVendor1", "printing", "4PM–6PM", 8, Date.now() + 2*60*1000);
await window.bookSlot(slotId, "studentTest1");
await window.bookSlot(slotId, "studentTest1"); // should block duplicate
await window.flipExpiredSlots();
````

```js
await window.generateDiscountReport("Operating System Concepts", "Silberschatz", 25);
```

You should see **structured JSON logs** and **no console red errors**.

## Local Impact

* Students save money through predictable bulk discounts
* Crowding at shops reduces due to grouped execution
* Vendors receive guaranteed demand without tech complexity
* Admin panel mediates vendor confirmation safely

## GitHub Workflow for Final Version

This phase was committed on branch `submission-package` and tagged as `v1.2`.

---

**Maintainer:** Anand Kashyap (Team Project)
**Built for:** NIT Patna Hackathon
**Tech Requirement Justification:** Uses Firebase Firestore, Firebase Hosting, and Google Authentication (Google technologies).

```
```
