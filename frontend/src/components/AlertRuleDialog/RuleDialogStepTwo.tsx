import { Box, Button, MenuItem, Stack } from "@mui/material";
import { SelectCheck } from "components/SelectCheck";
import { AlertRuleStepBaseProps } from "./AlertRuleDialogContent";
import { MarkedSelect } from 'components/MarkedSelect';
import useModels from "hooks/useModels";
import React, { useCallback, useContext, useState } from "react";
import { SelectValues } from "helpers/types";
import { AlertRuleDialogContext } from "./AlertRuleDialogContext";
import { TooltipInputWrapper } from "components/TooltipInputWrapper";
import { ControlledMarkedSelect } from "components/MarkedSelect/ControlledMarkedSelect";

import { timeWindow, buildKwargs, buildFilters } from 'helpers/monitorFields.helpers';
import { SelectColumn } from "components/SelectColumn";

export const AlertRuleDialogStepTwo = ({handleNext, handleBack} : AlertRuleStepBaseProps) => {

    const { monitor, setMonitor, alertRule} = useContext(AlertRuleDialogContext);
    const { models: modelsList } = useModels();
    const [model, setModel] = useState<SelectValues>(monitor?.check.model_id || '');

    const [check, setCheck] = useState<SelectValues>(monitor?.check.id || '');
    const [checkInfoFirstLevel, setCheckInfoFirstLevel] = useState<SelectValues>('');
    const [checkInfoSecondLevel, setCheckInfoSecondLevel] = useState<SelectValues>('');
    const [isResConf, setIsResConf] = useState<boolean | undefined>();

    const [frequency, setFrequency] = useState<SelectValues>(monitor?.frequency || '');
    const [aggregationWindow, setAggregationWindow] = useState<SelectValues>(monitor?.aggregation_window || '');

    const [column, setColumn] = useState<string | undefined>(monitor?.data_filters?.filters?.[0]?.column || '');
    const [category, setCategory] = useState<SelectValues>('');
    const [numericValue, setNumericValue] = useState<number[] | undefined>();

    const clearAggregationWindow = useCallback(() => {
        setAggregationWindow('');
        setFrequency('');
      }, []);
      
    const finish = () => {
        if (model && check && frequency && aggregationWindow) {
            // Setting the context values
            monitor.check.model_id = +model;
            monitor.check.id = +check;
            monitor.frequency = +frequency;
            monitor.aggregation_window = +aggregationWindow
            monitor.additional_kwargs = buildKwargs(isResConf, checkInfoFirstLevel, checkInfoSecondLevel) || undefined
            monitor.data_filters = buildFilters(column, category, numericValue) || undefined
            setMonitor(monitor);

            handleNext();
        }
    }
    return (
        <Box component="form" sx={{display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center', mt: 5, mb: 5}}>
            <Box sx={{maxWidth: 400, width: '100%'}}>
                <Stack spacing={4}>
                    <MarkedSelect
                        label="Model"
                        value={model}
                        onChange={event => {
                            setModel(event.target.value as string);
                        }}
                        clearValue={() => {
                            setModel('');
                        }}
                        disabled={!!alertRule.id}
                    >
                        {modelsList.map(({ name, id }) => (
                            <MenuItem key={id} value={id}>
                            {name}
                            </MenuItem>
                        ))}
                    </MarkedSelect>
                    <SelectCheck
                        monitor={monitor}
                        model={model}
                        check={check}
                        setCheck={setCheck}
                        checkInfoFirstLevel={checkInfoFirstLevel}
                        setCheckInfoFirstLevel={setCheckInfoFirstLevel}
                        checkInfoSecondLevel={checkInfoSecondLevel}
                        setCheckInfoSecondLevel={setCheckInfoSecondLevel}
                        setIsResConf={setIsResConf}
                        disabled={!!alertRule.id || !model}
                    />
                    <TooltipInputWrapper title="The date range for calculating the monitor sample. e.g. sample every day and use the last 7 days to calculate the metric">
                        <ControlledMarkedSelect
                            label="Aggregation window"
                            values={timeWindow}
                            value={aggregationWindow}
                            setValue={setAggregationWindow}
                            clearValue={clearAggregationWindow}
                            fullWidth
                        />
                    </TooltipInputWrapper>
                    <TooltipInputWrapper title="The frequency of sampling the monitor data">
                        <MarkedSelect
                            label="Frequency"
                            value={frequency}
                            onChange={event => setFrequency(event.target.value as number)}
                            clearValue={() => {
                            setFrequency('');
                            setAggregationWindow('');
                            }}
                            fullWidth
                        >
                            {timeWindow.map(({ label, value }, index) => (
                            <MenuItem
                                key={value + index}
                                value={value}
                                disabled={typeof aggregationWindow === 'number' && value > aggregationWindow}
                            >
                                {label}
                            </MenuItem>
                            ))}
                        </MarkedSelect>
                    </TooltipInputWrapper>
                    <SelectColumn
                        monitor={monitor}
                        model={model}
                        column={column}
                        setColumn={setColumn}
                        category={category}
                        setCategory={setCategory}
                        numericValue={numericValue}
                        setNumericValue={setNumericValue}
                    />
                </Stack>

                <Box sx={{textAlign: 'end', mt: '60px'}}>
                    <Button onClick={handleBack} sx={{ mr: 1 }} variant="outlined">
                        {'Back'}
                    </Button>
                    <Button onClick={finish} sx={{ mr: 1 }} disabled={!model || !check || !frequency || !aggregationWindow}>
                        {'Next'}
                    </Button>
                </Box>
            </Box>
        </Box>
    )
};