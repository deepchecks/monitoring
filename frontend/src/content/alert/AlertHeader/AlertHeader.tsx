import { Stack } from "@mui/material";
import { AlertCount } from "../../../components/AlertCount/AlertCount";
import { Breadcrumbs } from "../../../components/Breadcrumbs/Breadcrumbs";
import { useTypedSelector } from "../../../store/hooks";
import { alertSelector } from "../../../store/slices/alert/alertSlice";
import { StyledBoxWrapper, StyledFlexWrapper } from "./AlertHeader.style";

const currentPath = "Alerts";

export function AlertHeader() {
  const { count } = useTypedSelector(alertSelector);

  return (
    <StyledBoxWrapper>
      <Breadcrumbs currentPath={currentPath} />
      <StyledFlexWrapper>
        <Stack spacing="20px" alignItems="center" direction="row">
          <AlertCount count={count?.critical} criticality="critical" />
          <AlertCount count={count?.high} criticality="high" />
        </Stack>
      </StyledFlexWrapper>
    </StyledBoxWrapper>
  );
}
