import { DrawerProps } from "@mui/material";
import DiagramLine from "../../../components/DiagramLine/DiagramLine";
import { useTypedSelector } from "../../../store/hooks";
import { alertSelector } from "../../../store/slices/alert/alertSlice";
import { monitorGraphSelector } from "../../../store/slices/monitor/monitorSlice";
import { StyledDiagramWrapper, StyledDrawer } from "./AlertDrawer.style";
import { Header } from "./Header/Header";

interface AlertDrawerProps extends DrawerProps {
  onClose: () => void;
}

export function AlertDrawer({ onClose, ...props }: AlertDrawerProps) {
  const graph = useTypedSelector(monitorGraphSelector);
  const { alertRule } = useTypedSelector(alertSelector);

  return (
    <StyledDrawer onClose={onClose} {...props}>
      <Header onClose={onClose} />
      <StyledDiagramWrapper>
        <DiagramLine data={graph} threshold={alertRule?.condition?.value} />
      </StyledDiagramWrapper>
    </StyledDrawer>
  );
}
