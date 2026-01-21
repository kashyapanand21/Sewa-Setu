# Sewa-Setu MVP

**Team Member 1:** Anand Kashyap  
**Team Member 2:** Zaid Ali  
**Built for:** NIT Patna Hackathon  
**Google Tech Used:** Firebase Auth, Firestore, Hosting, Google Books API, OpenStreetMap + Leaflet

## 1) What Sewa-Setu Solves

Sewa-Setu organizes fragmented student demand around Ashok Rajpath into structured, transparent collective actions so students pay less, vendors get guaranteed demand, and the admin can safely coordinate fulfillment. It is not a delivery app, marketplace, or rating platform — it is a coordination system built on Firebase with atomic safety and real-time visibility.

## 2) Core Idea (How the system thinks)

At all times, exactly three roles exist:

| Role | Controls | Cannot Do |
|------|----------|-----------|
| **Student** | Creates demand (orders/slots), sets quantity & deadline, joins groups | Cannot assign vendors or fulfill orders |
| **Vendor** | Accepts open orders, completes assigned orders, creates service slots | Cannot change student deadlines or see other vendors’ work |
| **Admin** | Assigns vendors, closes orders, oversees lifecycle | Does not handle money or delivery |

## 3) Collections (Firestore)

- **users** — `{ uid, createdAt }`
- **groupOrders** — `{ bookName, targetQuantity, currentQuantity, participants[], status, deadline, createdBy, creatorEmail, vendorId? }`
- **vendors** — `{ uid, name, category, phone, shopTimings, location, lat, lng, status }`
- **serviceSlots** — `{ vendorId, serviceType, timeSlot, minParticipants, participants, studentUIDs[], status, deadline, createdAt }`

## 4) States (Single source of truth across the app)

### Order / Slot Lifecycle
`open` → `threshold_reached` → `in_progress` → `completed`
                          ↘ `expired` (auto when deadline < now)

**What each means:**
- **open** – accepting participants / vendor can accept
- **threshold_reached** – minimum students reached
- **in_progress** – vendor assigned and working
- **completed** – fulfilled
- **expired** – deadline passed, no further action allowed

## 5) Bulk Discount Engine (Books)

| Participants | Discount |
|--------------|----------|
| ≥ 5 | 15% |
| ≥ 10 | 30% |
| ≥ 20 | 40% |
| ≥ 30 | 50% |

- Uses **Google Books API**
- Results cached in Firestore
- Safe fallback if price/availability is missing

## 6) EXACT BUTTON-BY-BUTTON WORKFLOW


### A. Entry (index.html)
**Buttons:**
- **Student** → goes to Student Portal → Google Sign-In → Dashboard
- **Vendor** → goes to Vendor Portal → Google Sign-In → Registration or Dashboard
- **Admin** → Google Sign-In → Admin Panel (only whitelisted UIDs)

### B. Student Dashboard (dashboard.html)

**1) Create Bulk Book Order**
- **Fields:** Book Name, Target Quantity, Deadline
- **Button:** `Create Group Order`
- **Action:** Creates `groupOrders`
    - `currentQuantity = 1`
    - `participants = [yourUID]`
    - `status = "open"`

**2) Join Order**
- **Button:** `Join Order`
- **Action:** Increments `currentQuantity` atomically, adds your UID to `participants[]`
- **Blocked if:** You already joined OR Order is expired

**3) Visual Signals**
- Colored status badge next to each order
- Progress bar shows % toward threshold

### C. Vendor Portal (vendors.html)

**Step 1 — First-time Vendor**
- **You fill:** Shop Name, Category, Address, Phone, Timings
- Then you are sent to `vendorsMap.html` to **Pin Location** (lat/lng required).

**Step 2 — After Location is Pinned (Vendor Dashboard)**
- **View Collective Orders**
    - You see: All OPEN orders, All orders assigned to you
    - You never see other vendors’ orders

- **Button:** `Accept Order`
    - Appears only on open orders
    - Runs a Firestore transaction:
        - Sets `vendorId = yourUID`
        - Sets `status = "in_progress"`

- **Button:** `Mark Completed`
    - Appears only on orders assigned to you
    - Sets `status = "completed"`

- **Create Service Slot**
    - **Fields:** Service Type, Time Slot, Min Participants, Deadline
    - **Button:** `Create Slot`
    - **Action:** Creates `serviceSlots`
    - Slots are visible to students in real time
    - **Blocked if you have not pinned location:**
        - Buttons disabled
        - Visible message: “Pin your shop on the map before taking action.”
        - Shortcut button → **Pin Location**

### D. Slot Booking (Students)
Students see available slots and click:

- **Button:** `Book Slot`
- **Action:** Atomic transaction
    - Increments participants
    - Prevents duplicate booking
    - Auto-flips to `threshold_reached` when minimum is met

**Expiry Safety:**
- If deadline < now, status flips to `expired` automatically.

### E. Admin Panel (admin.html)
Admin sees all orders in real time.

- **Button:** `Assign Vendor`
    - Moves order to `in_progress`
- **Button:** `Close Order`
    - Sets `status = completed`
- Buttons disappear automatically if the order is already completed/expired.

## 7) Console Tests (no red errors expected)

```javascript
// Slot safety
const slotId = await window.createSlot("demoVendor1","printing","4PM–6PM",8,Date.now()+2*60*1000);
await window.bookSlot(slotId,"studentTest1");
await window.bookSlot(slotId,"studentTest1"); // must block duplicate

// Discount engine
await window.generateDiscountReport("Operating System Concepts","Silberschatz",25);
```

## 8) Why This Works for NIT Patna (Ashok Rajpath)
- **Hyperlocal vendors only** → fewer coordination failures
- **Predictable bulk demand** → better pricing
- **Less crowding** → smoother campus experience
- **Low-tech vendors** can participate without apps or dashboards
