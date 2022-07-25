import { memo } from "react";
import { InfoIcon } from "../../../assets/icon/icon";
import {
  StyledBoxContainer,
  StyledBoxWrapper,
  StyledImage,
  StyledImgBox,
  StyledTypography,
} from "./UserSection.style";

interface UserSectionProps {
  profileImg: string;
  width: number;
}

function UserSectionComponent({ profileImg, width }: UserSectionProps) {
  return (
    <StyledBoxContainer>
      <StyledBoxWrapper sx={{ pb: "40px" }}>
        <StyledImgBox>
          <StyledImage src={profileImg} alt="profile" />
        </StyledImgBox>
        {width > 1381 && <StyledTypography>Hi, person</StyledTypography>}
      </StyledBoxWrapper>
      <StyledBoxWrapper>
        <InfoIcon />
        {width > 1381 && <StyledTypography>Need Help?</StyledTypography>}
      </StyledBoxWrapper>
    </StyledBoxContainer>
  );
}

export const UserSection = memo(UserSectionComponent);
