import { Button, Stack, Typography } from "@mui/material";
import { ChartData } from "chart.js";
import { CloseIcon } from "../../../../assets/icon/icon";
import DiagramLine from "../../../../components/DiagramLine/DiagramLine";
import { useCheckSelector } from "../../../../hook/redux";
import { StyledBoxWrapper, StyledGraphWrapper } from "./GraphView.style";

interface GraphViewProps {
  onClose: () => void | undefined;
}

const data: ChartData<"line"> = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      label: "1",
      data: [33, 53, 85, 41, 44, 65],
      fill: true,
      tension: 0.2,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
      borderColor: "#01A9DB",
    },
    {
      label: "3",
      data: [33, 25, 35, 51, 54, 76],
      fill: true,
      borderColor: "#6B1CB0",
      tension: 0.2,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "4",
      data: [100, 90, 60, 50, 60, 72],
      fill: true,
      borderColor: "#0065FF",
      tension: 0.2,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
  ],
};

export function GraphView({ onClose }: GraphViewProps) {
  const { graph } = useCheckSelector();

  const closeDrawer = () => {
    onClose();
  };

  return (
    <StyledBoxWrapper>
      <Stack direction="row" justifyContent="end">
        <Button
          variant="text"
          size="large"
          startIcon={<CloseIcon />}
          onClick={closeDrawer}
        >
          <Typography variant="body2">Close</Typography>
        </Button>
      </Stack>
      <StyledGraphWrapper>
        {Object.keys(graph).length ? (
          <DiagramLine
            data={{
              datasets: graph.output[3] || [],
              labels: graph.time_labels || [],
            }}
          />
        ) : (
          <DiagramLine data={data} />
        )}
      </StyledGraphWrapper>
    </StyledBoxWrapper>
  );
}
