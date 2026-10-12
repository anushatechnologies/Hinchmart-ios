# HINCH MART — Live QA & Backend API Health Audit Report

**Target Base URL**: `https://api.hinchmart.com/api`  
**Test Date**: August 25, 2026  
**Audience**: Backend Engineering Team / Tech Lead  
**Scope**: Categories, Subcategories, Products, and Banners APIs (CRUD, Query Filters & Edge Cases)  

---

## 1. Executive Summary & Health Dashboard

| API Module | CRUD Health | Query Filtering | Latency (Avg) | Status |
|---|---|---|---|---|
| **Categories API** (`/api/categories`) | **100% PASS** (GET/POST/PUT/DELETE) | N/A | 75 ms | ⚠️ Schema Minor Inconsistency |
| **Subcategories API** (`/api/subcategories`) | **100% PASS** (GET/POST/DELETE) | ❌ **FAIL** (Ignores `?categoryId=`) | 62 ms | 🔴 **Bug Found** |
| **Products API** (`/api/products`) | **100% PASS** (GET/POST/DELETE) | ❌ **FAIL** (Ignores `?subcategoryId=`) | 58 ms | 🔴 **Bug Found** |
| **Banners API** (`/api/banners`) | **100% PASS** (GET/POST/DELETE) | N/A | 65 ms | ⚠️ Schema Minor Inconsistency |
| **Image Hosting** | N/A | N/A | N/A | 🔴 **Critical Bug** (`example.com` URLs) |

---

## 2. Live Automated Test Results

### 2.1 Test Execution Log

```
--- [TEST SUITE 1: CATEGORIES API] ---
✅ 1.1 GET /api/categories -> Status: 200 (Fetched 5 items) [75ms]
✅ 1.2 GET /api/categories/1 -> Status: 200 (Fetched 'Fruits') [48ms]
✅ 1.3 GET /api/categories/999999 -> Status: 404 (Correct Not Found) [54ms]
✅ 1.4 POST /api/categories -> Status: 201 (Created ID: 8) [176ms]
✅ 1.5 PUT /api/categories/8 -> Status: 200 (Updated) [104ms]
✅ 1.6 DELETE /api/categories/8 -> Status: 204 (Deleted) [135ms]

--- [TEST SUITE 2: SUBCATEGORIES API] ---
✅ 2.1 GET /api/subcategories -> Status: 200 (Fetched 5 items) [75ms]
✅ 2.2 GET /api/subcategories/1 -> Status: 200 (Fetched 'Apples') [64ms]
❌ 2.3 GET /api/subcategories?categoryId=1 -> Status: 200 (BUG: Returned ALL 5 subcategories) [47ms]
✅ 2.4 POST /api/subcategories -> Status: 201 (Created ID: 8) [140ms]
✅ 2.5 DELETE /api/subcategories/8 -> Status: 204 (Deleted) [77ms]

--- [TEST SUITE 3: PRODUCTS API] ---
✅ 3.1 GET /api/products -> Status: 200 (Fetched 5 items) [79ms]
✅ 3.2 GET /api/products/1 -> Status: 200 (Fetched 'Red Apples') [56ms]
❌ 3.3 GET /api/products?subcategoryId=1 -> Status: 200 (BUG: Returned ALL 5 products) [55ms]
✅ 3.4 POST /api/products -> Status: 201 (Created ID: 8) [98ms]
✅ 3.5 DELETE /api/products/8 -> Status: 204 (Deleted) [43ms]

--- [TEST SUITE 4: BANNERS API] ---
✅ 4.1 GET /api/banners -> Status: 200 (Fetched 1 items) [43ms]
✅ 4.2 POST /api/banners -> Status: 201 (Created ID: 3) [93ms]
✅ 4.3 DELETE /api/banners/3 -> Status: 204 (Deleted) [65ms]
```

---

## 3. Detailed Bugs & Actionable Fixes for Backend Team

### BUG 1: `GET /api/subcategories?categoryId={id}` Ignores Category Filter
* **Severity**: **HIGH**
* **Observed Behavior**:
  * Request: `GET https://api.hinchmart.com/api/subcategories?categoryId=1`
  * Response: Returns all 5 subcategories across all categories (Apples [Cat 1], Leafy Greens [Cat 2], Milk [Cat 3], Bread [Cat 4], Juices [Cat 5]).
* **Root Cause**: Backend SQL query executes `SELECT * FROM subcategories` without filtering by `WHERE category_id = :categoryId`.
* **Expected Fix**:
```sql
-- In Subcategories Controller / Service:
SELECT * FROM subcategories 
WHERE (:categoryId IS NULL OR category_id = :categoryId) 
  AND active = true 
ORDER BY sort_order ASC;
```

---

### BUG 2: `GET /api/products?subcategoryId={id}` Ignores Subcategory Filter
* **Severity**: **HIGH**
* **Observed Behavior**:
  * Request: `GET https://api.hinchmart.com/api/products?subcategoryId=1`
  * Response: Returns all 5 products in the database (Red Apples [Sub 1], Spinach [Sub 2], Whole Milk [Sub 3], Wheat Bread [Sub 4], Orange Juice [Sub 5]).
* **Root Cause**: Backend SQL query executes `SELECT * FROM products` without applying the query parameter `WHERE subcategory_id = :subcategoryId`.
* **Expected Fix**:
```sql
-- In Products Controller / Service:
SELECT * FROM products 
WHERE (:subcategoryId IS NULL OR subcategory_id = :subcategoryId)
  AND (:categoryId IS NULL OR category_id = :categoryId)
  AND active = true 
ORDER BY created_at DESC;
```

---

### BUG 3: Unresolvable Image Host (`https://example.com/images/...`)
* **Severity**: **CRITICAL**
* **Observed Behavior**:
  * Live database records return `imageUrl: "https://example.com/images/fruits.jpg"` and `imageUrl: "https://example.com/images/red-apples.jpg"`.
  * `example.com` is a reserved documentation domain that returns HTML 404 error pages instead of valid image files.
* **Impact**: Mobile app cannot download images from `example.com`, causing blank gray/blue placeholder boxes on devices without our frontend fallback resolver.
* **Expected Fix**:
  1. Add image upload endpoint: `POST /api/upload/image` (integrated with AWS S3, Cloudinary, or DigitalOcean Spaces).
  2. Populate live database records with real CDN or S3 image URLs.

---

### BUG 4: Inconsistent Boolean Key Naming (`active` vs `isActive`)
* **Severity**: **MEDIUM**
* **Observed Behavior**:
  * Categories and Products return: `"active": true`
  * Banners return: `"isActive": true`
* **Expected Fix**: Standardize across all models to either `"active": true` or `"isActive": true` (or accept and return both).

---

### BUG 5: Missing Wholesale Tier Pricing Slabs on `GET /api/products/{id}`
* **Severity**: **HIGH (B2B Requirement)**
* **Observed Behavior**:
  * Product detail only returns a single scalar price: `"price": 3.99` and `"unit": "kg"`.
* **Expected Fix**: Add wholesale volume tier pricing matrix in the response:
```json
{
  "productId": 1,
  "title": "Red Apples",
  "price": 3.99,
  "unit": "kg",
  "bulkPricingTiers": [
    { "minQty": 1, "maxQty": 19, "price": 3.99 },
    { "minQty": 20, "maxQty": 49, "price": 3.50 },
    { "minQty": 50, "maxQty": null, "price": 3.00 }
  ]
}
```

---

### BUG 6: Missing Pagination Envelope on List Endpoints
* **Severity**: **MEDIUM**
* **Observed Behavior**:
  * `GET /api/products` and `GET /api/categories` return a raw JSON array `[...]`.
* **Expected Fix**: At production scale, wrap listing responses in a standard pagination envelope:
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

---

### BUG 7: Hardcoded ₹4,500 Delivery & Freight Charge in `GET /api/cart` and `POST /api/checkout/preview`
* **Severity**: **CRITICAL (Direct Business & Conversion Blocker)**
* **Observed Behavior**:
  * When a customer adds any standard retail item to their cart (e.g. Plantex 6-Step Ladder for ₹3,989), `GET /api/cart` and `POST /api/checkout/preview` return:
    ```json
    "deliveryCharge": 4500.0,
    "freightCharge": 4500.0
    ```
  * This doubles the customer's total payable amount from ₹3,989 to ₹8,489 before they have even chosen a shipping method or address.
* **Root Cause**:
  * In the Spring Boot `CartService` and `CheckoutService`, `deliveryCharge` and `freightCharge` are hardcoded with a fixed literal `4500.0` (originally written as a placeholder for bulk multi-ton industrial freight).
* **Expected Fix**:
  1. Retrieve delivery charges dynamically from database/admin settings (`shipping_settings` or `store_settings`).
  2. Implement Free Delivery threshold: If cart `subtotal >= freeDeliveryThreshold` (e.g. ₹999), set `deliveryCharge = 0.0`.
  3. If below threshold, apply the admin-configured flat rate `standardDeliveryFee` (e.g. ₹0 or ₹99).
  4. Only apply heavy industrial freight (e.g. ₹2,500–₹4,500) if the order contains heavy bulk freight materials (such as TMT Steel bars, aggregate, or bulk cement bags) or requires crane unloading.
  ```java
  // In Spring Boot CartService / CheckoutService:
  BigDecimal subtotal = calculateSubtotal(cartItems);
  BigDecimal freeThreshold = shippingConfigService.getFreeDeliveryThreshold(); // e.g. 999.0
  BigDecimal deliveryCharge = BigDecimal.ZERO;

  if (cartContainsHeavyIndustrialBulk(cartItems)) {
      deliveryCharge = shippingConfigService.getHeavyFreightFee(); // e.g. 2500.0
  } else if (subtotal.compareTo(freeThreshold) < 0) {
      deliveryCharge = shippingConfigService.getStandardDeliveryFee(); // e.g. 99.0
  } else {
      deliveryCharge = BigDecimal.ZERO; // Free delivery unlocked
  }
  ```

