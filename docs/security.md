# PocketPilot Security Controls & Compliance Specification

## 1. Authentication & Cryptography

### Password Storage
- **Algorithm**: `bcrypt` adaptive hashing function with salt generation.
- **Cost Factor**: 12 rounds of work factor, balancing high brute-force resistance with reasonable server compute latency (~200ms per verification).
- **Plaintext Handling**: Plaintext passwords are never logged, never stored in session caches, and never retained in database records.

### Token Architecture
- **Protocol**: JSON Web Token (JWT) with standard `Authorization: Bearer <token>` transport.
- **Signature Algorithm**: HMAC-SHA256 (`HS256`) using a cryptographically random, environment-injected secret key (`SECRET_KEY`).
- **Token Claims**: Contains subject (`sub`, user integer ID), user email, and expiration timestamp (`exp`).
- **Session Lifespan**: Configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`. Expiration is strictly enforced on every request by the `get_current_user` dependency.

---

## 2. Multi-User Tenant Isolation

In a student financial application, preventing cross-user data leakage is paramount. PocketPilot guarantees strict isolation across all layers:

1. **Database Schema Foreign Keys**:
   - Every `Transaction`, `Budget`, and `Subscription` model contains a mandatory `user_id` foreign key referencing the `users` table.
   - Cascade deletion (`ondelete="CASCADE"`) ensures that deleting an account completely purges associated financial records.
2. **Backend Query Scoping**:
   - All SQLAlchemy database queries filter strictly by `Transaction.user_id == current_user.id`.
   - Single-record endpoints (`GET /transactions/{id}`, `PUT /transactions/{id}`, `DELETE /transactions/{id}`) verify ownership and return `404 Not Found` if a student attempts to query or mutate an ID belonging to another user.
3. **Automated Isolation Testing**:
   - The test suite includes `tests/test_user_isolation.py`, explicitly asserting that User 2 receives 404s and empty lists when attempting to read, update, or delete User 1's records.

---

## 3. Network & Transport Security

### Security Headers
Configured across both the FastAPI middleware and Nginx reverse proxy:
- `X-Content-Type-Options: nosniff`: Prevents MIME-type confusion attacks.
- `X-Frame-Options: DENY`: Prevents clickjacking by prohibiting iframe embedding.
- `X-XSS-Protection: 1; mode=block`: Activates browser cross-site scripting filters.
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`: Mandates HTTPS transport in production.
- `Referrer-Policy: strict-origin-when-cross-origin`: Restricts referrer disclosure across origins.

### CORS Enforcement
- Cross-Origin Resource Sharing (CORS) is restricted to an explicit whitelist (`CORS_ORIGINS`) configured in `.env`.
- Wildcard origins (`*`) are disallowed when credentials are exchanged.

---

## 4. Input Validation & Denial-of-Service Defense

1. **Pydantic Validation**:
   - Strict types enforce positive numeric amounts (`gt=0`), valid ISO dates, and bounded string lengths.
   - Pydantic v2 schemas reject unexpected payload types before database execution.
2. **File Upload Protection (CSV)**:
   - Maximum file size capped at `5MB` (`MAX_CSV_FILE_SIZE_BYTES`).
   - MIME validation requires `.csv` file extensions.
   - In-memory streaming prevents temporary disk exhaustion.
   - Pandas parser is wrapped in structured exception handlers rejecting malicious or malformed tabular inputs.
3. **Information Disclosure Prevention**:
   - A global exception handler intercepts all uncaught exceptions.
   - Generic user-friendly JSON responses (`An internal server error occurred...`) are returned to the client.
   - Internal stack traces, database schema definitions, and credentials are never exposed in API responses.

---

## 5. Secret Management Checklist

- [x] No default or production secret keys committed to version control.
- [x] `.env` is explicitly ignored in `.gitignore` and `.dockerignore`.
- [x] Docker images are configured to accept runtime environment variables rather than embedding credentials at build time.
- [x] Demo data seeder explicitly labels all generated records as synthetic.
