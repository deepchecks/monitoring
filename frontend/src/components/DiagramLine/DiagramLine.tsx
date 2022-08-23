import { alpha, Box, useTheme } from "@mui/material";
import { Chart, ChartArea, ChartData, registerables } from "chart.js";
import { memo, useRef } from "react";
import { Line } from "react-chartjs-2";
import { colors } from "../../helpers/theme/colors";

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
  threshold?: number;
}

const setThreshold = (threshold: number) => ({
  id: "setThreshold",
  beforeDatasetsDraw(chart: Chart<"line", number[], string>) {
    const {
      ctx,
      chartArea: { left, right },
      scales: { y },
    } = chart;

    if (!y) return;
    const yOffset = y.getPixelForValue(threshold);

    ctx.beginPath();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.moveTo(left, yOffset);
    ctx.lineTo(right, yOffset);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([6, 0]);
    ctx.save();

    const angle = Math.PI / 180;
    const text = "critical";
    ctx.translate(0, 0);
    ctx.font = "12px Roboto";
    ctx.fillStyle = "red";
    ctx.direction = "inherit";
    ctx.textAlign = "center";
    ctx.rotate(270 * angle);
    ctx.fillText(text, -yOffset, right + 10);
    ctx.restore();
  },
});

const columnSelection = {
  id: "columnSelection",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  beforeDatasetsDraw(chart: any) {
    if (!chart.tooltip) return;
    const {
      ctx,
      chartArea: { bottom, top },
      tooltip,
    } = chart;
    // eslint-disable-next-line no-underscore-dangle
    const { _active: active } = tooltip;

    if (active[0]) {
      ctx.beginPath();
      // eslint-disable-next-line prefer-destructuring
      ctx.strokeStyle = colors.primary.violet[400];
      ctx.lineWidth = 4;
      ctx.moveTo(active[0].element.x, top);
      ctx.lineTo(active[0].element.x, bottom);
      ctx.stroke();
      ctx.restore();
    }
  },
};

function DiagramLine({ data, threshold = 0 }: DiagramLineProps) {
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
              hoverBorderWidth: 4,
            },
            line: {
              tension: 0.4,
              fill: true,
            },
          },
          interaction: {
            mode: "index",
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
              callbacks: {
                labelColor: (context) => ({
                  backgroundColor: context.dataset?.borderColor as string,
                  borderColor: context.dataset?.borderColor as string,
                }),
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
        plugins={
          threshold
            ? [setThreshold(threshold), columnSelection]
            : [columnSelection]
        }
      />
    </Box>
  );
}

export default memo(DiagramLine);
