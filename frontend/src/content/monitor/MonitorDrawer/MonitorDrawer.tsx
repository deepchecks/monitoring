import { Drawer, DrawerProps } from "@mui/material";
import { useEffect } from "react";
import { useTypedDispatch } from "../../../store/hooks";
import { clearCheckState } from "../../../store/slices/check/checkSlice";
import { clearColumns } from "../../../store/slices/model/modelSlice";
import { GraphView } from "./GraphView/GraphView";
import { StyledStackWrapper } from "./MonitorDrawer.style";
import { CreateMonitor } from "./MonitorForm/CreateMonitor";
import { EditMonitor } from "./MonitorForm/EditMonitor";

interface MonitorDrawerProps extends DrawerProps {
  monitorId?: number | string | null;
  onClose: () => void;
}

export function MonitorDrawer({
  monitorId = null,
  onClose,
  ...props
}: MonitorDrawerProps) {
  const dispatch = useTypedDispatch();

  useEffect(() => {
    dispatch(clearCheckState());
    dispatch(clearColumns());
  }, [dispatch]);

  return (
    <Drawer {...props}>
      <StyledStackWrapper direction="row">
        {monitorId ? (
          <EditMonitor onClose={onClose} monitorId={monitorId} />
        ) : (
          <CreateMonitor onClose={onClose} />
        )}
        <GraphView onClose={onClose} />
      </StyledStackWrapper>
    </Drawer>
  );
}
