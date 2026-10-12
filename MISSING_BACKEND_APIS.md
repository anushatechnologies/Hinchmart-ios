# HINCH MART — Missing Backend APIs & Required Fixes

**Target Audience:** Backend Engineering Team / Tech Lead
**Date:** September 2026
**Purpose:** This document outlines all the missing endpoints, buggy behaviors, and incomplete API implementations that need to be resolved on the backend to fully support the HINCH MART frontend application.

---

## 1. High Priority Bugs & Missing Functionality (Immediate Fix Required)

These issues are currently breaking core application flows and need immediate resolution.

### 1.1 Category & Subcategory Filtering Bug
* **Endpoint:** `GET /api/products` and `GET /api/subcategories`
* **Issue:** Query parameters like `?categoryId=1` and `?subcategoryId=1` are currently being ignored by the backend. The API returns all products/subcategories instead of filtering them.
* **Required Fix:** Ensure the SQL queries dynamically apply the `WHERE category_id = :categoryId` and `WHERE subcategory_id = :subcategoryId` filters when these query parameters are provided.

### 1.2 Image Hosting & CDNs (Critical)
* **Endpoint:** Image URLs returned in all GET requests (Products, Categories, Banners)
* **Issue:** Database records are returning dummy URLs (e.g., `https://example.com/images/fruits.jpg`) which result in 404s and blank images on the mobile app.
* **Required Fix:** 
  1. Implement the `POST /api/upload/image` endpoint to accept `multipart/form-data` uploads and save files to an S3 bucket or CDN.
  2. Update existing database records to use real, resolvable CDN URLs.

### 1.3 Missing Wholesale Bulk Pricing Tiers
* **Endpoint:** `GET /api/products/{id}`
* **Issue:** The API currently only returns a single scalar price (`"price": 3.99`). The B2B nature of the app requires wholesale tier pricing.
* **Required Fix:** Add a `bulkPricingTiers` array to the product detail response.
  ```json
  "bulkPricingTiers": [
    { "minQty": 1, "maxQty": 19, "price": 3.99 },
    { "minQty": 20, "maxQty": 49, "price": 3.50 }
  ]
  ```

---

## 2. Missing Core Flows (Need to be Implemented)

These APIs are defined in the frontend specification but are either completely missing on the backend or lack integration.

### 2.1 Checkout & Server-Side Pricing Engine
* **`POST /api/checkout/preview`**: Missing. The frontend needs this to calculate split GST (CGST/SGST/IGST), freight charges based on the address, and crane unloading charges before proceeding to payment.
* **`GET /api/cart`**: Ensure this endpoint evaluates tax and tier pricing in real-time based on the user's cart quantities.
* **`POST /api/cart/coupon`**: Implement coupon validation and application logic.

### 2.2 Razorpay Payment Gateway Integration
* **`POST /api/payments/create`**: Create a Razorpay order and return the `gatewayOrderId` (e.g., `order_Rzp_...`) to the frontend SDK.
* **`POST /api/payments/verify`**: Verify the HMAC SHA256 cryptographic signature sent back from the Razorpay SDK after a successful payment to officially mark the order as `PAID`.

### 2.3 B2B Invoicing & Live Tracking
* **`GET /api/orders/{id}/tracking`**: Needs to return a vertical transit progress timeline (e.g., ORDER_PLACED -> LOADED -> IN_TRANSIT).
* **`GET /api/orders/{id}/invoice`**: Generate and return a downloadable B2B GST Tax Invoice PDF URL with split taxes and buyer/seller GSTINs.

### 2.4 Enterprise RFQ (Request For Quote) Flow
* **`POST /api/rfqs`**: Allow contractors to submit a 3-step procurement form.
* **`GET /api/rfqs/{id}/quotations`**: Fetch bids submitted by verified suppliers.
* **`POST /api/rfqs/quotes/{id}/accept`**: Accept a quotation and automatically convert it into a confirmed Order.
* **`POST /api/rfqs/{id}/questions`**: Allow Q&A / Technical clarifications between buyer and seller.

---

## 3. Standard & Global Compliance Issues

### 3.1 Missing Pagination Envelope
* **Issue:** Listing endpoints (`GET /api/products`, `GET /api/categories`, `GET /api/orders`) currently return raw JSON arrays (`[ ... ]`).
* **Required Fix:** Wrap all listing responses in a standard pagination envelope.
  ```json
  {
    "success": true,
    "data": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalCount": 85,
      "totalPages": 5
    }
  }
  ```

### 3.2 Inconsistent Boolean Naming
* **Issue:** `Categories` and `Products` use `"active": true`, while `Banners` use `"isActive": true`.
* **Required Fix:** Standardize keys across all database models and serializers to strictly use `"active": true`.

---

## 4. Extended Features (Upcoming Modules)
The frontend API client (`api.ts`) contains definitions for the following modules. Please confirm the roadmap for developing these backend services:

* **Wallet System:** `/wallet/info`, `/wallet/transactions`, `/wallet/rewards`
* **Vendor Dashboard:** `/vendor/dashboard`, `/vendor/performance`, `/vendor/payments`
* **Real-time Chat:** `/chat/conversations`, `/chat/conversations/{id}/messages`
* **Equipment Rentals:** `/rentals`, `/rentals/book`, `/rentals/{id}/availability`
* **Content Modules:** Blog (`/blog/articles`), News (`/news`), Help & Ticketing (`/help/tickets`)
* **Purchase Orders Flow:** `/purchase-orders`, `/purchase-orders/{id}/approve`

---

## Summary
For the immediate next sprint, the backend team should prioritize **Section 1 (Bugs & Image Hosting)** and **Section 2.2 (Payments Integration)** to ensure the basic E2E purchase flow is unblocked.
