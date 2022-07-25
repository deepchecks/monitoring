import { memo } from "react";
import { useLocation } from "react-router-dom";
import { Arow } from "../../../assets/icon/icon";
import { SidebarInfo } from "../../../helpers/helper";
import {
  StyledArrowWrapper,
  StyledLeftColumn,
  StyledLinkWrapper,
  StyledTypography,
} from "./SidebarMenuItem.style";

interface SidebarMenuItemProps {
  width: number;
  info: SidebarInfo;
}

function SidebarMenuItemComponent({ info, width }: SidebarMenuItemProps) {
  const location = useLocation();

  const active = location?.pathname === info.link;

  return (
    <StyledLinkWrapper to={info.link} active={active} key={info.key}>
      {width > 1381 && (
        <>
          <StyledLeftColumn>
            {active ? (
              <img alt="active-icon" src={info.ActivIcon} />
            ) : (
              <img alt="icon" src={info.Icon} />
            )}
            <StyledTypography>{info.text}</StyledTypography>
          </StyledLeftColumn>
          {info.text === "Analysis" && (
            <StyledArrowWrapper>
              <Arow />
            </StyledArrowWrapper>
          )}
        </>
      )}
    </StyledLinkWrapper>
  );
}

export const SidebarMenuItem = memo(SidebarMenuItemComponent);
