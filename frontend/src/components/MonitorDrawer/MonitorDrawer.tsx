import React, { useEffect } from 'react';
import { Drawer, DrawerProps, Stack, styled } from '@mui/material';
// import { useTypedDispatch } from '../../../store/hooks';
// import { clearCheckState } from '../../../store/slices/check/checkSlice';
// import { clearColumns } from '../../../store/slices/model/modelSlice';
import { GraphView } from './GraphView';
import { CreateMonitor } from './MonitorForm/CreateMonitor';
import EditMonitor from './MonitorForm/EditMonitor';

export const StyledStackWrapper = styled(Stack)({
  height: '100%'
});

interface MonitorDrawerProps extends DrawerProps {
  monitorId?: number | string | null;
  onClose: () => void;
}

function MonitorDrawer({ monitorId = null, onClose, ...props }: MonitorDrawerProps) {
  // const dispatch = useTypedDispatch();
  console.log(monitorId);

  // useEffect(() => {
  //   dispatch(clearCheckState());
  //   dispatch(clearColumns());
  // }, [dispatch]);

  return (
    <Drawer {...props}>
      <StyledStackWrapper direction="row">
        {monitorId ? <EditMonitor onClose={onClose} monitorId={monitorId} /> : <CreateMonitor onClose={onClose} />}
        {/* <CreateMonitor onClose={onClose} /> */}
        <GraphView onClose={onClose} />
      </StyledStackWrapper>
    </Drawer>
  );
}

export default React.memo(MonitorDrawer);
