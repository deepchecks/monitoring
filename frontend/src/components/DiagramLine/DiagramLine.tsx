import { alpha, Box, useTheme } from "@mui/material";
import {
  Chart,
  ChartArea,
  ChartData,
  ChartEvent,
  registerables,
} from "chart.js";
import "chartjs-adapter-dayjs-3";
import zoomPlugin from "chartjs-plugin-zoom";
import { memo, useRef } from "react";
import { Line } from "react-chartjs-2";
import { colors } from "../../helpers/theme/colors";
import { GraphData } from "../../types";
import { addSpace, drawCircle, setThreshold } from "./helpers";

Chart.register(...registerables, zoomPlugin);

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
  data: ChartData<"line", GraphData>;
  threshold?: number;
}

function DiagramLine({ data, threshold = 0 }: DiagramLineProps) {
  const chartRef = useRef<Chart<"line", number[], string>>();
  const range = { min: 0, max: 0 };
  const theme = useTheme();
  const getNewData = () => {
    const char = chartRef.current;

    if (!char) {
      return data;
    }

    return {
      ...data,
      datasets: data.datasets.map((el) => {
        el.data.forEach((item) => {
          if (typeof item === "number") {
            if (item < range.min) {
              range.min = item;
            }

            if (item > range.max) {
              range.max = item;
            }
            return;
          }
          if (item && typeof item === "object") {
            if (item.y < range.min) {
              range.min = item.y;
            }
            if (item.y > range.max) {
              range.max = item.y;
            }
          }
        });
        return {
          ...el,
          backgroundColor: createGradient(
            char.ctx,
            char.chartArea,
            alpha(el.borderColor as string, 0),
            alpha(el.borderColor as string, 0.1)
          ),
        };
      }),
    };
  };

  return (
    <Box>
      <Line
        data={getNewData()}
        ref={chartRef}
        options={{
          responsive: true,
          layout: {
            padding: {
              right: threshold ? 15 : 0,
            },
          },
          elements: {
            point: {
              radius: 0,
              hoverRadius: 6,
              hitRadius: 10,
              hoverBorderWidth: 3,
            },
            line: {
              tension: 0.4,
              fill: true,
            },
          },
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
            tooltip: {
              backgroundColor: colors.neutral.blue,
              padding: {
                bottom: 4,
                left: 16,
                right: 16,
                top: 4,
              },
              boxPadding: 5,
              callbacks: {
                labelColor: (context) => ({
                  backgroundColor: context.dataset?.borderColor as string,
                  borderColor: context.dataset?.borderColor as string,
                }),
                title: (context) => context[0].formattedValue,
                label: (context) => `${context.label} | Model Version 1.2`,
              },
            },
            zoom: {
              limits: {
                y: {
                  min: range.min - addSpace(range.min),
                  max: range.max + addSpace(range.max),
                  minRange: (range.max - range.min) / 2,
                },
              },
              pan: {
                enabled: true,
                mode: "xy",
              },
              zoom: {
                wheel: {
                  enabled: false,
                },
                pinch: {
                  enabled: false,
                },
                mode: "xy",
              },
            },
          },
          scales: {
            x: {
              grid: {
                display: false,
              },
              max: 15,
            },
            y: {
              min: range.min - addSpace(range.min),
              max: range.max + addSpace(range.max),
            },
          },
          onClick(event: ChartEvent & { chart: any }) {
            const { chart } = event;
            chart.options.plugins.zoom.zoom.wheel.enabled =
              !chart.options.plugins.zoom.zoom.wheel.enabled;
            chart.options.plugins.zoom.zoom.pinch.enabled =
              !chart.options.plugins.zoom.zoom.pinch.enabled;
            chart.update();
          },
        }}
        plugins={
          threshold ? [setThreshold(threshold), drawCircle] : [drawCircle]
        }
      />
    </Box>
  );
}

export default memo(DiagramLine);
