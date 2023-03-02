export const constants = {
  cardPlan: {
    title: (planName: string) => `${planName !== undefined ? planName : 'Plan'}`,
    availableModels: (productQuantity: number) => `You have ${productQuantity} available models`,
    minusBtnLabel: '-',
    plusBtnLabel: '+',
    currentBilling: (totalPrice: number) => `Current billing amount: $${totalPrice}/mo`,
    increaseModels: (modelPrice: number) => `You can increase number of models for $${modelPrice} per each model`,
    submitBtnLabel: 'Update Plan',
    capacity: 'Capacity',
    modelQuantity: (quantity: number) => `${quantity} Models`,
    upgradeDialogText: (price: number, increasedBy: number) =>
      `You have changed the number of billed models to ${increasedBy}, which will change your monthly payment to $${price} per month, do you confirm this action?`
  },
  firstBilling: {
    submitButtonLabel: 'Submit',
    errorMassageContent: 'Something went wrong, please contact us.'
  },
  billingHistory: {
    title: 'Billing history',
    description: 'Keep all your payments history in one place'
  },
  paymentMethod: {
    title: 'Payment method',
    description: 'Change how you can pay for your plan',
    buttonLabel: 'Edit',
    imageAlt: 'Credit card',
    last4Text: (last4: number) => `**** **** **** ${last4 !== null ? last4 : '****'}`
  }
};
