import {
  IconButton,
  MenuItem,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { ChartData } from "chart.js";
import { memo, useState } from "react";
import { MenuVertical } from "../../../assets/icon/icon";
import DiagramLine from "../../../components/DiagramLine/DiagramLine";
import { Submenu } from "../../../components/Submenu/Submenu";
import { GraphData, ID } from "../../../types";
import {
  StyledArrow,
  StyledDiagramWrapper,
  StyledFlexContent,
  StyledFlexWrapper,
  StyledMenuItem,
  StyledRootMenu,
  StyledSelect,
  StyledTypographyTitle,
} from "./GraphicsSection.style";

interface GraphicsSectionProps {
  data: ChartData<"line", GraphData>;
  monitorId: ID;
  onOpen: (id: ID) => void;
  title: string;
}

function GraphicsSectionComponent({
  data,
  monitorId,
  onOpen,
  title,
}: GraphicsSectionProps) {
  const [hover, setHover] = useState<boolean>(false);
  const [anchorElRootMenu, setAnchorElRootMenu] = useState<null | HTMLElement>(
    null
  );
  const [openSubmenu, setOpenSubmenu] = useState<boolean>(false);

  const [time, setTime] = useState("Last 7 days");
  const openRootMenu = Boolean(anchorElRootMenu);

  const handleTime = (event: SelectChangeEvent<unknown>) => {
    setTime(event.target.value as string);
  };

  const onMouseOver = () => {
    setHover(true);
  };

  const onMouseLeave = () => {
    setHover(false);
  };

  const handleOpenRootMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setOpenSubmenu(false);
    setAnchorElRootMenu(event.currentTarget);
  };

  const handleCloseRootMenu = () => {
    setAnchorElRootMenu(null);
  };

  const handleOpenSubmenu = () => {
    setOpenSubmenu(true);
  };

  const handleOpenEditMonitor = () => {
    onOpen(monitorId);
    setAnchorElRootMenu(null);
  };

  return (
    <>
      <StyledFlexContent onMouseOver={onMouseOver} onMouseLeave={onMouseLeave}>
        <StyledFlexWrapper>
          <StyledTypographyTitle>{title}</StyledTypographyTitle>
          {(hover || openRootMenu) && (
            <IconButton onClick={handleOpenRootMenu} size="small">
              <MenuVertical />
            </IconButton>
          )}
        </StyledFlexWrapper>
        <StyledDiagramWrapper>
          <DiagramLine data={data} />

          <StyledSelect value={time} onChange={handleTime} size="small">
            <MenuItem value="Last 7 days">Last 7 days</MenuItem>
          </StyledSelect>
        </StyledDiagramWrapper>
      </StyledFlexContent>
      <StyledRootMenu
        anchorEl={anchorElRootMenu}
        open={openRootMenu}
        onClose={handleCloseRootMenu}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <StyledMenuItem onClick={handleOpenEditMonitor}>
          <Typography variant="body2">Edit</Typography>
        </StyledMenuItem>
        <StyledMenuItem onClick={handleOpenSubmenu}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            width={1}
          >
            <Typography variant="body2">Change width</Typography>
            <StyledArrow fill="black" />
          </Stack>
          <Submenu open={openSubmenu}>
            <StyledMenuItem onClick={handleCloseRootMenu}>
              <Typography variant="body2">One Columns</Typography>
            </StyledMenuItem>
            <StyledMenuItem onClick={handleCloseRootMenu}>
              <Typography variant="body2">TwoColumns</Typography>
            </StyledMenuItem>
            <StyledMenuItem onClick={handleCloseRootMenu}>
              <Typography variant="body2">ThreeColumns</Typography>
            </StyledMenuItem>
          </Submenu>
        </StyledMenuItem>
      </StyledRootMenu>
    </>
  );
}

export const GraphicsSection = memo(GraphicsSectionComponent);
