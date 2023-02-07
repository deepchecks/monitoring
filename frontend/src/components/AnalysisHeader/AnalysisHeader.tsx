import React, { Dispatch, memo, SetStateAction, useEffect, useRef, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { ModelManagmentSchema } from 'api/generated';

import { WindowTimeout } from 'helpers/types/index';

import { styled, alpha, Box, List, MenuItem, Popover, Typography } from '@mui/material';

import { SearchField } from '../SearchField';
import StaticAnalysisHeader from './components/StaticAnalysisHeader';
import FixedAnalysisHeader from './components/FixedAnalysisHeader';
import { ShareButton } from '../ShareButton';

interface AnalysisHeaderProps {
  changeModel: Dispatch<SetStateAction<number>>;
  models: ModelManagmentSchema[];
  model: ModelManagmentSchema;
}

function AnalysisHeaderComponent({ models, model }: AnalysisHeaderProps) {
  const location = useLocation();
  const searchModelNameDelay = useRef<WindowTimeout>();

  const [isScrolling, setIsScrolling] = useState(false);
  const [searchModelName, setSearchModelName] = useState('');
  const [filteredModels, setFilteredModels] = useState(models);

  const [anchorElModelsMenu, setAnchorElModelsMenu] = useState<null | HTMLElement>(null);

  const openModelsMenu = Boolean(anchorElModelsMenu);

  const handleCloseModelsMenu = () => {
    setAnchorElModelsMenu(null);
  };

  const handleOpenModelsMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    setAnchorElModelsMenu(event.currentTarget);
  };

  const onSearchModelNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchModelName(value);

    clearTimeout(searchModelNameDelay.current);

    searchModelNameDelay.current = setTimeout(() => {
      setFilteredModels([...models].filter(model => model.name.toLowerCase().includes(value.toLowerCase())));
    }, 300);
  };

  const handleReset = useCallback(() => {
    setSearchModelName('');
    setFilteredModels(models);
  }, [models]);

  useEffect(() => {
    const onScroll = () => {
      const yPosition = window.pageYOffset;

      if (yPosition > 88) {
        setIsScrolling(true);
      } else {
        setIsScrolling(false);
      }
    };

    window.addEventListener('scroll', onScroll);

    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    handleReset();
  }, [models, handleReset]);

  useEffect(() => {
    handleCloseModelsMenu();
  }, [location]);

  return (
    <StyledAnalysisHeader>
      <StaticAnalysisHeader onOpenModelsMenu={handleOpenModelsMenu} model={model} />
      <FixedAnalysisHeader open={isScrolling} onOpenModelsMenu={handleOpenModelsMenu} model={model} />
      <Popover
        anchorEl={anchorElModelsMenu}
        open={openModelsMenu}
        onClose={handleCloseModelsMenu}
        sx={{
          '& .MuiPaper-root': {
            width: 436
          }
        }}
      >
        <StyledAnalysisHeaderSearchField
          fullWidth
          placeholder="Search..."
          onChange={onSearchModelNameChange}
          onReset={handleReset}
          value={searchModelName}
        />
        <StyledAnalysisHeaderList>
          {filteredModels.map(({ id, name }) => (
            <MenuItem key={id} sx={{ padding: 0 }}>
              <StyledAnalysisHeaderLink to={{ pathname: '/analysis', search: `modelId=${id}` }}>
                <Typography variant="subtitle2">{name}</Typography>
              </StyledAnalysisHeaderLink>
            </MenuItem>
          ))}
        </StyledAnalysisHeaderList>
      </Popover>
      <ShareButton />
    </StyledAnalysisHeader>
  );
}

const StyledAnalysisHeader = styled(Box)(({ theme }) => ({
  position: 'relative',
  zIndex: 6,
  display: 'flex',
  alignItems: 'center',
  borderBottom: `1px dashed ${theme.palette.text.disabled}`
}));

const StyledAnalysisHeaderSearchField = styled(SearchField)(({ theme }) => ({
  minHeight: 40,
  padding: '10px 10px 4px 10px',
  '& .MuiInputBase-input': {
    padding: '11.5px 2px 11.5px 12px',
    fontSize: 12
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.grey[200]
  },
  '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: alpha(theme.palette.primary.main, 0.5)
  },
  '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: theme.palette.primary.main
  }
}));

const StyledAnalysisHeaderLink = styled(Link)({
  color: 'inherit',
  textDecoration: 'none',
  width: '100%',
  height: '100%',
  padding: '11.5px 12px'
});

const StyledAnalysisHeaderList = styled(List)({
  overflow: 'auto',
  maxHeight: '300px',
  padding: 0
});

export const AnalysisHeader = memo(AnalysisHeaderComponent);
