import { z } from 'zod';

const CREATED_AT_THRESHOLD_MS = 10000; // 10 seconds
const CREATED_AT_THRESHOLD_MS_CACHED = 3600000; // 1 hour

export const BaseOrderRequestSchema = z.object({
  amount: z.coerce
    .number()
    .refine((amount) => amount === 500 || amount === 1000, {
      message: 'Amount must be either 500 or 1000'
    })
});

export const GuestOrderRequestSchema = BaseOrderRequestSchema.extend({
  createdAt: z.coerce
    .number()
    .refine((createdAt) => Date.now() - createdAt < CREATED_AT_THRESHOLD_MS, {
      message: `URL expired. Request must be created within ${
        CREATED_AT_THRESHOLD_MS / 1000
      } seconds`,
      path: ['createdAt']
    })
});

export const StaleGuestOrderRequestSchema = BaseOrderRequestSchema.extend({
  createdAt: z.coerce
    .number()
    .refine(
      (createdAt) => Date.now() - createdAt < CREATED_AT_THRESHOLD_MS_CACHED,
      {
        message: `URL expired. Request must be created within ${
          CREATED_AT_THRESHOLD_MS_CACHED / 1000
        } seconds`,
        path: ['createdAt']
      }
    )
});

export const SearchParamsSchema = z.object({
  amount: z.coerce.number().nullish(),
  createdAt: z.coerce.number().nullish(),
  orderFailed: z
    .string()
    .nullish()
    .transform((val) => val === '1' || val === 'true'),
  success: z
    .string()
    .nullish()
    .transform((val) => val?.toLowerCase() === 'true'),
  t: z.string().nullish(),
  s: z.string().nullish(),
  eventId: z.string().nullish(),
  eci: z.string().nullish()
});

export const RefererSchema = SearchParamsSchema.extend({
  referer: z
    .string()
    .nullish()
    .refine((val) => {
      if (!val) return true; // allow nullish
      return ['/order'].includes(val);
    })
});

export const parseZErrorPaths = (
  result: z.SafeParseReturnType<any, any>
): (string | number)[] => {
  const paths =
    result.error?.issues.map((issue) => issue.path).flatMap((p) => p) || [];
  return paths;
};
export type BaseOrderRequest = z.infer<typeof BaseOrderRequestSchema>;
export type GuestOrderRequest = z.infer<typeof GuestOrderRequestSchema>;
export type amountType = 500 | 1000;
