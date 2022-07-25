import { Typography } from "@mui/material";
import { ChartData } from "chart.js";
import { SearchField } from "../../components/SearchField/SearchField";
import { DashboardHeader } from "../../content/dashboard/DashboardHeader/DashboardHeader";
import { GraphicsSection } from "../../content/dashboard/GraphicsSection/GraphicsSection";
import {
  StyledDashboardContainer,
  StyledFlexContainer,
  StyledFlexContent,
} from "./DashboardPage.style";

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
const data9: ChartData<"line"> = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      label: "1",
      data: [0, 3, 9, 42, 11, 65],
      fill: true,
      tension: 0.25,
      pointBorderWidth: 0,
      borderColor: "#742774",
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "2",
      data: [3, 0, 17, 20, 64, 85],
      fill: true,
      borderColor: "#01A9DB",
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "3",
      data: [100, 90, 60, 50, 60, 72],
      fill: true,
      borderColor: "#742774",
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "4",
      data: [33, 53, 85, 41, 44, 65],
      fill: true,
      tension: 0.25,
      borderColor: "#2750AE",
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "5",
      data: [33, 25, 35, 51, 54, 76],
      fill: true,
      borderColor: "#1283DA",
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "Third dataset",
      data: [0, 15, 60, 21, 60, 2],
      fill: true,
      borderColor: "#2D7FF9",
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "6",
      data: [11, 22, 66, 49, 44, 38],
      fill: true,
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
      borderColor: "#9CC7FF",
    },
    {
      label: "7",
      data: [55, 63, 63, 83, 2, 76],
      fill: true,
      borderColor: "#CFDFFF",
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "8",
      data: [3, 40, 80, 0, 20, 30],
      fill: true,
      borderColor: "#6B1CB0",
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "9",
      data: [3, 5, 12, 80, 11, 54],
      fill: true,
      borderColor: "#7C39ED",
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "10",
      data: [3, 45, 89, 5, 28, 40],
      fill: true,
      borderColor: "red",
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
  ],
};
const data6: ChartData<"line"> = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      label: "1",
      data: [33, 53, 85, 41, 44, 65],
      fill: true,
      tension: 0.25,
      pointBorderWidth: 0,
      borderColor: "#742774",
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "2",
      data: [33, 25, 35, 51, 54, 76],
      fill: true,
      borderColor: "#01A9DB",
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "3",
      data: [100, 90, 60, 50, 60, 72],
      fill: true,
      borderColor: "#742774",
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "4",
      data: [33, 53, 85, 41, 44, 65],
      fill: true,
      tension: 0.25,
      borderColor: "#2750AE",
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "5",
      data: [33, 25, 35, 51, 54, 76],
      fill: true,
      borderColor: "#1283DA",
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
    {
      label: "Third dataset",
      data: [100, 90, 60, 50, 60, 72],
      fill: true,
      borderColor: "#2D7FF9",
      tension: 0.25,
      pointBorderWidth: 0,
      pointHoverBorderWidth: 0,
      pointHoverRadius: 0,
    },
  ],
};

const title = {
  color: "#3A474E",
  fontWeight: 500,
  fontSize: 18,
  lineHeight: "160%",
  textAlign: "left",
  marginTop: "16px",
  marginBottom: "11px",
};

export default function DashboardPage() {
  return (
    <StyledDashboardContainer>
      <DashboardHeader />
      <StyledFlexContainer>
        <StyledFlexContent
          className="first"
          sx={{
            borderLeft: "8px solid rgba(239, 76, 54, 0.5)",
          }}
        >
          <Typography sx={{ ...title, mt: 2, ml: 2 }}>Models List</Typography>
          <SearchField />
        </StyledFlexContent>
        <GraphicsSection
          className="second"
          data={data}
          title=" Data Ingest Status"
        />
        <GraphicsSection
          className="third"
          data={data}
          title=" Data Ingest Status"
        />
        <GraphicsSection
          className="fourth"
          data={data6}
          title=" Data Ingest Status"
        />
        <GraphicsSection
          className="fifth"
          data={data6}
          title=" Data Ingest Status"
        />
        <GraphicsSection
          className="sixs"
          data={data6}
          title=" Data Ingest Status"
        />
        <GraphicsSection
          className="sevn"
          data={data9}
          title=" Data Ingest Status"
        />
      </StyledFlexContainer>
    </StyledDashboardContainer>
  );
}
