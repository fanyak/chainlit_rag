import { AmountType } from './redirectSchema';

export interface UserPaymentInfo {
  id: string;
  transaction_id: string;
  order_code: string;
  user_id: string;
  event_id: number;
  eci: number;
  created_at: Date;
  amount: AmountType;
}

export interface CreatePaymentResponse {
  id: string;
  balance: number;
}
