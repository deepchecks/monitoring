import { Box } from "@mui/material";

import profileImg from "../../assets/icon/profileImg.jpg";
import { sideBarInfo, SidebarInfo } from "../../helpers/sideBarInfo";
import useWindowResize from "../../hook/windowsize";
import DeepCheckLogo from "../Logo/DeepCheckLogo";
import { StyledBoxWrapper } from "./Sidebar.style";
import { SidebarMenuItem } from "./SidebarMenuItem/SidebarMenuItem";
import { UserSection } from "./UserSection/UserSection";

export default function Sidebar() {
  const width = useWindowResize();

  return (
    <StyledBoxWrapper view={width}>
      <Box sx={{ width: 1 }}>
        <DeepCheckLogo width={width} onClick={() => undefined} />
        <Box sx={{ mt: "54px", pl: "14px" }}>
          {sideBarInfo &&
            sideBarInfo.map((info: SidebarInfo) => (
              <SidebarMenuItem key={info.link} info={info} width={width} />
            ))}
        </Box>
      </Box>
      <UserSection profileImg={profileImg} width={width} />
    </StyledBoxWrapper>
  );
}
