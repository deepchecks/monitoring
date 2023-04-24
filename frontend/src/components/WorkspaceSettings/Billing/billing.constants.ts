export const constants = {
  cardPlan: {
    title: (planName: string) => `${planName !== undefined ? planName : 'Plan'}`,
    availableModels: (productQuantity: number) => `You have ${productQuantity} available models`,
    currentBilling: (totalPrice: number) => `Current billing amount: $${totalPrice}/mo`,
    increaseModels: (modelPrice: number) => `You can increase number of models for $${modelPrice} per each model`,
    submitBtnLabel: 'Update Plan',
    capacity: 'Capacity',
    modelQuantity: (quantity: number) => `${quantity} Models`,
    decreaseDialogText: (price: number, decreasedBy: number) =>
      `Decreasing your number of models by ${decreasedBy} will reduce your monthly bill by $${price}.\n Do you confirm?`,
    upgradeDialogText: (price: number, increasedBy: number) =>
      `Adding ${-increasedBy} models will increase your monthly bill by  $${-price}.\n Do you confirm?`
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
    last4Text: (last4: string) => `**** **** **** ${last4 !== '' ? last4 : '****'}`
  }
};
