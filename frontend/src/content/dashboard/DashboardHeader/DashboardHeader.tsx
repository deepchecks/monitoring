import { Stack } from "@mui/material";
import { HomeIcon, PlusIcon } from "../../../assets/icon/icon";
import { AlertCount } from "../../../components/AlertCount/AlertCount";
import {
  StyledBoxWrapper,
  StyledDivider,
  StyledFlexWrapper,
  StyledTypographyAdd,
  StyledTypographyHome,
} from "./DashboardHeader.style";

export function DashboardHeader() {
  return (
    <StyledBoxWrapper>
      <StyledFlexWrapper>
        <HomeIcon />
        <StyledTypographyHome>My Dashboard</StyledTypographyHome>
      </StyledFlexWrapper>
      <StyledFlexWrapper>
        <Stack spacing="20px" alignItems="center" direction="row">
          <AlertCount
            color="#EF4C36"
            count={10}
            criticality={3}
            message="Active Critical Alerts"
          />
          <AlertCount
            count={500}
            criticality={2}
            message="Active High Alerts"
          />
        </Stack>

        <StyledDivider />
        <StyledFlexWrapper>
          <PlusIcon />
          <StyledTypographyAdd>Add Monitor</StyledTypographyAdd>
        </StyledFlexWrapper>
      </StyledFlexWrapper>
    </StyledBoxWrapper>
  );
}
