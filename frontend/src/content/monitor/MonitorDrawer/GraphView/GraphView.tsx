import { Button, Stack, Typography } from "@mui/material";
import { memo } from "react";
import { CloseIcon } from "../../../../assets/icon/icon";
import DiagramLine from "../../../../components/DiagramLine/DiagramLine";
import { useTypedSelector } from "../../../../store/hooks";
import { checkGraphSelector } from "../../../../store/slices/check/checkSlice";
import { StyledBoxWrapper, StyledGraphWrapper } from "./GraphView.style";

interface GraphViewProps {
  onClose: () => void | undefined;
}

function GraphViewComponent({ onClose }: GraphViewProps) {
  const graph = useTypedSelector(checkGraphSelector);
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

export const GraphView = memo(GraphViewComponent);
