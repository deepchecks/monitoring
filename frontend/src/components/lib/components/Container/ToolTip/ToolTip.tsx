import React, { ReactNode } from 'react';

import { Warning } from '@mui/icons-material';
import { Stack, Tooltip, useTheme } from '@mui/material';

import { StyledText } from '../../..';
import { Container } from '../Container';
import { StyledDescriptionsContainer } from './ToolTip.styles';

export interface ToolTipProps {
  text?: string;
  descriptions?: string | { text: string; info: string; icon: ReactNode }[];
  error?: boolean;
  link?: { label?: string; href?: string };
  range?: { min: number | undefined; max: number | undefined };
  children: React.ReactElement;
  arrow?: boolean;
  placement?: 'bottom' | 'top' | 'left' | 'right';
  row?: boolean;
}

export const ToolTip = ({
  text,
  descriptions,
  error = false,
  children,
  arrow = true,
  placement = 'top',
  link,
  range
}: ToolTipProps) => {
  const theme = useTheme();

  const linkColor = theme.palette.primary.main;
  const showLink = link?.label && link?.href;

  return (
    <Tooltip
      title={
        text ? (
          <Container padding="8px" gap="12px" sx={{ '.MuiTypography-root': { lineHeight: '18px' } }}>
            <Container padding="0" margin="0 auto">
              {error && <Warning fontSize="small" sx={{ margin: 'auto 0', width: '16px', height: '16px' }} />}
              <StyledText text={text} type="small" color={theme.palette.common.white} />
              {range && (
                <Stack direction="row">
                  <StyledText
                    text="Range:"
                    type="small"
                    color={theme.palette.common.white}
                    sx={{ fontWeight: 900, marginRight: '5px' }}
                  />
                  <StyledText
                    text={`min ${range.min ?? '-Inf'} - max ${range.max ?? 'Inf'}`}
                    type="small"
                    color={theme.palette.common.white}
                  />
                </Stack>
              )}
              {descriptions &&
                (Array.isArray(descriptions) ? (
                  <Stack direction="column">
                    {descriptions.map((el, index) => (
                      <StyledDescriptionsContainer direction="row" key={index}>
                        {el.icon}
                        <StyledText
                          text={el.text}
                          type="small"
                          color={theme.palette.common.white}
                          sx={{ margin: '0 4px' }}
                        />
                        <StyledText text={el.info} type="small" color={theme.palette.common.white} />
                      </StyledDescriptionsContainer>
                    ))}
                  </Stack>
                ) : (
                  <Stack direction="row">
                    <StyledText text={descriptions} type="small" color={theme.palette.common.white} />
                  </Stack>
                ))}
            </Container>
            {showLink && (
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                style={{ textDecoration: 'none', color: linkColor, fontSize: '12px', fontWeight: 900 }}
              >
                {link.label}
              </a>
            )}
          </Container>
        ) : (
          <></>
        )
      }
      arrow={arrow}
      placement={placement}
    >
      {children}
    </Tooltip>
  );
};
