# Foros Chat - Monetization & Financial Analysis

**Document Version:** 1.0  
**Date:** January 2026  
**Based on:** `chainlit_b.py` flow analysis

---

## Executive Summary

This document analyzes the monetization strategy implemented in the Foros Chat application, a Greek tax law AI assistant. The strategy uses a **hybrid pricing model** combining:

1. **Token-based pricing** with a 3x markup over base costs
2. **Per-query overhead fee** (€0.01) to cover retrieval services
3. **Pay-as-you-go** model with no recurring subscriptions

---

## 1. Cost Structure Analysis

### 1.1 Direct API Costs (Per Query)

Based on the flow in `chainlit_b.py`:

#### Gemini 2.5 Flash (Primary LLM)

| Component     | Base Cost (Google) | Usage Pattern          |
| ------------- | ------------------ | ---------------------- |
| Input Tokens  | $0.30 / 1M tokens  | ~2,000-5,000 per query |
| Output Tokens | $2.50 / 1M tokens  | ~300-800 per query     |

**Typical Query Cost Breakdown:**

- Assuming average query: 3,000 input tokens, 500 output tokens
- Input cost: 3,000 × ($0.30 / 1,000,000) = **$0.0009**
- Output cost: 500 × ($2.50 / 1,000,000) = **$0.00125**
- **Total LLM cost per query: ~$0.00215 (~€0.002)**

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

| Component                   | Cost       |
| --------------------------- | ---------- |
| Gemini API                  | €0.002     |
| Cohere Rerank               | €0.001     |
| **Variable cost per query** | **€0.003** |

---

## 2. Revenue Model Implementation

### 2.1 Pricing Formula

```python
# As implemented in chainlit_b.py

# Profit margin multiplier
PROFIT_MARGIN = 3.0  # 300% of base cost

# Per-query overhead for infrastructure
PER_QUERY_OVERHEAD = 0.01  # €0.01 per query

# Base rates (Google's cost)
base_input_rate = 0.30 / 1_000_000   # $0.30 per 1M
base_output_rate = 2.50 / 1_000_000  # $2.50 per 1M

# User-facing rates (with markup)
charge_per_input_token = base_input_rate * PROFIT_MARGIN  # $0.90 per 1M
charge_per_output_token = base_output_rate * PROFIT_MARGIN  # $7.50 per 1M

# Total charge per query
total_charge = (input_tokens × charge_input) + (output_tokens × charge_output) + PER_QUERY_OVERHEAD
```

### 2.2 User-Facing Pricing

| Component          | Base Cost | With 3x Markup | User Pays |
| ------------------ | --------- | -------------- | --------- |
| Input tokens       | $0.30/1M  | **$0.90/1M**   | €0.82/1M  |
| Output tokens      | $2.50/1M  | **$7.50/1M**   | €6.82/1M  |
| Per-query overhead | -         | -              | **€0.01** |

### 2.3 Typical Query Pricing Example

For an average query (3,000 input tokens, 500 output tokens):

| Component             | Calculation      | Amount       |
| --------------------- | ---------------- | ------------ |
| Input tokens          | 3,000 × €0.82/1M | €0.00246     |
| Output tokens         | 500 × €6.82/1M   | €0.00341     |
| Per-query overhead    | Fixed            | €0.01000     |
| **Total user charge** |                  | **€0.01587** |

---

## 3. Profitability Analysis

### 3.1 Per-Query Profit

| Item                        | Amount       |
| --------------------------- | ------------ |
| Revenue per query (avg)     | €0.01587     |
| Direct costs (LLM + Cohere) | €0.003       |
| **Gross profit per query**  | **€0.01287** |
| **Gross margin**            | **~81%**     |

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
│ 1. MULTI-QUERY RETRIEVAL            │
│    - LLM generates 5 query variants │
│    - Tokens: ~500 input, ~200 output│
│    - Cost: ~€0.0005 (at markup)     │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 2. HYBRID SEARCH (Qdrant)           │
│    - Dense + Sparse vectors         │
│    - Retrieves top 20 documents     │
│    - Cost: Included in Qdrant sub   │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 3. COHERE RERANK                    │
│    - Reranks to top 10 documents    │
│    - Cost: ~€0.001 per query        │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 4. RESPONSE GENERATION              │
│    - System prompt + context + Q    │
│    - Tokens: ~2000-4000 input       │
│    - Tokens: ~300-800 output        │
│    - Cost: ~€0.005 (at markup)      │
└─────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────┐
│ 5. BILLING                          │
│    - Token charge + €0.01 overhead  │
│    - Deduct from user balance       │
│    - Log to database                │
└─────────────────────────────────────┘
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
PER_QUERY_OVERHEAD=0.01        # Per-query fee in EUR (default: €0.01)
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

| Metric                       | Value            |
| ---------------------------- | ---------------- |
| Markup multiplier            | 3.0x             |
| Per-query overhead           | €0.01            |
| Avg cost to you per query    | €0.003           |
| Avg charge to user per query | €0.016           |
| Gross margin                 | ~81%             |
| Break-even (medium costs)    | ~260 queries/day |

### Key Files

- `backend/chainlit_b.py` - Main application with billing logic (lines 565-595)
- `frontend/src/pages/Terms.tsx` - User-facing pricing terms
- `frontend/src/components/PaymentPlants.tsx` - Subscription packages

---

_Document generated for Foros Chat monetization strategy review._
