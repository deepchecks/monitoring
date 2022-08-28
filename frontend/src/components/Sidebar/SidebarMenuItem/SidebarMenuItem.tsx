import { memo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Arrow } from "../../../assets/icon/icon";
import { SidebarInfo } from "../../../helpers/sideBarInfo";
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
  const [hover, setHover] = useState<boolean>(false);

  const location = useLocation();
  const { ActivIcon, Icon, IconHover, link } = info;
  const active = location?.pathname === link;

  const onMouseOver = () => {
    setHover(true);
  };

  const onMouseLeave = () => {
    setHover(false);
  };

  return (
    <StyledLinkWrapper
      to={link}
      active={active}
      key={info.link}
      onMouseLeave={onMouseLeave}
      onMouseOver={onMouseOver}
    >
      {width > 1381 ? (
        <>
          <StyledLeftColumn>
            {hover ? <IconHover /> : active ? <ActivIcon /> : <Icon />}
            <StyledTypography variant="subtitle1">{info.text}</StyledTypography>
          </StyledLeftColumn>
          {info.text === "Analysis" && (
            <StyledArrowWrapper hover={hover}>
              <Arrow />
            </StyledArrowWrapper>
          )}
        </>
      ) : (
        <StyledLeftColumn>
          {hover ? <IconHover /> : active ? <ActivIcon /> : <Icon />}
        </StyledLeftColumn>
      )}
    </StyledLinkWrapper>
  );
}

export const SidebarMenuItem = memo(SidebarMenuItemComponent);
