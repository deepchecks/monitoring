import { Drawer, DrawerProps } from "@mui/material";
import { CreateMonitor } from "./CreateMonitor/CreateMonitor";
import { GraphView } from "./GraphView/GraphView";
import { StyledStackWrapper } from "./MonitorDrawer.style";

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
        {monitorId ? null : (
          // <EditMonitor onClose={closeDrawer} monitorId={monitorId}/>
          <CreateMonitor onClose={onClose} />
        )}
        <GraphView onClose={onClose} />
      </StyledStackWrapper>
    </Drawer>
  );
}
