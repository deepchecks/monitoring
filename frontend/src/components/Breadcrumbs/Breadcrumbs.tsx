import { Breadcrumbs as MuiBreadcrumbs } from "@mui/material";
import { memo } from "react";
import { HomeIcon } from "../../assets/icon/icon";
import { routes } from "../../helpers/routes";
import {
  StyledFlexWrapper,
  StyledLink,
  StyledLinkHome,
  StyledTypographyCurrentPath,
  StyledTypographyHome,
} from "./Breadcrums.style";

interface LinkType {
  link: string;
  name: string;
}

interface BreadcrumbsProps {
  currentPath?: string;
  links?: LinkType[];
}

function BreadcrumbsComponent({
  currentPath = "",
  links = [],
}: BreadcrumbsProps) {
  return links.length || currentPath ? (
    <MuiBreadcrumbs aria-label="breadcrumb">
      <StyledLink href={routes.dashboard} fontWeight={400}>
        <StyledFlexWrapper>
          <HomeIcon />
          <StyledTypographyHome variant="h5">My Dashboard</StyledTypographyHome>
        </StyledFlexWrapper>
      </StyledLink>
      {links.map(({ link, name }) => (
        <StyledLink href={link}>
          <HomeIcon />
          <StyledTypographyHome variant="h5">{name}</StyledTypographyHome>
        </StyledLink>
      ))}
      {currentPath && (
        <StyledTypographyCurrentPath variant="h5">
          {currentPath}
        </StyledTypographyCurrentPath>
      )}
    </MuiBreadcrumbs>
  ) : (
    <MuiBreadcrumbs aria-label="breadcrumb">
      <StyledLinkHome href={routes.dashboard}>
        <StyledFlexWrapper>
          <HomeIcon />
          <StyledTypographyHome variant="h5">My Dashboard</StyledTypographyHome>
        </StyledFlexWrapper>
      </StyledLinkHome>
    </MuiBreadcrumbs>
  );
}

export const Breadcrumbs = memo(BreadcrumbsComponent);
