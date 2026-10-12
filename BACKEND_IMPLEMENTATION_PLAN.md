# HINCHMART — Enterprise Backend Implementation Plan & API Specification

> **Document Version:** 1.0.0  
> **Target Audience:** Backend Engineering Team, Database Architects, DevOps & Project Leads  
> **Platform:** HINCHMART B2B Construction Materials, Heavy Equipment Rentals & Procurement Marketplace  
> **Base API Path:** `https://api.hinchmart.com/v1` (Production) / `https://staging-api.hinchmart.com/v1` (Staging)

---

## 1. System Overview & Architecture Principles

HINCHMART is an enterprise-grade B2B digital procurement ecosystem connecting construction contractors, builders, developers, and project managers with verified manufacturers, raw material suppliers, and heavy equipment rental fleets.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           Client Applications (Mobile & Web)                    │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │ HTTPS / WSS / REST
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    API Gateway & Reverse Proxy (NGINX / Cloudflare)             │
│        [Rate Limiting • SSL Termination • CORS • DDoS Protection • Geo-Routing] │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
┌────────────────────────────────────────▼────────────────────────────────────────┐
│                        Application Server (Node.js / NestJS / Go)               │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────────────┐ │
│  │ Auth & Users  │ │ Catalog & B2B │ │ RFQ Engine    │ │ Cart & Checkout      │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └──────────────────────┘ │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────────────┐ │
│  │ Order Engine  │ │ Fleet Rentals │ │ Escrow/Wallet │ │ Push & Notifications │ │
│  └───────────────┘ └───────────────┘ └───────────────┘ └──────────────────────┘ │
└──────────────┬─────────────────────────┬──────────────────────────┬─────────────┘
               │                         │                          │
┌──────────────▼──────────┐ ┌────────────▼────────────┐ ┌───────────▼─────────────┐
│ PostgreSQL (Main DB)    │ │ Redis (Cache & Session) │ │ Object Storage (S3/GCS) │
│ - Users & Profiles      │ │ - Rate Limits & OTPs    │ │ - Product Media & Specs │
│ - Products & Inventory  │ │ - Active Cart Cache     │ │ - GST / Tax Invoices    │
│ - RFQs, Quotes & Orders │ │ - Search Query Cache    │ │ - RFQ CAD & BoQ Files   │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────────┘
```

### 1.1 Recommended Tech Stack
- **Primary Runtime:** Node.js (TypeScript with **NestJS** or **Fastify/Express**) or **Go** / **Python (FastAPI)**.
- **Relational Database:** **PostgreSQL 15+** (with PostGIS for location-based delivery radius).
- **In-Memory Cache & Message Broker:** **Redis 7+** (for OTP cooldowns, rate limits, session blacklisting, bullmq/jobs).
- **Search Engine:** **Typesense** or **Elasticsearch** (for ultra-fast sub-millisecond product & SKU search).
- **Object Storage:** **AWS S3** / **Cloudflare R2** / **Google Cloud Storage** (with CDN).
- **SMS & Communications:** **Twilio** / **Msg91** / **Gupshup** (SMS OTP delivery).
- **Push Notifications:** **Expo Push API** / **Firebase Cloud Messaging (FCM)** / **APNs**.
- **Payment & Escrow Gateways:** **Razorpay** / **Stripe** / Bank Wire & L/C API.

### 1.2 Global Request & Response Standards

#### Standard Success Response Structure
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 145,
    "totalPages": 8
  }
}
```

#### Standard Error Response Structure
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Mobile number must be a valid 10-digit Indian phone number"
    }
  ],
  "timestamp": "2026-08-19T14:30:00.000Z",
  "path": "/api/v1/auth/send-otp"
}
```

#### Standard Request Headers
- `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- `Content-Type: application/json`
- `Accept-Language: en` (or `hi`, `ar`)
- `X-Currency: USD` (or `INR`, `AED`, `SAR`)
- `X-App-Version: 1.0.1`
- `X-Platform: ios | android`

---

## 2. Database Schema Design (PostgreSQL DDL)

```sql
-- 1. ENUMS
CREATE TYPE account_type_enum AS ENUM ('individual', 'business', 'contractor', 'vendor', 'admin');
CREATE TYPE rfq_status_enum AS ENUM ('draft', 'submitted', 'in_review', 'quoted', 'negotiating', 'approved', 'rejected', 'completed', 'expired');
CREATE TYPE order_status_enum AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned');
CREATE TYPE payment_status_enum AS ENUM ('unpaid', 'authorized', 'in_escrow', 'paid', 'refunded', 'failed');
CREATE TYPE payment_method_enum AS ENUM ('card', 'bank_wire', 'wallet', 'letter_of_credit', 'cod');

-- 2. USERS TABLE
CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE,
    account_type account_type_enum DEFAULT 'individual',
    is_phone_verified BOOLEAN DEFAULT FALSE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BUSINESS PROFILES
CREATE TABLE business_profiles (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    trade_license_number VARCHAR(100),
    gst_number VARCHAR(50),
    tax_id VARCHAR(100),
    company_address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    annual_procurement_volume NUMERIC(15,2),
    credit_limit NUMERIC(15,2) DEFAULT 0.00,
    credit_used NUMERIC(15,2) DEFAULT 0.00,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_documents JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. OTP SESSIONS (Temporary Auth Store - also cached in Redis)
CREATE TABLE otp_sessions (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(50) DEFAULT 'login', -- 'login', 'register', 'password_reset'
    attempts INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. CATEGORIES & SUBCATEGORIES
CREATE TABLE categories (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    icon_name VARCHAR(100),
    color VARCHAR(30),
    image_url TEXT,
    parent_id VARCHAR(64) REFERENCES categories(id) ON DELETE SET NULL,
    order_index INT DEFAULT 0,
    industry VARCHAR(100), -- 'Civil & Structural', 'MEP', etc.
    sla_description VARCHAR(200),
    is_active BOOLEAN DEFAULT TRUE
);

-- 6. PRODUCTS TABLE
CREATE TABLE products (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category_id VARCHAR(64) REFERENCES categories(id) ON DELETE RESTRICT,
    sub_category_name VARCHAR(100),
    brand_name VARCHAR(100),
    vendor_id VARCHAR(64) REFERENCES users(id) ON DELETE RESTRICT,
    unit VARCHAR(50) NOT NULL, -- 'Ton', 'Bag', 'Meter', 'Piece', 'Hour', 'Day'
    price_amount NUMERIC(12,2) NOT NULL,
    compare_at_price NUMERIC(12,2),
    currency VARCHAR(10) DEFAULT 'USD',
    min_order_quantity INT DEFAULT 1,
    max_order_quantity INT DEFAULT 100000,
    stock_quantity INT DEFAULT 0,
    is_in_stock BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    rating_average NUMERIC(3,2) DEFAULT 5.00,
    rating_count INT DEFAULT 0,
    images JSONB DEFAULT '[]', -- Array of image objects [{ id, url, isPrimary }]
    specifications JSONB DEFAULT '[]', -- Key-value specs [{ key, value, unit }]
    bulk_pricing JSONB DEFAULT '[]', -- Tier discounts [{ minQty, maxQty, discountPercent, unitPrice }]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. RFQ (REQUEST FOR QUOTATION)
CREATE TABLE rfqs (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_number VARCHAR(50) UNIQUE NOT NULL,
    buyer_id VARCHAR(64) REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    delivery_location JSONB NOT NULL, -- { address, city, country, latitude, longitude }
    target_date DATE,
    status rfq_status_enum DEFAULT 'submitted',
    specifications JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]', -- Bill of Quantities, CAD files, Test Reports
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. RFQ QUOTATIONS (Vendor Proposals)
CREATE TABLE rfq_quotations (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    rfq_id VARCHAR(64) REFERENCES rfqs(id) ON DELETE CASCADE,
    vendor_id VARCHAR(64) REFERENCES users(id) ON DELETE RESTRICT,
    total_amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    delivery_days INT NOT NULL,
    payment_terms VARCHAR(255),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'negotiating'
    valid_until DATE NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. CARTS & CART ITEMS
CREATE TABLE carts (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id VARCHAR(64) REFERENCES carts(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id) ON DELETE CASCADE,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    variant_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. ORDERS TABLE
CREATE TABLE orders (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    buyer_id VARCHAR(64) REFERENCES users(id) ON DELETE RESTRICT,
    subtotal NUMERIC(15,2) NOT NULL,
    shipping_cost NUMERIC(12,2) DEFAULT 0.00,
    tax_amount NUMERIC(12,2) DEFAULT 0.00,
    discount_amount NUMERIC(12,2) DEFAULT 0.00,
    wallet_used NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    status order_status_enum DEFAULT 'pending',
    payment_status payment_status_enum DEFAULT 'unpaid',
    payment_method payment_method_enum DEFAULT 'card',
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    tracking_number VARCHAR(100),
    estimated_delivery DATE,
    timeline JSONB DEFAULT '[]', -- [{ status, title, timestamp, description }]
    invoice_pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. USER ADDRESSES
CREATE TABLE user_addresses (
    id VARCHAR(64) PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL, -- e.g. "Headquarters", "Site Project A"
    recipient_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    address_line1 TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Comprehensive REST API Specifications

### Module 1: Authentication & User Lifecycle

#### 1.1 `POST /auth/send-otp`
Sends a 6-digit verification code to the user's mobile number.
- **Rate Limit:** 3 requests per phone per 10 minutes.
- **Request Body:**
  ```json
  {
    "phone": "+919876543210",
    "purpose": "login" // or "register"
  }
  ```
- **Backend Flow:**
  1. Validate phone number format (E.164 standard, 10 digits for India starting with 6-9).
  2. Generate 6-digit cryptographically secure numerical token (or use `123456` if `DEV_MODE_OTP=true`).
  3. Store hash in Redis with TTL = 300 seconds (5 minutes).
  4. Dispatch SMS via Twilio/SMS gateway.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "OTP sent successfully",
    "data": {
      "phone": "+919876543210",
      "expiresIn": 300,
      "resendCooldown": 45
    }
  }
  ```

#### 1.2 `POST /auth/verify-otp`
Validates the user's entered OTP code.
- **Request Body:**
  ```json
  {
    "phone": "+919876543210",
    "otp": "123456",
    "purpose": "login"
  }
  ```
- **Backend Flow:**
  1. Lookup active OTP session in Redis/Database.
  2. Verify code. If mismatched, increment failure attempt counter (lock after 5 failed attempts).
  3. Check if user already exists in `users` table:
     - **Existing User:** Generate JWT access token (15m expiration) & refresh token (30d expiration). Return full user profile & `isNewUser: false`.
     - **New User:** Generate temporary registration token (TTL 15m). Return `isNewUser: true`.
- **Response (200 OK - Existing User):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "OTP verified successfully",
    "data": {
      "isNewUser": false,
      "tokens": {
        "accessToken": "eyJhbGciOi...",
        "refreshToken": "eyJhbGciOi...",
        "expiresIn": 900
      },
      "user": {
        "id": "usr_9876543210",
        "phone": "+919876543210",
        "firstName": "Rajesh",
        "lastName": "Sharma",
        "fullName": "Rajesh Sharma",
        "email": "rajesh.sharma@hinchmart.com",
        "accountType": "business",
        "businessProfile": {
          "companyName": "Apex Construction Ltd",
          "gstNumber": "27AABCU9603R1ZM"
        },
        "isVerified": true
      }
    }
  }
  ```

#### 1.3 `POST /auth/register`
Creates a profile for a new user after OTP confirmation or direct registration.
- **Request Body:**
  ```json
  {
    "phone": "+919876543210",
    "firstName": "Amit",
    "lastName": "Verma",
    "email": "amit.verma@infra.com",
    "accountType": "business", // "individual" | "business" | "contractor" | "vendor"
    "companyName": "Verma Infra Projects Pvt Ltd",
    "gstNumber": "07AAAAA0000A1Z5"
  }
  ```
- **Response (201 Created):** Returns user profile and authentication token pair.

#### 1.4 `POST /auth/refresh-token`
Generates a new access token using a valid refresh token.
- **Request Body:** `{ "refreshToken": "eyJhbGci..." }`
- **Response (200 OK):** `{ "accessToken": "eyJhbGci...", "refreshToken": "..." }`

---

### Module 2: Products & Catalog Engine

#### 2.1 `GET /products`
Query and filter verified construction materials and equipment.
- **Query Parameters:**
  - `page` (int, default: 1)
  - `limit` (int, default: 20)
  - `categoryId` (string, optional)
  - `subCategory` (string, optional)
  - `brand` (string, optional)
  - `minPrice` & `maxPrice` (numeric, optional)
  - `inStockOnly` (boolean, optional)
  - `isFeatured` / `isTrending` (boolean, optional)
  - `search` (string, optional)
  - `sortBy` (`price_asc` | `price_desc` | `rating` | `newest`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": [
      {
        "id": "p1",
        "sku": "ST-12MM-50",
        "name": "Grade 50 High-Yield Steel Rebar 12mm",
        "slug": "steel-rebar-12mm",
        "unit": "Ton",
        "price": {
          "amount": 850.00,
          "compareAtPrice": 950.00,
          "currency": "USD",
          "discount": 11
        },
        "brand": { "name": "Tata Tiscon", "isVerified": true },
        "vendor": { "id": "v1", "name": "Global Metals Co", "rating": 4.9, "location": "Dubai, UAE" },
        "stock": { "available": 500, "isInStock": true },
        "minOrderQuantity": 5,
        "rating": { "average": 4.8, "count": 124 },
        "images": [{ "id": "i1", "url": "https://...", "isPrimary": true }]
      }
    ],
    "meta": { "page": 1, "limit": 20, "total": 450, "totalPages": 23 }
  }
  ```

#### 2.2 `GET /products/:id`
Retrieves detailed specifications, bulk pricing slabs, warranty, and seller profile for a single product.

#### 2.3 `GET /categories`
Returns complete taxonomy of categories, subcategories, SLA delivery tags, and icon metadata.

---

### Module 3: RFQ (Request for Quotation) Pipeline

#### 3.1 `POST /rfq`
Enables contractors to submit customized bill of quantities (BoQ) for factory-direct bulk bidding.
- **Headers:** `Authorization: Bearer <TOKEN>`
- **Request Body:**
  ```json
  {
    "title": "Procurement of 500 Tons OPC 53 Grade Cement",
    "description": "Bulk supply required for high-rise commercial project. Must include mill test certificates.",
    "deliveryLocation": {
      "address": "Plot 405, Business Bay",
      "city": "Dubai",
      "country": "UAE",
      "latitude": 25.185,
      "longitude": 55.275
    },
    "targetDate": "2026-09-15",
    "specifications": [
      { "material": "OPC 53 Grade", "quantity": 500, "unit": "Ton" }
    ],
    "attachmentUrls": ["https://s3.amazonaws.com/hinchmart-rfq/boq_specs.pdf"]
  }
  ```
- **Backend Flow:**
  1. Store RFQ record with status `submitted`.
  2. Generate unique human-readable tracking number: `RFQ-88210`.
  3. Emit event/push notification to verified vendors within the category and delivery zone.
- **Response (201 Created):** Returns created RFQ object.

#### 3.2 `GET /rfq` & `GET /rfq/:id`
Lists all RFQs submitted by the buyer with active supplier quotations and statuses (`submitted`, `quoted`, `approved`, `completed`).

#### 3.3 `POST /rfq/:id/quotations/:quoteId/approve`
Approves a specific vendor's quotation, locks the agreed price, and converts the quotation into a purchase order/checkout session with Escrow Protection.

---

### Module 4: Cart, Checkout & Orders

#### 4.1 `GET /cart` & `POST /cart/items`
Manages persistent user cart items with live tier pricing calculations:
- `POST /cart/items` payload: `{ "productId": "p1", "quantity": 10 }`
- `PUT /cart/items/:id` payload: `{ "quantity": 15 }`
- `DELETE /cart/items/:id` removes item.

#### 4.2 `POST /checkout/place-order`
Processes B2B orders with address validation, tax breakdown, and payment authorization.
- **Request Body:**
  ```json
  {
    "shippingAddressId": "addr_01",
    "billingAddressId": "addr_01",
    "paymentMethod": "card", // "card" | "bank_wire" | "wallet" | "letter_of_credit"
    "couponCode": null,
    "useWalletBalance": 0
  }
  ```
- **Backend Flow:**
  1. Validate stock availability and lock inventory (ACID transaction).
  2. Calculate GST/VAT based on shipping location.
  3. Authorize payment via Payment Gateway / Escrow.
  4. Generate order record `HM-994821` and clear cart.
  5. Generate initial tracking timeline entry: `"Order Confirmed"`.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "statusCode": 200,
    "message": "Order placed successfully",
    "data": {
      "orderId": "ord_994821",
      "orderNumber": "HM-994821",
      "totalAmount": 4400.00,
      "currency": "USD",
      "status": "confirmed",
      "estimatedDelivery": "2026-08-25"
    }
  }
  ```

#### 4.3 `GET /orders` & `GET /orders/:id`
Retrieves past order records, item manifests, live freight GPS coordinates, timeline updates, and downloadable PDF tax invoices (`/orders/:id/invoice`).

---

### Module 5: Heavy Equipment Rentals & Fleet Management

#### 5.1 `GET /rentals`
Lists heavy excavators, tower cranes, transit mixers, generators, and dewatering pumps with daily/monthly rate slabs.

#### 5.2 `POST /rentals/book`
- **Request Body:**
  ```json
  {
    "equipmentId": "eq_excavator_20t",
    "startDate": "2026-09-01",
    "endDate": "2026-09-30",
    "siteLocation": { "address": "Jebel Ali Site 4", "city": "Dubai" },
    "includeCertifiedOperator": true,
    "fuelArrangement": "client_supplied"
  }
  ```

---

## 4. Security, Non-Functional Requirements & Best Practices

### 4.1 Authentication & Token Lifecycle
- **Access Tokens:** Signed with RS256/HS256 JWT, lifespan = **15 minutes**.
- **Refresh Tokens:** Cryptographically random 64-char string stored in Redis / DB with client IP & user agent fingerprints, lifespan = **30 days**.
- **Passwordless Security:** Standardize around SMS OTP + biometric sessions on mobile.
- **Session Revocation:** Support immediate user logout by blacklisting the active access token in Redis until expiry.

### 4.2 Rate Limiting (Redis Token Bucket)
- `/auth/send-otp`: 3 requests per phone per 10 minutes. Max 5 verification attempts per OTP.
- `/rfq` creation: Max 10 submissions per user per hour.
- General REST API: 100 requests per minute per IP.

### 4.3 Input Validation & Sanitization
- All request payloads must be validated using **Zod** / **class-validator (NestJS)** / **Joi**.
- Reject unexpected JSON properties (`stripUnknown: true`).
- Protect against SQL Injection via parameterized queries / ORM (Prisma / TypeORM / Drizzle).

### 4.4 File Upload Protocol (BoQ & CAD Attachments)
- Never accept large files directly through API application memory.
- Implement **Presigned S3/GCS Upload URLs** via `POST /upload/presigned-url`. Client uploads directly to S3, then submits the resulting URL to the API.

---

## 5. Phased Backend Development Roadmap

| Phase | Milestone | Duration | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Core Infrastructure & Auth Engine** | Weeks 1 - 2 | PostgreSQL setup, Redis cache, JWT Auth, SMS OTP Gateway, Business Profile APIs. |
| **Phase 2** | **Catalog, Search & Inventory** | Weeks 3 - 4 | Product CRUD, Category taxonomy, Tier pricing calculations, Typesense/Elasticsearch. |
| **Phase 3** | **RFQ & B2B Bidding Pipeline** | Weeks 5 - 6 | RFQ creation, BoQ attachment uploads, Supplier quoting engine, Quote approval workflows. |
| **Phase 4** | **Cart, Checkout & Order Processing** | Weeks 7 - 8 | Cart logic, Payment gateway & Escrow hooks, Order state machine, Automated PDF invoice generation. |
| **Phase 5** | **Rentals, Logistics & Notifications** | Weeks 9 - 10 | Equipment booking calendar, Live GPS tracking timeline, Expo Push Notifications. |
| **Phase 6** | **Security Auditing, QA & Production Deployment** | Weeks 11 - 12 | Load testing (k6), Security audit, CI/CD pipeline, Staging validation & Production release. |

---

## 6. Environment Variables Template (`.env.example`)

```bash
# Server Config
PORT=5000
NODE_ENV=production
API_PREFIX=/v1
CORS_ORIGINS=https://hinchmart.com,http://localhost:8081

# Database (PostgreSQL)
DATABASE_URL=postgresql://hinchmart_user:StrongPassword123@localhost:5432/hinchmart_db?schema=public

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets
JWT_ACCESS_SECRET=super_secret_access_key_min_32_chars
JWT_REFRESH_SECRET=super_secret_refresh_key_min_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# SMS Gateway (Twilio / Msg91)
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY
TWILIO_SERVICE_SID=VAZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ
DEV_MODE_OTP=false # Set to true in staging to accept 123456

# Object Storage (AWS S3)
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=hinchmart-production-assets

# Payment Gateway
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXXXX
RAZORPAY_KEY_SECRET=YYYYYYYYYYYYYYYYYYYYYYYY

# Push Notifications
EXPO_ACCESS_TOKEN=your_expo_access_token
```
