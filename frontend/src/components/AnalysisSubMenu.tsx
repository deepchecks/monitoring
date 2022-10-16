import { alpha, Box, ClickAwayListener, List, ListItem, styled, Typography } from '@mui/material';
import { getParams } from 'helpers/utils/getParams';
import useModels from 'hooks/useModels';
import { useScrollBar } from 'hooks/useScrollBar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { colors } from 'theme/colors';
import { SearchField } from './SearchField';

interface AnalysisSubMenuProps {
  open: boolean;
  onClose: () => void;
}

const StyledSearch = styled(SearchField)(({ theme }) => ({
  '& .MuiInputBase-input, & .MuiInputBase-input::placeholder': {
    color: theme.palette.text.disabled,
    opacity: 1
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main
  },
  '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: alpha(theme.palette.primary.main, 0.5)
  },
  '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main
  },
  '&.MuiFormControl-root.MuiFormControl-fullWidth svg': {
    fill: theme.palette.primary.dark
  }
}));

interface StyledLinkOptions {
  active: boolean;
}

const StyledLink = styled(Link, { shouldForwardProp: prop => prop !== 'active' })<StyledLinkOptions>(
  ({ theme, active }) => ({
    padding: '6px 20px',
    backgroundColor: active ? theme.palette.common.white : 'transparent',
    borderRadius: '1000px',
    textDecoration: 'none',
    width: '100%',
    color: active ? theme.palette.text.primary : theme.palette.common.white
  })
);

export function AnalysisSubMenu({ onClose, open }: AnalysisSubMenuProps) {
  const scrollRef = useRef<HTMLUListElement>(null);
  const { models } = useModels();
  const location = useLocation();
  const [searchModelName, setSearchModelName] = useState('');
  const [currentModels, setCurrentModels] = useState(models);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const style = useScrollBar(scrollRef);

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearTimeout(searchTimer.current);
    const { value } = e.target;
    setSearchModelName(value);
    if (!value) {
      setCurrentModels(models);
      return;
    }
    searchTimer.current = setTimeout(() => {
      setCurrentModels(models.filter(({ name }) => name.toLowerCase().includes(value.toLowerCase())));
    }, 200);
  };

  useEffect(() => {
    onClose();
  }, [location.pathname, location.search]);

  const modelId = useMemo(() => getParams().modelId, [location]);

  useEffect(() => {
    if (models) {
      setCurrentModels(models);
    }
  }, [models]);

  return (
    <ClickAwayListener onClickAway={onClose}>
      <Box
        sx={{
          width: '410px',
          height: '100vh',
          padding: '100px 20px 60px 20px',
          backgroundColor: colors.primary.violet[600],
          position: 'absolute',
          top: 0,
          right: '-410px',
          borderLeft: theme => `1px solid ${theme.palette.common.white}`,
          zIndex: -1,
          opacity: open ? 1 : 0,
          transform: open ? 'translateX(0)' : 'translateX(-410px)',
          transition: 'all 0.1s ease-in-out'
        }}
      >
        <StyledSearch size="small" fullWidth placeholder="Search..." onChange={onSearch} value={searchModelName} />
        <Box sx={{ mt: '30px', overflow: 'auto', height: '80%', ...style }} ref={scrollRef}>
          <List disablePadding>
            {currentModels.map(({ name, id }) => (
              <ListItem
                key={id}
                sx={{
                  margin: '16px 0'
                }}
              >
                <StyledLink active={+modelId === id} to={{ pathname: '/analysis', search: `modelId=${id}` }}>
                  <Typography variant="subtitle2">{name}</Typography>
                </StyledLink>
              </ListItem>
            ))}
          </List>
        </Box>
      </Box>
    </ClickAwayListener>
  );
}
