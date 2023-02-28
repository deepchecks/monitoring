import styled from 'styled-components';
import { Dialog as MaterialDialog } from '@mui/material';

interface DialogProps {
  backgroundColor?: string;
  width?: string;
  height?: string;
  borderRadius?: string;
  padding?: string;
  disableModal?: boolean;
  gap?: string;
}

const StyledDialog = styled(MaterialDialog)<DialogProps>`
  && {
    background-color: ${p => p.backgroundColor || 'rgba(0, 0, 0, 0.5)'};
    text-align: center;
    margin: auto;

    .MuiDialog-paper {
      width: ${p => p.width ?? '700px'};
      height: ${p => p.height};
      padding: ${p => p.padding ?? '24px'};
      gap: ${p => p.gap};
      border-radius: 24px;
      overflow-y: scroll;
      -ms-overflow-style: none;
      scrollbar-width: none;

      ::-webkit-scrollbar {
        display: none;
      }
    }

    .MuiBackdrop-root {
      border-radius: 8px;
      background-color: transparent;
    }
  }
`;

const ResponsiveStyledDialog = styled(StyledDialog)<DialogProps>`
  && {
    .MuiDialog-paper {
      width: 100%;
      height: 100%;
      padding: 16px;
      pointer-events: ${p => (p.disableModal ? 'none' : 'auto')};
    }
  }
`;

export { StyledDialog, ResponsiveStyledDialog };
