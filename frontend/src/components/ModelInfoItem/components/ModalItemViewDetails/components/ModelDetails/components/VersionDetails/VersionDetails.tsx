import React, { useEffect, useMemo, useState } from 'react';
import {
  ConnectedModelVersionSchema,
  IngestionErrorSchema,
  useRetrieveConnectedModelVersionIngestionErrorsApiV1ConnectedModelsModelIdVersionsVersionIdIngestionErrorsGet
} from 'api/generated';
import { Autocomplete, Button, Divider, Stack, styled, TextField, Typography } from '@mui/material';
import { CollapseArrowLeft } from 'assets/icon/icon';
import { Loader } from 'components/Loader';
import NoResults from 'components/NoResults';
import { VersionErrorsTable } from './components/VersionErrorsTable';
import { colors } from 'theme/colors';
import { NoDataToShow } from 'components/NoDataToShow';

interface VersionDetailsProps {
  version: ConnectedModelVersionSchema;
  modelId: number;
  onClose: () => void;
}

export const VersionDetails = ({ version, modelId, onClose }: VersionDetailsProps) => {
  const [searchInputValue, setSearchInputValue] = useState('');
  const [searchValue, setSearchValue] = useState<string | null>(null);
  const { data, isLoading } =
    useRetrieveConnectedModelVersionIngestionErrorsApiV1ConnectedModelsModelIdVersionsVersionIdIngestionErrorsGet(
      modelId,
      version.id
    );
  const [filteredData, setFilteredData] = useState<IngestionErrorSchema[] | undefined>(data);

  useEffect(() => {
    const filteredData = data?.filter(error => {
      let isContainInput = false;
      if (searchValue === null || searchValue !== searchInputValue) {
        for (const value of Object.values(error)) {
          if (`${value}`.includes(searchInputValue)) {
            isContainInput = true;
            break;
          }
        }
      }
      if (searchValue !== null && searchValue === searchInputValue) {
        const id = searchValue.split('id: ')[1].split(';')[0];
        if (id === `${error.id}`) isContainInput = true;
      }
      return isContainInput;
    });
    setFilteredData(filteredData);
  }, [searchInputValue, data]);

  const AutoCompleteOptionsArray = useMemo(
    () => (data ? data.map(el => `${el.error} (id: ${el.id}; sample id: ${el.sample_id})`) : []),
    [version.id, data?.length]
  );

  const handleReset = () => {
    setSearchInputValue('');
    setSearchValue(null);
  };

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : data ? (
        <Stack spacing="32px">
          <Stack direction="row">
            <Button onClick={onClose} startIcon={<CollapseArrowLeft />} variant="text">
              Back
            </Button>
            <Divider light={true} orientation="vertical" flexItem />
            <StyledTitle variant="h2">Errors for {version.name}</StyledTitle>
          </Stack>
          <Autocomplete
            freeSolo
            renderInput={params => <StyledAutocompleteTextField {...params} label="Search..." />}
            options={AutoCompleteOptionsArray}
            sx={{ width: '320px' }}
            value={searchValue}
            onChange={(event, newValue: string | null) => {
              setSearchValue(newValue);
            }}
            inputValue={searchInputValue}
            onInputChange={(event, newInputValue) => {
              setSearchInputValue(newInputValue);
            }}
          />
          {filteredData && filteredData.length > 0 && <VersionErrorsTable errors={filteredData} />}
          {filteredData && filteredData.length === 0 && data.length > 0 && (
            <NoResults marginTop="50px" handleReset={handleReset} />
          )}
          {filteredData && data.length === 0 && <NoDataToShow width={'100%'} height={250} title="No data to show" />}
        </Stack>
      ) : (
        <Typography>Something went wrong. Try again.</Typography>
      )}
    </>
  );
};

const StyledTitle = styled(Typography)({
  fontWeight: 700,
  fontSize: '24px',
  letterSpacing: '0.1px',
  color: colors.neutral.darkText,
  padding: '5px 18px',
  textAlign: 'center'
});

const StyledAutocompleteTextField = styled(TextField)(({ theme }) => ({
  '& .MuiAutocomplete-clearIndicator': {
    backgroundColor: theme.palette.text.disabled,

    '&:hover': {
      backgroundColor: theme.palette.text.disabled,
      opacity: 0.5
    }
  }
}));
