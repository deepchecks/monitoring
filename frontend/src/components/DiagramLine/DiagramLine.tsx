import { Box } from "@mui/material";
import { Chart, ChartArea, ChartData, registerables } from "chart.js";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import { gradientColors } from "../../helpers/lineDataChangeFunction";

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
// const data = {
//   labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
//   datasets: [
//     {
//       data: [33, 53, 85, 41, 44, 65],
//       fill: true,
//       tension:0.2,
//       pointBorderWidth:0,
//       pointHoverBorderWidth:0,
//       pointHoverRadius:0,
//     },
//     {
//       data: [33, 25, 35, 51, 54, 76],
//       fill: true,
//       borderColor: "#742774",
//       tension:0.2,
//       pointBorderWidth:0,
//       pointHoverBorderWidth:0,
//       pointHoverRadius:0,
//     },
//     {
//       label: "Third dataset",
//       data: [100, 90, 60, 50, 60, 72],
//       fill: true,
//       borderColor: "#742774",
//       tension:0.2,
//       pointBorderWidth:0,
//       pointHoverBorderWidth:0,
//       pointHoverRadius:0,
//     }
//   ]
// };

export interface DiagramLineProps {
  data: ChartData<"line">;
}

export default function DiagramLine({ data }: DiagramLineProps) {
  const chartRef = useRef<Chart<"line", number[], string>>();
  const [chartData, setChartData] = useState(data);

  useEffect(() => {
    const char = chartRef.current;
    if (!char) {
      return;
    }
    setChartData({
      ...chartData,
      datasets: chartData.datasets.map((el, i) => ({
        ...el,
        backgroundColor: createGradient(
          char.ctx,
          char.chartArea,
          gradientColors[i][0],
          gradientColors[i][1]
        ),
      })),
    });
  }, [chartRef, data]);

  return (
    <Box>
      <Line
        data={chartData}
        ref={chartRef}
        options={{
          responsive: true,
          plugins: {
            legend: {
              display: false,
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
