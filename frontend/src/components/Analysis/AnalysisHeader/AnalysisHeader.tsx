import React, { Dispatch, memo, SetStateAction, useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import { ModelManagmentSchema } from 'api/generated';

import { MenuItem, Popover, Typography, Stack } from '@mui/material';

import { FixedAnalysisHeader } from './components/FixedAnalysisHeader';
import { AnalysisHeaderOptions } from './components/AnalysisHeaderOptions';
import { ShareButton } from '../../base/Button/ShareButton';
import { ModelSelect } from './components/ModelSelect';

import { WindowTimeout } from 'helpers/types/index';
import { handleSetParams } from 'helpers/utils/getParams';

import {
  StyledAnalysisHeader,
  StyledAnalysisHeaderLink,
  StyledAnalysisHeaderList,
  StyledAnalysisHeaderSearchField
} from './AnalysisHeader.style';

interface AnalysisHeaderProps {
  changeModel: Dispatch<SetStateAction<number>>;
  models: ModelManagmentSchema[];
  model: ModelManagmentSchema;
  resetAllFilters: () => void;
}

function AnalysisHeaderComponent({ models, model, resetAllFilters }: AnalysisHeaderProps) {
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
      <ModelSelect model={model} onOpen={handleOpenModelsMenu} />
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
            <MenuItem key={id} sx={{ padding: 0 }} onClick={resetAllFilters}>
              <StyledAnalysisHeaderLink to={{ pathname: '/analysis', search: handleSetParams('modelId', id, false) }}>
                <Typography variant="subtitle2">{name}</Typography>
              </StyledAnalysisHeaderLink>
            </MenuItem>
          ))}
        </StyledAnalysisHeaderList>
      </Popover>
      <Stack direction="row" alignItems="center" marginLeft="auto">
        <AnalysisHeaderOptions model={model} />
        <ShareButton />
      </Stack>
    </StyledAnalysisHeader>
  );
}

export const AnalysisHeader = memo(AnalysisHeaderComponent);
