export interface Subscriptions {
  id: string;
  object: string;
  application: null;
  application_fee_percent: null;
  automatic_tax: SubscriptionsAutomaticTax;
  billing_cycle_anchor: number;
  billing_thresholds: null;
  cancel_at: null;
  cancel_at_period_end: boolean;
  canceled_at: null;
  collection_method: string;
  created: number;
  currency: string;
  current_period_end: number;
  current_period_start: number;
  customer: string;
  days_until_due: null;
  default_payment_method: null;
  default_source: null;
  default_tax_rates: any[];
  description: null;
  discount: null;
  ended_at: null;
  items: Items;
  latest_invoice: LatestInvoice;
  livemode: boolean;
  metadata: Metadata;
  next_pending_invoice_item_invoice: null;
  on_behalf_of: null;
  pause_collection: null;
  payment_settings: SubscriptionsPaymentSettings;
  pending_invoice_item_interval: null;
  pending_setup_intent: null;
  pending_update: null;
  plan: Plan;
  quantity: number;
  schedule: null;
  start_date: number;
  status: string;
  test_clock: null;
  transfer_data: null;
  trial_end: null;
  trial_settings: TrialSettings;
  trial_start: null;
}

export interface SubscriptionsAutomaticTax {
  enabled: boolean;
}

export interface Items {
  object: string;
  data: ItemsDatum[];
  has_more: boolean;
  total_count: number;
  url: string;
}

export interface ItemsDatum {
  id: string;
  object: string;
  billing_thresholds: null;
  created: number;
  metadata: Metadata;
  plan: Plan;
  price: Price;
  quantity: number;
  subscription: string;
  tax_rates: any[];
}

export interface Metadata {
  meta: string;
}

export interface Plan {
  id: string;
  object: string;
  active: boolean;
  aggregate_usage: null;
  amount: number;
  amount_decimal: string;
  billing_scheme: string;
  created: number;
  currency: string;
  interval: string;
  interval_count: number;
  livemode: boolean;
  metadata: Metadata;
  nickname: null;
  product: string;
  tiers_mode: null;
  transform_usage: null;
  trial_period_days: null;
  usage_type: string;
}

export interface Price {
  id: string;
  object: string;
  active: boolean;
  billing_scheme: string;
  created: number;
  currency: string;
  custom_unit_amount: null;
  livemode: boolean;
  lookup_key: null;
  metadata: Metadata;
  nickname: null;
  product: string;
  recurring: Recurring;
  tax_behavior: string;
  tiers_mode: null;
  transform_quantity: null;
  type: string;
  unit_amount: number;
  unit_amount_decimal: string;
}

export interface Recurring {
  aggregate_usage: null;
  interval: string;
  interval_count: number;
  trial_period_days: null;
  usage_type: string;
}

export interface LatestInvoice {
  id: string;
  object: string;
  account_country: string;
  account_name: string;
  account_tax_ids: null;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  amount_shipping: number;
  application: null;
  application_fee_amount: null;
  attempt_count: number;
  attempted: boolean;
  auto_advance: boolean;
  automatic_tax: LatestInvoiceAutomaticTax;
  billing_reason: string;
  charge: string;
  collection_method: string;
  created: number;
  currency: string;
  custom_fields: null;
  customer: string;
  customer_address: null;
  customer_email: null;
  customer_name: string;
  customer_phone: null;
  customer_shipping: null;
  customer_tax_exempt: string;
  customer_tax_ids: any[];
  default_payment_method: null;
  default_source: null;
  default_tax_rates: any[];
  description: null;
  discount: null;
  discounts: any[];
  due_date: null;
  ending_balance: number;
  footer: null;
  from_invoice: null;
  hosted_invoice_url: string;
  invoice_pdf: string;
  last_finalization_error: null;
  latest_revision: null;
  lines: Lines;
  livemode: boolean;
  metadata: Metadata;
  next_payment_attempt: null;
  number: string;
  on_behalf_of: null;
  paid: boolean;
  paid_out_of_band: boolean;
  payment_intent: PaymentIntent;
  payment_settings: LatestInvoicePaymentSettings;
  period_end: number;
  period_start: number;
  post_payment_credit_notes_amount: number;
  pre_payment_credit_notes_amount: number;
  quote: null;
  receipt_number: null;
  rendering_options: null;
  shipping_cost: null;
  shipping_details: null;
  starting_balance: number;
  statement_descriptor: null;
  status: string;
  status_transitions: StatusTransitions;
  subscription: string;
  subtotal: number;
  subtotal_excluding_tax: number;
  tax: null;
  test_clock: null;
  total: number;
  total_discount_amounts: any[];
  total_excluding_tax: number;
  total_tax_amounts: any[];
  transfer_data: null;
  webhooks_delivered_at: number;
}

export interface LatestInvoiceAutomaticTax {
  enabled: boolean;
  status: null;
}

export interface Lines {
  object: string;
  data: LinesDatum[];
  has_more: boolean;
  total_count: number;
  url: string;
}

export interface LinesDatum {
  id: string;
  object: string;
  amount: number;
  amount_excluding_tax: number;
  currency: string;
  description: string;
  discount_amounts: any[];
  discountable: boolean;
  discounts: any[];
  livemode: boolean;
  metadata: Metadata;
  period: Period;
  plan: Plan;
  price: Price;
  proration: boolean;
  proration_details: ProrationDetails;
  quantity: number;
  subscription: string;
  subscription_item: string;
  tax_amounts: any[];
  tax_rates: any[];
  type: string;
  unit_amount_excluding_tax: string;
}

export interface Period {
  end: number;
  start: number;
}

export interface ProrationDetails {
  credited_items: null;
}

export interface PaymentIntent {
  id: string;
  object: string;
  amount: number;
  amount_capturable: number;
  amount_details: AmountDetails;
  amount_received: number;
  application: null;
  application_fee_amount: null;
  automatic_payment_methods: null;
  canceled_at: null;
  cancellation_reason: null;
  capture_method: string;
  client_secret: string;
  confirmation_method: string;
  created: number;
  currency: string;
  customer: string;
  description: string;
  invoice: string;
  last_payment_error: null;
  latest_charge: string;
  livemode: boolean;
  metadata: Metadata;
  next_action: null;
  on_behalf_of: null;
  payment_method: string;
  payment_method_options: PaymentMethodOptions;
  payment_method_types: string[];
  processing: null;
  receipt_email: null;
  review: null;
  setup_future_usage: string;
  shipping: null;
  source: null;
  statement_descriptor: null;
  statement_descriptor_suffix: null;
  status: string;
  transfer_data: null;
  transfer_group: null;
}

export interface AmountDetails {
  tip: Metadata;
}

export interface PaymentMethodOptions {
  card: Card;
  link: Link;
  us_bank_account: UsBankAccount;
}

export interface Card {
  installments: null;
  mandate_options: null;
  network: null;
  request_three_d_secure: string;
}

export interface Link {
  persistent_token: null;
}

export interface UsBankAccount {
  verification_method: string;
}

export interface LatestInvoicePaymentSettings {
  default_mandate: null;
  payment_method_options: null;
  payment_method_types: null;
}

export interface StatusTransitions {
  finalized_at: number;
  marked_uncollectible_at: null;
  paid_at: number;
  voided_at: null;
}

export interface SubscriptionsPaymentSettings {
  payment_method_options: null;
  payment_method_types: null;
  save_default_payment_method: string;
}

export interface TrialSettings {
  end_behavior: EndBehavior;
}

export interface EndBehavior {
  missing_payment_method: string;
}
