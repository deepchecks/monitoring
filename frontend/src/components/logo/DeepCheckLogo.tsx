import { Box } from "@mui/material";
import { Logo, Logoin1280 } from "../../assets/logo";

interface DeepCheckLogoProps {
  onClick: () => void;
  width: number;
}

export default function DeepCheckLogo({ onClick, width }: DeepCheckLogoProps) {
  return (
    <Box
      onClick={() => {
        onClick();
      }}
      sx={{
        display: "flex",
        justifyContent: "center",
        paddingTop: "40px",
        cursor: "pointer",
      }}
    >
      {width > 1381 ? <Logo /> : <Logoin1280 />}
    </Box>
  );
}
