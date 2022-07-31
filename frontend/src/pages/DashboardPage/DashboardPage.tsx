import { Typography } from "@mui/material";
import { ChartData } from "chart.js";
import { SearchField } from "../../components/SearchField/SearchField";
import { DashboardHeader } from "../../content/dashboard/DashboardHeader/DashboardHeader";
import { GraphicsSection } from "../../content/dashboard/GraphicsSection/GraphicsSection";
import { lineDataChangeFunction } from "../../helpers/lineDataChangeFunction";
import {
  StyledDashboardContainer,
  StyledFlexContainer,
  StyledFlexContent,
} from "./DashboardPage.style";

const data: ChartData<"line"> = lineDataChangeFunction();

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
          data={data}
          title=" Data Ingest Status"
        />
        <GraphicsSection
          className="fifth"
          data={data}
          title=" Data Ingest Status"
        />
        <GraphicsSection
          className="sixs"
          data={data}
          title=" Data Ingest Status"
        />
        <GraphicsSection
          className="sevn"
          data={data}
          title=" Data Ingest Status"
        />
      </StyledFlexContainer>
    </StyledDashboardContainer>
  );
}
