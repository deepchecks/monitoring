import { alpha, Box, List, MenuItem, Popover, Stack, styled, Tooltip, Typography } from '@mui/material';
import { ModelSchema } from 'api/generated';
import { ArrowDropDown, TableChart } from 'assets/icon/icon';
import React, { Dispatch, memo, SetStateAction, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SearchField } from './SearchField';

interface ModelSelectProps {
  model: ModelSchema;
  onOpen: (event: React.MouseEvent<HTMLDivElement>) => void;
  size: 'small' | 'medium';
}

const sizeMap = {
  medium: {
    arrow: {
      width: 32,
      height: 32
    },
    py: '10px',
    variant: 'h3'
  },
  small: {
    arrow: {
      width: 20,
      height: 20
    },
    py: '10px',
    variant: 'h6'
  }
} as const;

function ModelSelect({ model, onOpen, size }: ModelSelectProps) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{ py: sizeMap[size].py, width: 'max-content', cursor: 'pointer' }}
      onClick={onOpen}
    >
      {typeof model?.task_type === 'string' && model?.task_type?.toLowerCase().includes('vision') ? (
        <Tooltip title="Vision" arrow>
          <TableChart height={sizeMap[size].arrow.height} width={sizeMap[size].arrow.width} />
        </Tooltip>
      ) : (
        <Tooltip title="Tabular" arrow>
          <TableChart height={sizeMap[size].arrow.height} width={sizeMap[size].arrow.width} />
        </Tooltip>
      )}

      <Typography variant={sizeMap[size].variant} sx={{ mx: '11px', minWidth: 100 }}>
        {model.name}
      </Typography>
      <ArrowDropDown />
    </Stack>
  );
}

interface StaticAnalysisHeader {
  model: ModelSchema;
  onOpenModelsMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

function StaticAnalysisHeader({ model, onOpenModelsMenu }: StaticAnalysisHeader) {
  return (
    <Box sx={{ py: '11px', borderBottom: theme => `1px dotted ${theme.palette.text.disabled}` }}>
      <ModelSelect model={model} onOpen={onOpenModelsMenu} size="medium" />
    </Box>
  );
}

interface FixedAnalysisHeaderProps {
  model: ModelSchema;
  open: boolean;
  onOpenModelsMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
}

function FixedAnalysisHeader({ model, open, onOpenModelsMenu }: FixedAnalysisHeaderProps) {
  return (
    <Box
      sx={{
        background: theme => theme.palette.grey[100],
        position: 'fixed',
        top: 0,
        left: 0,
        transform: open ? 'translateY(0)' : 'translateY(-100%)',
        width: 1,
        padding: '1px 0 3px 0',
        transition: 'all 0.15s ease-in-out',
        pl: '272px',
        zIndex: 10
      }}
    >
      <Box sx={{ width: 1, m: '0 auto' }}>
        <ModelSelect model={model} onOpen={onOpenModelsMenu} size="small" />
      </Box>
    </Box>
  );
}

interface AnalysisHeaderProps {
  changeModel: Dispatch<SetStateAction<number>>;
  models: ModelSchema[];
  model: ModelSchema;
}

const StyledSearchField = styled(SearchField)(({ theme }) => ({
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

const StyledLink = styled(Link)({
  color: 'inherit',
  textDecoration: 'none',
  width: '100%',
  height: '100%',
  padding: '11.5px 12px'
});

function AnalysisHeaderComponent({ models, model }: AnalysisHeaderProps) {
  const [isScrolling, setIsScrolling] = useState<boolean>(false);
  const [searchModelName, setSearchModelName] = useState<string>('');
  const [filteredModels, setFilteredModels] = useState(models);
  const searchModelNameDelay = useRef<ReturnType<typeof setTimeout>>();
  const location = useLocation();

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

  const handleReset = () => {
    setSearchModelName('');
    setFilteredModels(models);
  };

  useEffect(() => {
    const onScroll = () => {
      const yPosition = window.pageYOffset;

      if (yPosition > 60) {
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
  }, [models]);

  useEffect(() => {
    handleCloseModelsMenu();
  }, [location]);

  return (
    <Box sx={{ position: 'relative', zIndex: 6 }}>
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
        <StyledSearchField
          fullWidth
          placeholder="Search..."
          onChange={onSearchModelNameChange}
          onReset={handleReset}
          value={searchModelName}
        />
        <List
          sx={{
            padding: 0,
            maxHeight: 300,
            overflow: 'auto'
          }}
        >
          {filteredModels.map(({ id, name }) => (
            <MenuItem key={id} sx={{ padding: 0 }}>
              <StyledLink to={{ pathname: '/analysis', search: `modelId=${id}` }}>
                <Typography variant="subtitle2">{name}</Typography>
              </StyledLink>
            </MenuItem>
          ))}
        </List>
      </Popover>
    </Box>
  );
}

export const AnalysisHeader = memo(AnalysisHeaderComponent);
