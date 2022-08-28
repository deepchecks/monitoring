import { Box, Typography } from "@mui/material";
import { routes } from "../../../helpers/routes";
import { Model } from "../../../types/model";
import {
  StyledAlert,
  StyledContainer,
  StyledCounter,
  StyledLink,
  StyledModelInfo,
  StyledTypographyDate,
} from "./ModelItem.style";

interface ModelItemProps {
  border?: boolean;
  model: Model;
}

export function ModelItem({ border = false, model }: ModelItemProps) {
  return (
    <StyledContainer>
      <StyledLink
        to={routes.alerts}
        state={{ modelId: model.id }}
        isBorder={border}
      >
        <StyledModelInfo>
          <Box>
            <Typography variant="subtitle1">{model.name}</Typography>
            <StyledTypographyDate variant="body2">
              Last data update: July 22, 2022 10am
            </StyledTypographyDate>
          </Box>
          <StyledAlert>
            <StyledCounter variant="h4">{model.alerts_count}</StyledCounter>
          </StyledAlert>
        </StyledModelInfo>
      </StyledLink>
    </StyledContainer>
  );
}
