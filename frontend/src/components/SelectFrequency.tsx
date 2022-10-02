import React, { useEffect, useMemo, useState } from 'react';
import { SelectPrimary, SelectPrimaryProps, SelectPrimaryItem } from './SelectPrimary/SelectPrimary';
import { Box, Link } from '@mui/material';
import { Subcategory } from './MonitorDrawer/Subcategory';
import { SelectChangeEvent } from '@mui/material/Select/SelectInput';


interface SelectFrequencyProps {
  timeWindows?: {label: string, value: number}[];
  frequency: number;
  aggregation_window: number;
  setFieldValue: (fieldName: string, value: any, shouldValidate?: boolean | undefined) => any;
}

const TIME_WINDOWS = [
    { label: '1 hour', value: 60 * 60 },
    { label: '1 day', value: 60 * 60 * 24 },
    { label: '1 week', value: 60 * 60 * 24 * 7 },
    { label: '1 month', value: 60 * 60 * 24 * 31 },
    { label: '3 months', value: 60 * 60 * 24 * 31 * 3 }
  ];


export const SelectFrequency = ({timeWindows=TIME_WINDOWS, setFieldValue, ...props} : SelectFrequencyProps) => {
    const [advanced, setAdvanced] = useState<boolean>(false);
    const [aggWindow, setAggWindow] = useState<number>(props.aggregation_window);
    const [frequency, setFrequency] = useState<number>(props.frequency);

    const handleFrequencyChange = (event: SelectChangeEvent<number | unknown>) => {
        setFieldValue('frequency', event.target.value as number);
        setFrequency(event.target.value as number);
        if (!advanced) {
            setAggWindow(event.target.value as number);
        }
    };
    
    const handleAggWindowChange = (event: SelectChangeEvent<number | unknown>) => {
        setFieldValue('aggregation_window', event.target.value as number);
        setAggWindow(event.target.value as number);
    };

    return (
        <Box sx={{mb: '40px'}} >
            <SelectPrimary label="Frequency" onChange={handleFrequencyChange} value={frequency} sx={{mb: 0}}>
                {timeWindows.map(({ label, value }) => (
                <SelectPrimaryItem value={value} key={label}>
                    {label}
                </SelectPrimaryItem>
                ))}
            </SelectPrimary>
            {!advanced ? <Link underline="hover" sx={{display: 'flex' }} onClick={() => {setAdvanced(true)}}>Advanced</Link> : '' }
            {!advanced ? '' : 
                <Subcategory>
                    <SelectPrimary label="Aggregation Window" onChange={handleAggWindowChange} value={aggWindow}>
                        {timeWindows.map(({ label, value }) => (
                        <SelectPrimaryItem value={value} key={label}>
                            {label}
                        </SelectPrimaryItem>
                        ))}
                    </SelectPrimary>
                </Subcategory>
            }
        </Box>
    );
};