export const constants = {
  billingHeader: 'Billing',
  billingSaveButton: 'Save Changes',
  billingPaidText: 'No new payment needed',
  billingDetails: {
    subHeader: 'Quantity:',
    modelPriceText: (modelPrice: number) => `Price per model: $${modelPrice}`,
    totalPriceText: (totalPrice: number) => `TotalPrice: $${totalPrice}`,
    inputPlaceholder: 'Desired quantity...',
    pricingLinkLabel: 'Pricing docs',
    pricingLinkHref: 'https://deepchecks.com/pricing/'
  },
  billingPayment: {
    payButton: 'Pay',
    subHeader: 'Payment Methods:',
    dialogButtonLabel: 'Submit',
    dialogSubHeader: 'Edit payment method',
    paymentMethodText: (paymentMethod: string) => `**** **** **** ${paymentMethod}`
  }
};
