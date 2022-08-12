import { Stack } from "@mui/material";
import { PlusIcon } from "../../../assets/icon/icon";
import { AlertCount } from "../../../components/AlertCount/AlertCount";
import { Breadcrumbs } from "../../../components/Breadcrumbs/Breadcrumbs";
import { useTypedSelector } from "../../../store/hooks";
import { alertSelector } from "../../../store/slices/alert/alertSlice";
import { ID } from "../../../types";
import {
  StyledBoxWrapper,
  StyledButton,
  StyledDivider,
  StyledFlexWrapper,
  StyledTypographyAdd,
} from "./DashboardHeader.style";

interface DashboardHeaderProps {
  onOpen: (monitorId: ID) => void;
}

export function DashboardHeader({ onOpen }: DashboardHeaderProps) {
  const { count } = useTypedSelector(alertSelector);

  const handleOpen = () => {
    onOpen("");
  };

  return (
    <StyledBoxWrapper>
      <Breadcrumbs />
      <StyledFlexWrapper>
        <Stack spacing="20px" alignItems="center" direction="row">
          <AlertCount
            count={count?.critical}
            criticality="critical"
            message="Active Critical Alerts"
          />
          <AlertCount
            count={count?.high}
            criticality="high"
            message="Active High Alerts"
          />
        </Stack>
        <StyledDivider />
        <StyledButton
          variant="text"
          onClick={handleOpen}
          startIcon={<PlusIcon />}
        >
          <StyledTypographyAdd>Add Monitor</StyledTypographyAdd>
        </StyledButton>
      </StyledFlexWrapper>
    </StyledBoxWrapper>
  );
}
