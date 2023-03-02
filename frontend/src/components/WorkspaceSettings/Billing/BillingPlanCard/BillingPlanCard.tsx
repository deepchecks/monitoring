import React, { useState } from 'react';

import { Col16Gap, Row16Gap, RowAutoGap } from 'components/base/Container/Container.styles';
import { StyledH3 } from 'components/base/Text/Header.styles';
import {
  BillingCardAmountContainer,
  BillingCardButton,
  BillingCardContainer,
  BillingPlanCardQuantityButton,
  BillingSeparator,
  BillingText
} from '../Billing.styles';

import { constants } from '../billing.constants';

const {
  title,
  availableModels,
  minusBtnLabel,
  plusBtnLabel,
  currentBilling,
  increaseModels,
  submitBtnLabel,
  capacity,
  modelQuantity
} = constants.cardPlan;

interface BillingPlanCardProps {
  productQuantity: number;
  tierName?: string;
  handleUpgradeClick: (quantity: number) => void;
}

const BillingPlanCard = (props: BillingPlanCardProps) => {
  const { productQuantity, handleUpgradeClick, tierName } = props;
  const [quantity, setQuantity] = useState(productQuantity);

  const modelPrice = 89;
  const disableUpdate = quantity === productQuantity || quantity === 0;
  const totalPrice = productQuantity * modelPrice - modelPrice > 0 ? productQuantity * modelPrice - modelPrice : 0;
  const modifiedTotalPrice =
    quantity * modelPrice - modelPrice > 0 && quantity !== productQuantity && `$${quantity * modelPrice - modelPrice}`;

  const handlePlusModel = () => setQuantity(quantity + 1);
  const handleMinusModel = () => quantity > 0 && setQuantity(quantity - 1);
  const handleClick = () => handleUpgradeClick(quantity);

  return (
    <BillingCardContainer border>
      <RowAutoGap>
        <Col16Gap>
          <StyledH3>{title(tierName as string)}</StyledH3>
          <BillingText color="gray">{availableModels(productQuantity)}</BillingText>
        </Col16Gap>
        <Row16Gap width={'235px'} height={'60px'}>
          <BillingPlanCardQuantityButton onClick={handleMinusModel} disabled={quantity === 0}>
            {minusBtnLabel}
          </BillingPlanCardQuantityButton>
          <BillingCardAmountContainer>
            <BillingText weight="600">{modelQuantity(quantity)}</BillingText>
            <BillingText color="gray" align>
              {capacity}
            </BillingText>
            <BillingText weight="600" align>
              {modifiedTotalPrice}
            </BillingText>
          </BillingCardAmountContainer>
          <BillingPlanCardQuantityButton onClick={handlePlusModel}>{plusBtnLabel}</BillingPlanCardQuantityButton>
        </Row16Gap>
      </RowAutoGap>
      <BillingSeparator />
      <RowAutoGap>
        <span>
          <BillingText weight="600">{currentBilling(totalPrice)}</BillingText>
          <BillingText weight="600">{increaseModels(modelPrice)}</BillingText>
        </span>
        <BillingCardButton onClick={handleClick} disabled={disableUpdate}>
          {submitBtnLabel}
        </BillingCardButton>
      </RowAutoGap>
    </BillingCardContainer>
  );
};

export default BillingPlanCard;
