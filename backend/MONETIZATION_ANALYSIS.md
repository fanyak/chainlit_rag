# Foros Chat - Monetization & Financial Analysis

**Document Version:** 1.0  
**Date:** January 2026  
**Based on:** `chainlit_b.py` flow analysis

---

## Executive Summary

This document analyzes the monetization strategy implemented in the Foros Chat application, a Greek tax law AI assistant. The strategy uses a **hybrid pricing model** combining:

1. **Token-based pricing** with a 3x markup over base costs
2. **Per-query overhead fee** (€0.01) to cover retrieval services
3. **VAT (24%)** - Greek standard rate applied to all charges
4. **Pay-as-you-go** model with no recurring subscriptions

---

## 1. Cost Structure Analysis

### 1.1 Direct API Costs (Per Query)

Based on the flow in `chainlit_b.py`:

#### Gemini 2.5 Flash (Primary LLM)

| Component     | Base Cost (Google) | Usage Pattern          |
| ------------- | ------------------ | ---------------------- |
| Input Tokens  | $0.30 / 1M tokens  | ~2,000-5,000 per query |
| Output Tokens | $2.50 / 1M tokens  | ~300-800 per query     |

**LLM Calls Per Query Pipeline:**

The RAG pipeline now includes up to 4 LLM calls per user query:

| Step | LLM Call            | Input Tokens | Output Tokens | Purpose                                  |
| ---- | ------------------- | ------------ | ------------- | ---------------------------------------- |
| 1    | Classification      | ~200         | ~20           | Determine if query is simple or complex  |
| 2    | Decomposition\*     | ~300         | ~100          | Split complex queries into sub-questions |
| 3    | Multi-Query         | ~500         | ~200          | Generate search query variants           |
| 4    | Response Generation | ~3,000       | ~500          | Generate final answer with citations     |

\*Decomposition only runs for complex queries (~20% of queries)

**Typical Query Cost Breakdown (Simple Query):**

- Classification: 200 input + 20 output tokens
- Multi-Query: 500 input + 200 output tokens
- Response Generation: 3,000 input + 500 output tokens
- **Total: 3,700 input tokens, 720 output tokens**
- Input cost: 3,700 × ($0.30 / 1,000,000) = **$0.00111**
- Output cost: 720 × ($2.50 / 1,000,000) = **$0.00180**
- **Total LLM cost per simple query: ~$0.00291 (~€0.0027)**

**Typical Query Cost Breakdown (Complex Query):**

- Classification: 200 input + 20 output tokens
- Decomposition: 300 input + 100 output tokens
- Multi-Query (×2 sub-questions): 1,000 input + 400 output tokens
- Response Generation: 4,000 input + 700 output tokens
- **Total: 5,500 input tokens, 1,220 output tokens**
- Input cost: 5,500 × ($0.30 / 1,000,000) = **$0.00165**
- Output cost: 1,220 × ($2.50 / 1,000,000) = **$0.00305**
- **Total LLM cost per complex query: ~$0.0047 (~€0.0043)**

#### Cohere Rerank v3.5

| Tier       | Cost                    |
| ---------- | ----------------------- |
| Rerank API | ~$1.00 / 1,000 searches |

- Each query triggers 1 rerank operation
- **Cost per query: ~$0.001 (~€0.0009)**

### 1.2 Infrastructure Costs (Monthly Fixed)

| Service                  | Estimated Monthly Cost | Notes                           |
| ------------------------ | ---------------------- | ------------------------------- |
| Qdrant Cloud (Vector DB) | €20-50/month           | Depends on storage & queries    |
| Google Cloud Storage     | €5-15/month            | Document storage, chat elements |
| Compute/Hosting          | €20-100/month          | Cloud Run, App Engine, etc.     |
| SQLite/Database          | ~€0 (included)         | Local or bundled                |
| Domain/SSL               | €10-20/month           | If applicable                   |

**Estimated Fixed Costs: €55-185/month**

### 1.3 Total Cost Per Query (At Cost)

| Component                   | Simple Query | Complex Query |
| --------------------------- | ------------ | ------------- |
| Gemini API (Classification) | €0.0003      | €0.0003       |
| Gemini API (Decomposition)  | -            | €0.0005       |
| Gemini API (Multi-Query)    | €0.0005      | €0.0010       |
| Gemini API (Generation)     | €0.0019      | €0.0025       |
| Cohere Rerank               | €0.001       | €0.001        |
| **Variable cost per query** | **€0.0037**  | **€0.0053**   |

**Weighted Average** (assuming 80% simple, 20% complex): **~€0.004/query**

---

## 2. Revenue Model Implementation

### 2.1 Pricing Formula

```python
# As implemented in chainlit_b.py

# Profit margin multiplier
PROFIT_MARGIN = 3.0  # 300% of base cost

# Per-query overhead for infrastructure
PER_QUERY_OVERHEAD = 0.01  # €0.01 per query

# VAT rate (Greek standard rate)
VAT_RATE = 0.24  # 24%

# Base rates (Google's cost)
base_input_rate = 0.30 / 1_000_000   # $0.30 per 1M
base_output_rate = 2.50 / 1_000_000  # $2.50 per 1M

# User-facing rates (with markup)
charge_per_input_token = base_input_rate * PROFIT_MARGIN  # $0.90 per 1M
charge_per_output_token = base_output_rate * PROFIT_MARGIN  # $7.50 per 1M

# Total charge per query (including VAT)
token_charge = (input_tokens × charge_input) + (output_tokens × charge_output)
net_charge = token_charge + PER_QUERY_OVERHEAD
vat_amount = net_charge * VAT_RATE
total_charge = net_charge + vat_amount  # Final price including VAT
```

### 2.2 User-Facing Pricing

| Component          | Base Cost | With 3x Markup | Net Price | With VAT (24%) |
| ------------------ | --------- | -------------- | --------- | -------------- |
| Input tokens       | $0.30/1M  | $0.90/1M       | €0.82/1M  | €1.02/1M       |
| Output tokens      | $2.50/1M  | $7.50/1M       | €6.82/1M  | €8.46/1M       |
| Per-query overhead | -         | -              | €0.01     | €0.0124        |

**Note:** All user-facing prices include 24% VAT (gross prices).

### 2.3 Typical Query Pricing Example

For an average query (3,000 input tokens, 500 output tokens):

| Component                     | Calculation      | Amount       |
| ----------------------------- | ---------------- | ------------ |
| Input tokens                  | 3,000 × €0.82/1M | €0.00246     |
| Output tokens                 | 500 × €6.82/1M   | €0.00341     |
| Per-query overhead            | Fixed            | €0.01000     |
| **Subtotal (net)**            |                  | **€0.01587** |
| VAT (24%)                     | €0.01587 × 0.24  | €0.00381     |
| **Total user charge (gross)** |                  | **€0.01968** |

---

## 3. Profitability Analysis

### 3.1 Per-Query Profit

| Item                              | Amount       |
| --------------------------------- | ------------ |
| Revenue per query (gross, avg)    | €0.01968     |
| VAT payable to government (24%)   | -€0.00381    |
| **Revenue after VAT (net)**       | **€0.01587** |
| Direct costs (LLM + Cohere)       | -€0.003      |
| **Gross profit per query**        | **€0.01287** |
| **Gross margin (on net revenue)** | **~81%**     |

**Important:** VAT is collected from users and remitted to the government. It is not profit.

### 3.2 Break-Even Analysis

To cover fixed monthly costs:

| Fixed Costs         | Queries Needed | Daily Queries |
| ------------------- | -------------- | ------------- |
| €55/month (low)     | 4,273 queries  | ~143/day      |
| €100/month (medium) | 7,771 queries  | ~259/day      |
| €185/month (high)   | 14,375 queries | ~479/day      |

### 3.3 Profit Scenarios

#### Scenario A: 100 queries/day (Low Usage)

- Monthly queries: 3,000
- Revenue: 3,000 × €0.01587 = **€47.61**
- Gross profit: 3,000 × €0.01287 = **€38.61**
- After fixed costs (€100): **-€61.39** (loss)

#### Scenario B: 500 queries/day (Medium Usage)

- Monthly queries: 15,000
- Revenue: 15,000 × €0.01587 = **€238.05**
- Gross profit: 15,000 × €0.01287 = **€193.05**
- After fixed costs (€100): **+€93.05** (profit)

#### Scenario C: 1,000 queries/day (High Usage)

- Monthly queries: 30,000
- Revenue: 30,000 × €0.01587 = **€476.10**
- Gross profit: 30,000 × €0.01287 = **€386.10**
- After fixed costs (€100): **+€286.10** (profit)

---

## 4. Subscription Packages

### Current Offerings

| Package  | Price  | Est. Queries\* | Cost per Query |
| -------- | ------ | -------------- | -------------- |
| Minimum  | €5.00  | ~20 queries    | €0.25/query    |
| Standard | €10.00 | ~40 queries    | €0.25/query    |

\*Note: "~20 queries" advertised is based on simpler queries. Actual usage varies.

### Actual Value Analysis

With the implemented pricing (~€0.016/query avg):

- €5.00 package → ~315 simple queries (or ~20 complex queries)
- €10.00 package → ~630 simple queries (or ~40 complex queries)

The "20 queries" estimate assumes heavy queries with large context retrieval.

---

## 5. Code Flow Analysis

### Query Processing Pipeline (from chainlit_b.py)

```
User Question
     │
     ▼
┌─────────────────────────────────────┐
│ 1. QUERY CLASSIFICATION (NEW)       │
│    - LLM determines simple/complex  │
│    - Tokens: ~200 input, ~20 output │
│    - Cost: ~€0.0003 (at cost)       │
└─────────────────────────────────────┘
     │
     ├──────────────────┬──────────────────┐
     │ Simple Query     │ Complex Query    │
     ▼                  ▼                  │
     │    ┌─────────────────────────────┐  │
     │    │ 2a. DECOMPOSITION (NEW)    │  │
     │    │    - Split into sub-queries │  │
     │    │    - Tokens: ~300 in, ~100 out│
     │    │    - Cost: ~€0.0005 (at cost)│ │
     │    └─────────────────────────────┘  │
     │                  │                  │
     │                  ▼                  │
     │    ┌─────────────────────────────┐  │
     │    │ 2b. EMIT MULTI TOOL CALLS  │  │
     │    │    - Create tool call per   │  │
     │    │      sub-question           │  │
     │    └─────────────────────────────┘  │
     │                  │                  │
     ▼                  ▼                  │
┌─────────────────────────────────────────┐
│ 3. MULTI-QUERY RETRIEVAL                │
│    - LLM generates 5 query variants     │
│      (per sub-question if complex)      │
│    - Tokens: ~500 input, ~200 output    │
│    - Cost: ~€0.0005-0.0010 (at cost)    │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 4. HYBRID SEARCH (Qdrant)               │
│    - Dense + Sparse vectors             │
│    - Retrieves top 25 documents         │
│    - Deduplication for complex queries  │
│    - Cost: Included in Qdrant sub       │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 5. COHERE RERANK                        │
│    - Reranks to top 10-15 documents     │
│    - Cost: ~€0.001 per query            │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 6. RESPONSE GENERATION                  │
│    - System prompt + context + Q        │
│    - Tokens: ~3000-4000 input           │
│    - Tokens: ~500-700 output            │
│    - Cost: ~€0.0019-0.0025 (at cost)    │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ 7. BILLING                              │
│    - Token charge + €0.012 overhead     │
│    - Deduct from user balance           │
│    - Log to database                    │
└─────────────────────────────────────────┘
```

### Token Usage Tracking

Implemented via `UsageMetadataCallbackHandler`:

- Captures input/output tokens per request
- Stored in thread metadata
- User balance updated atomically

---

## 6. Environment Variables

The following can be configured in production:

```bash
# Pricing configuration
PROFIT_MARGIN=3.0              # Markup multiplier (default: 3x)
PER_QUERY_OVERHEAD=0.012       # Per-query fee in EUR (default: €0.012)
                               # Covers: Cohere rerank + extra LLM calls overhead
CHARGE_PER_INPUT_TOKEN=0.0    # Override input rate (optional)
CHARGE_PER_OUTPUT_TOKEN=0.0   # Override output rate (optional)

# Model configuration
MODEL_NAME=gemini-2.5-flash    # LLM model to use
```

---

## 7. Recommendations

### Short-term Optimizations

1. **Monitor actual token usage** - Track average tokens per query to refine estimates
2. **A/B test pricing** - Try 2.5x vs 3.5x markup to find optimal conversion
3. **Add usage analytics** - Dashboard for revenue/cost monitoring

### Medium-term Improvements

1. **Tiered pricing** - Power users get volume discounts
2. **Query complexity tiers** - Simple lookups vs. complex analysis
3. **Prepaid packages** - Larger packages (€20, €50) with bonus credits

### Long-term Considerations

1. **Annual subscriptions** - Discount for commitment
2. **Enterprise tier** - Custom pricing for businesses
3. **API access** - Programmatic access for integrations

---

## 8. Risk Factors

| Risk                      | Mitigation                                 |
| ------------------------- | ------------------------------------------ |
| Google price changes      | Monitor API pricing, adjust markup         |
| Low user volume           | Marketing, SEO, partnerships               |
| High infrastructure costs | Optimize Qdrant queries, caching           |
| Competition               | Differentiate with quality, specialization |

---

## Appendix: Quick Reference

### Pricing at a Glance

| Metric                                | Value            |
| ------------------------------------- | ---------------- |
| Markup multiplier                     | 3.0x             |
| Per-query overhead                    | €0.012           |
| VAT rate                              | 24%              |
| Avg cost to you per query             | €0.004           |
| Avg charge to user (net, excl. VAT)   | €0.024           |
| Avg charge to user (gross, incl. VAT) | €0.030           |
| Gross margin (on net revenue)         | ~83%             |
| Break-even (medium costs)             | ~170 queries/day |

### Key Files

- `backend/chainlit_b.py` - Main application with billing logic (lines 565-595)
- `frontend/src/pages/Terms.tsx` - User-facing pricing terms
- `frontend/src/components/PaymentPlants.tsx` - Subscription packages

---

_Document generated for Foros Chat monetization strategy review._
