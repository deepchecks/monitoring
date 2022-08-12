import { List } from "@mui/material";
import { useState } from "react";
import { SearchField } from "../../../components/SearchField/SearchField";
import { ModelWithAlerts } from "../../../types/model";
import { ModelItem } from "../ModelItem/ModelItem";
import {
  StyledButton,
  StyledFlexContent,
  StyledTypographyTitle,
  StyledWrapper,
} from "./ModelList.style";

interface ModelListProps {
  models: ModelWithAlerts[];
}

const initRange = 3;

export function ModelList({ models }: ModelListProps) {
  const [range, setRange] = useState<number>(initRange);

  const handleRange = () => {
    setRange((prevRange) => {
      const currentRange = prevRange + initRange;

      if (currentRange < models.length) {
        return currentRange;
      }

      return models.length;
    });
  };

  return (
    <StyledFlexContent>
      <StyledTypographyTitle variant="subtitle1">
        Models List
      </StyledTypographyTitle>
      <StyledWrapper>
        <SearchField size="small" fullWidth />
      </StyledWrapper>
      <List>
        {models.slice(0, range).map((model, index) => (
          <ModelItem key={index} border={index === 1} model={model} />
        ))}
        {range < models.length && (
          <StyledButton variant="text" onClick={handleRange}>
            See all (+{models.length - range})
          </StyledButton>
        )}
      </List>
    </StyledFlexContent>
  );
}
