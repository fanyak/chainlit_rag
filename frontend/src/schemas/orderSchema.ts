import { z } from 'zod';

const CREATED_AT_THRESHOLD_MS = 5000; // 5 seconds

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

export const searchParamsSchema = z.object({
  amount: z.coerce.number().nullish(),
  createdAt: z.coerce.number().nullish(),
  failure: z
    .string()
    .nullish()
    .transform((val) => val === '1' || val === 'true'),
  t: z.string().nullish(),
  s: z.string().nullish(),
  eventId: z.string().nullish(),
  eci: z.string().nullish()
});

export type BaseOrderRequest = z.infer<typeof BaseOrderRequestSchema>;
export type GuestOrderRequest = z.infer<typeof GuestOrderRequestSchema>;
export type amountType = 500 | 1000;
