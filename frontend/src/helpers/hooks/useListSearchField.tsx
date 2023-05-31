import React, { useState } from 'react';

export function useListSearchField<T>(
  initialList: T[],
  setList: React.Dispatch<React.SetStateAction<T[]>>,
  searchBy: keyof T
) {
  const [searchFieldValue, setSearchFieldValue] = useState('');

  const handleSearchFieldChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setSearchFieldValue(value);
    setList(
      initialList.filter(model =>
        (model[searchBy] as unknown as string)?.toLowerCase().includes(value.trim().toLowerCase())
      )
    );
  };

  const resetSearchField = () => {
    setSearchFieldValue('');
    setList(initialList);
  };

  return { searchFieldValue, handleSearchFieldChange, resetSearchField };
}
