import { alpha, Box, useTheme } from "@mui/material";
import { Chart, ChartArea, ChartData, registerables } from "chart.js";
import { memo, useRef } from "react";
import { Line } from "react-chartjs-2";

Chart.register(...registerables);

function createGradient(
  ctx: CanvasRenderingContext2D,
  area: ChartArea,
  colorStart: string,
  colorEnd: string
) {
  const gradient = ctx.createLinearGradient(0, area.bottom, 0, area.top);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

export interface DiagramLineProps {
  data: ChartData<"line">;
}

function DiagramLine({ data }: DiagramLineProps) {
  const chartRef = useRef<Chart<"line", number[], string>>();
  const theme = useTheme();

  const getNewData = () => {
    const char = chartRef.current;

    if (!char) {
      return data;
    }

    return {
      ...data,
      datasets: data.datasets.map((el) => ({
        ...el,
        backgroundColor: createGradient(
          char.ctx,
          char.chartArea,
          alpha(el.borderColor as string, 0),
          alpha(el.borderColor as string, 0.1)
        ),
      })),
    };
  };

  return (
    <Box>
      <Line
        data={getNewData()}
        ref={chartRef}
        updateMode="active"
        options={{
          responsive: true,
          plugins: {
            legend: {
              display: true,
              position: "bottom",
              align: "end",
              labels: {
                usePointStyle: true,
                textAlign: "center",
                generateLabels: (chart) => {
                  const { data } = chart;
                  if (data && data.labels?.length && data.datasets.length) {
                    return data.datasets.map(
                      ({ label, borderColor }, index) => ({
                        datasetIndex: index,
                        text: label as string,
                        textColor: theme.palette.text.primary,
                        fillStyle: borderColor as string,
                        strokeStyle: borderColor as string,
                        pointStyle: "rectRounded",
                        textAlign: "center",
                        hidden: !chart.isDatasetVisible(index),
                      })
                    );
                  }

                  return [];
                },
                boxWidth: 6,
                boxHeight: 6,
                font: {
                  size: 12,
                },
              },
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
            },
          },
        }}
      />
    </Box>
  );
}

export default memo(DiagramLine);
