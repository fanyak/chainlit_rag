import { AmountPaidType } from './redirectSchema';

export interface CreateVivaPaymentsOrderResponse {
  orderCode: string;
}

export interface UserPaymentInfo {
  id: string;
  transaction_id: string;
  order_code: string;
  user_id: string;
  event_id: number;
  eci: number;
  created_at: Date;
  amount: AmountPaidType;
}

export interface CreatePaymentResponse {
  id: string;
  balance: number;
}
