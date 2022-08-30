import {
  Box,
  MenuItem,
  SelectChangeEvent,
  Typography,
  useTheme,
} from "@mui/material";
import dayjs from "dayjs";
import { useState } from "react";
import { ChartSvg } from "../../../../assets/icon/chart";
import { CloseIcon, FastForward, Rewind } from "../../../../assets/icon/icon";
import { useTypedDispatch, useTypedSelector } from "../../../../store/hooks";
import {
  alertSelector,
  resolveAlert,
} from "../../../../store/slices/alert/alertSlice";
import { runSuite } from "../../../../store/slices/check/checkSlice";
import { monitorSelector } from "../../../../store/slices/monitor/monitorSlice";
import { ID } from "../../../../types";
import {
  StyledBottomSection,
  StyledButtonResolve,
  StyledButtonTest,
  StyledButtonWrapper,
  StyledCaption,
  StyledCriticality,
  StyledCriticalityTop,
  StyledDate,
  StyledDivider,
  StyledDividerDashed,
  StyledFlexWrapper,
  StyledIconButton,
  StyledMainWrapper,
  StyledPropertyWrapper,
  StyledSelect,
  StyledTopSection,
  StyledTypographyCount,
  StyledTypographyProperty,
  StyledTypographyTitle,
} from "./Header.style";

interface HeaderProps {
  onClose: () => void;
}

const titles = ["Model", "Check", "Feature", "Condition", "Frequency"];

const columnMap = {
  greater_than_equals: ">",
};

export function Header({ onClose }: HeaderProps) {
  const [alertIndex, setAlertIndex] = useState(0);
  const theme = useTheme();
  const dispatch = useTypedDispatch();
  const [modelVersionId, setModelVersionId] = useState("");

  const { alerts, alertRule } = useTypedSelector(alertSelector);
  const { monitor } = useTypedSelector(monitorSelector);
  const { name, alert_severity, condition, repeat_every } = alertRule;

  const alert = alerts[alertIndex];

  const info = [
    name,
    monitor.check.name,
    "-",
    `Value ${columnMap[condition.operator]} ${condition.value}`,
    repeat_every===86400 ? "Day" : repeat_every,
  ];

  const [criticalityMap] = useState({
    low: {
      color: theme.palette.error.contrastText,
    },
    mid: {
      color: theme.palette.error.light,
      first: true,
    },
    high: {
      color: theme.palette.error.dark,
      first: true,
      second: true,
    },
    critical: {
      color: theme.palette.error.main,
      first: true,
      second: true,
      third: true,
    },
  });

  const { color, ...criticalityRange } = criticalityMap[alert_severity];

  const prevAlert = () => {
    setAlertIndex((prevIndex) => prevIndex - 1);
  };

  const nextAlert = () => {
    setAlertIndex((prevIndex) => prevIndex + 1);
  };

  const onResolveAlert = () => {
    dispatch(resolveAlert(alert.id));
  };

  const runTest = (modelVersionId: ID) => {
    dispatch(
      runSuite({
        modelVersionId,
        data: {
          start_time: alert.start_time,
          end_time: alert.end_time,
          filter: monitor.data_filter,
        },
      })).then((response) => {
        const suiteOutput = response.payload as string;
        const winUrl = URL.createObjectURL(
          new Blob([suiteOutput], { type: "text/html" })
        );
      
        window.open(winUrl);
      });
  };

  const handleModelVersionIdChange = (event: SelectChangeEvent<unknown>) => {
    const value = event.target.value as string;
    runTest(value);
    setModelVersionId(value);
  };

  const handleRunSuite = () => {
    const [modelVersionId] = Object.keys(alert.failed_values);
    runTest(modelVersionId);
  };

  return (
    <StyledMainWrapper>
      <Box>
        <StyledCriticalityTop bgColor={color} />
        <StyledCriticality bgColor={color}>
          <ChartSvg {...criticalityRange} width={18} height={16} />
          <StyledCaption variant="caption">{alert_severity}</StyledCaption>
        </StyledCriticality>
      </Box>
      <Box width={1}>
        <StyledTopSection>
          <Box>
            <Typography variant="h4">{name}</Typography>
            <StyledDate variant="subtitle2">
              Alert date: {dayjs(alert?.created_at).format("MMM. DD, YYYY")}
            </StyledDate>
          </Box>
          <StyledFlexWrapper>
            <StyledFlexWrapper>
              <StyledIconButton disabled={!alertIndex} onClick={prevAlert}>
                <Rewind />
              </StyledIconButton>
              <StyledTypographyCount variant="body1">
                Alert #{alertIndex + 1}/{alerts.length}
              </StyledTypographyCount>
              <StyledIconButton
                disabled={alertIndex + 1 === alerts.length}
                onClick={nextAlert}
              >
                <FastForward />
              </StyledIconButton>
            </StyledFlexWrapper>
            <StyledDivider orientation="vertical" flexItem />
            <StyledIconButton onClick={onClose}>
              <CloseIcon />
            </StyledIconButton>
          </StyledFlexWrapper>
        </StyledTopSection>
        <StyledDividerDashed />
        <StyledBottomSection>
          <StyledFlexWrapper>
            {titles.map((title, index) => (
              <StyledPropertyWrapper key={title}>
                <StyledTypographyTitle>{title}</StyledTypographyTitle>
                <StyledTypographyProperty variant="subtitle2">
                  {info[index]}
                </StyledTypographyProperty>
              </StyledPropertyWrapper>
            ))}
          </StyledFlexWrapper>
          <StyledButtonWrapper>
            {alert?.failed_values &&
            Object.keys(alert.failed_values).length > 1 ? (
              <StyledSelect
                size="small"
                variant="outlined"
                displayEmpty
                onChange={handleModelVersionIdChange}
                value={modelVersionId}
                renderValue={(value) => (
                  <Typography>
                    {value ? `Version ${value}` : "RUN TEST SUITE"}
                  </Typography>
                )}
              >
                {Object.keys(alert.failed_values).map((key) => (
                  <MenuItem value={key}>Version {key}</MenuItem>
                ))}
              </StyledSelect>
            ) : (
              <StyledButtonTest variant="outlined" onClick={handleRunSuite}>
                Run Test Suite
              </StyledButtonTest>
            )}

            <StyledButtonResolve
              variant="contained"
              disabled={alert?.resolved}
              onClick={onResolveAlert}
            >
              Resolve Alert
            </StyledButtonResolve>
          </StyledButtonWrapper>
        </StyledBottomSection>
      </Box>
    </StyledMainWrapper>
  );
}
