import { Typography } from "@mui/material";
import { memo, useState } from "react";
import { InfoIcon } from "../../../assets/icon/icon";
import {
  StyledBoxContainer,
  StyledBoxWrapper,
  StyledDivider,
  StyledImage,
  StyledImgBox,
  StyledMenu,
  StyledMenuItem,
  StyledTypography,
} from "./UserSection.style";

interface UserSectionProps {
  profileImg: string;
  width: number;
}

function UserSectionComponent({ profileImg, width }: UserSectionProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <StyledBoxContainer>
        <StyledBoxWrapper sx={{ mb: "40px" }} onClick={handleOpen}>
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
      <StyledMenu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <StyledMenuItem onClick={handleClose}>
          <Typography variant="body2">User settings</Typography>
        </StyledMenuItem>
        <StyledDivider />
        <StyledMenuItem onClick={handleClose}>
          <Typography variant="body2" color="text.disabled">
            Logout
          </Typography>
        </StyledMenuItem>
      </StyledMenu>
    </>
  );
}

export const UserSection = memo(UserSectionComponent);
