import { Button, Stack, Typography } from "@mui/material";
import { CloseIcon } from "../../../../assets/icon/icon";
import DiagramLine from "../../../../components/DiagramLine/DiagramLine";
import { useTypedSelector } from "../../../../store/hooks";
import { monitorSelector } from "../../../../store/slices/monitor/monitorSlice";
import { StyledBoxWrapper, StyledGraphWrapper } from "./GraphView.style";

interface GraphViewProps {
  onClose: () => void | undefined;
}

export function GraphView({ onClose }: GraphViewProps) {
  const { graph } = useTypedSelector(monitorSelector);
  const closeDrawer = () => {
    onClose();
  };

  return (
    <StyledBoxWrapper>
      <Stack direction="row" justifyContent="end">
        <Button
          variant="text"
          size="large"
          startIcon={<CloseIcon />}
          onClick={closeDrawer}
        >
          <Typography variant="body2">Close</Typography>
        </Button>
      </Stack>
      <StyledGraphWrapper>
        <DiagramLine data={graph} />
      </StyledGraphWrapper>
    </StyledBoxWrapper>
  );
}
