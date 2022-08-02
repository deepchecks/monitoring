import { Stack } from "@mui/material";
import { useState } from "react";
import { HomeIcon, PlusIcon } from "../../../assets/icon/icon";
import { AlertCount } from "../../../components/AlertCount/AlertCount";
import { MonitorDrawer } from "../../monitor/MonitorDrawer/MonitorDrawer";
import {
  StyledBoxWrapper,
  StyledButton,
  StyledDivider,
  StyledFlexWrapper,
  StyledTypographyAdd,
  StyledTypographyHome,
} from "./DashboardHeader.style";

export function DashboardHeader() {
  const [openMonitorDrawer, setOpenMonitorDrawer] = useState<boolean>(false);

  const hanleOpenMonitorDrawer = () => {
    setOpenMonitorDrawer(true);
  };

  const hanleCloseMonitorDrawer = () => {
    setOpenMonitorDrawer(false);
  };

  return (
    <>
      <StyledBoxWrapper>
        <StyledFlexWrapper>
          <HomeIcon />
          <StyledTypographyHome>My Dashboard</StyledTypographyHome>
        </StyledFlexWrapper>
        <StyledFlexWrapper>
          <Stack spacing="20px" alignItems="center" direction="row">
            <AlertCount
              count={10}
              criticality="critical"
              message="Active Critical Alerts"
            />
            <AlertCount
              count={500}
              criticality="high"
              message="Active High Alerts"
            />
          </Stack>
          <StyledDivider />
          <StyledButton
            variant="text"
            onClick={hanleOpenMonitorDrawer}
            startIcon={<PlusIcon />}
          >
            <StyledTypographyAdd>Add Monitor</StyledTypographyAdd>
          </StyledButton>
        </StyledFlexWrapper>
      </StyledBoxWrapper>
      <MonitorDrawer
        anchor="right"
        open={openMonitorDrawer}
        onClose={hanleCloseMonitorDrawer}
      />
    </>
  );
}
