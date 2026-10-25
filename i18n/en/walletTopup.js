export default {
  title: "Top Up Balance",
  noMethodsAvailable: "No top-up methods are available right now.",
  paymentMethodLabel: "Payment method",
  amountLabelTemplate: "Amount ({{min}} - {{max}} LYD)",
  amountMinimumLabelTemplate: "Amount (minimum {{min}} LYD)",
  paidAmountLabel: "Amount paid",
  amountAfterFeeLabel: "Amount after deduction",
  feeLabelTemplate: "Fee: {{fee}}%",
  fixedAmountLabelTemplate: "You will be charged {{amount}} LYD.",
  amountPlaceholder: "0.00",
  submitting: "Processing...",
  continueButton: "Continue",
  errorLoadMethods: "Couldn't load payment methods.",
  validationSelectMethod: "Choose a payment method.",
  validationAmountInvalid: "Enter a valid amount.",
  amountOutOfRangeTemplate:
    "The amount must be between {{min}} and {{max}} LYD.",
  amountMinimumTemplate: "The amount must be at least {{min}} LYD.",
  errorAmountOutOfRange:
    "The amount is outside the allowed range for this method.",
  errorDailyLimitExceeded:
    "You have {{remaining}} LYD remaining from the daily limit for this method.",
  errorMethodUnavailable:
    "This payment method is no longer available. Choose another method.",
  errorGatewayError: "Couldn't create the payment. Check the entered details.",
  errorGeneric: "Couldn't start the top-up. Please try again.",
};
