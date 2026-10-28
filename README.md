# Transaction Ledger API

Express + TypeScript + PostgreSQL backend for accounts, credit/debit transactions, balances, transaction history and transfers.

## Setup

Requirements: Node.js 18+ and Docker Desktop.

```bash
cd backend
cp .env.example .env        # already points at the Docker database
docker compose up -d        # starts PostgreSQL on port 5432
npm install
npm run dev                 # http://localhost:5000
```

Tables are created automatically on startup. Health check: <http://localhost:5000/health>

If port 5432 is already in use by a local PostgreSQL, stop it or change the host port in `docker-compose.yml` and in `DATABASE_URL` in `.env`.

## Testing in Postman

Send every request to `http://localhost:5000` with the body set to **raw → JSON**.
Use the `id` returned by "Create account" wherever `<ACCOUNT_ID>` appears.



### 1. Create account

`POST /api/v1/accounts`

```json
{ "name": "Jane Doe" }
```

Response `201`:

```json
{ "id": "7a7a2695-48d0-4a3a-9a28-916e23d77eab", "name": "Jane Doe", "balance": 0, "created_at": "2026-10-28T15:45:00.000Z" }
```

### 2. Credit / debit

`POST /api/v1/transactions`

```json
{
  "account_id": "<ACCOUNT_ID>",
  "type": "credit",
  "amount": 100,
  "description": "Salary deposit",
  "reference_id": "DEP-001"
}
```

`type` is `credit` or `debit`. `reference_id` must be unique per account, so use a new one for each request. Response `201`:

```json
{
  "id": "45d1d6ef-9a57-41ec-b286-9a55ce65dc57",
  "account_id": "7a7a2695-48d0-4a3a-9a28-916e23d77eab",
  "type": "credit",
  "amount": 100,
  "description": "Salary deposit",
  "reference_id": "DEP-001",
  "created_at": "2026-10-28T15:46:00.000Z",
  "new_balance": 100
}
```

### 3. Get balance

`GET /api/v1/accounts/<ACCOUNT_ID>/balance`

Response `200`:

```json
{ "account_id": "7a7a2695-48d0-4a3a-9a28-916e23d77eab", "balance": 100 }
```

### 4. Transaction history

`GET /api/v1/transactions/<ACCOUNT_ID>`

Optional query parameters: `type` (`credit` or `debit`), `page` (default 1), `limit` (default 10, max 100). Example: `?type=debit&page=1&limit=10`

Response `200` (newest first):

```json
{
  "data": [
    {
      "id": "45d1d6ef-9a57-41ec-b286-9a55ce65dc57",
      "account_id": "7a7a2695-48d0-4a3a-9a28-916e23d77eab",
      "type": "credit",
      "amount": 100,
      "description": "Salary deposit",
      "reference_id": "DEP-001",
      "created_at": "2026-10-28T15:46:00.000Z"
    }
  ],
  "pagination": { "currentPage": 1, "pageSize": 10, "totalRecords": 1, "totalPages": 1 }
}
```

### 5. Transfer between accounts

`POST /api/v1/transfers` (create a second account first and credit the source account)

```json
{
  "source_account_id": "<ACCOUNT_A>",
  "destination_account_id": "<ACCOUNT_B>",
  "amount": 25,
  "description": "Consulting fee",
  "reference_id": "TRF-001"
}
```

Response `201`:

```json
{
  "message": "Transfer completed successfully.",
  "source_account_id": "7a7a2695-48d0-4a3a-9a28-916e23d77eab",
  "destination_account_id": "2d8f99e1-6782-411a-8c90-0987162534de",
  "amount": 25,
  "source_new_balance": 75,
  "destination_new_balance": 25,
  "reference_id": "TRF-001",
  "created_at": "2026-10-28T15:50:00.000Z"
}
```


---

## Data Integrity & Concurrency Design

* **Atomicity (ACID):** Adding transactions and updating balances run inside explicit PostgreSQL transactions (`BEGIN` / `COMMIT` / `ROLLBACK`). If any step fails, no changes persist.
* **Concurrency & Race Conditions:** Uses pessimistic row locking (`SELECT ... FOR UPDATE`) to prevent double-spending under concurrent debit requests.
* **Deadlock Prevention in Transfers:** During money transfers, row locks on the two accounts are always acquired in deterministic lexicographical order (`[src, dest].sort()`).
* **Idempotency:** Enforced via a composite unique constraint `UNIQUE (account_id, reference_id)`. Duplicate submissions return `409 Conflict` without modifying balances.

---

## Assumptions

1. **Monetary Precision:** All amounts and balances are stored as PostgreSQL `NUMERIC(15, 2)` to avoid floating-point rounding errors common in monetary calculations.
2. **Single Currency:** All transactions operate in a uniform currency; multi-currency conversions are out of scope.
3. **Client-Provided Reference ID:** In line with the assignment brief, `reference_id` acts as an idempotency key supplied by the client (UUID or alphanumeric string up to 255 chars). It is unique per account, but may be reused across different accounts.
4. **Transaction Immutability:** Financial transaction records are strictly append-only audit logs. No `UPDATE` or `DELETE` endpoints exist.
5. **No Overdrafts:** Account balance must never drop below zero, enforced both at the application service layer and via a database constraint (`CHECK (balance >= 0)`).
6. **Authentication & Authorization:** The assessment focuses on the core ledger mechanics, atomicity, and concurrency control. User authentication/authorization is assumed to be handled at the API gateway layer or future middleware.
