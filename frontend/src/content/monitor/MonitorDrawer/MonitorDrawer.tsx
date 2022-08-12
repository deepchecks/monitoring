import { Drawer, DrawerProps } from "@mui/material";
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
