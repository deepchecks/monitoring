import { Logo, Logoin1280, } from "../../assets/logo";
import { Box } from "@mui/system"

interface DeepCheckLogoProps {
    onClick:Function,
    width:number,
}


export default function DeepCheckLogo ({onClick,width}:DeepCheckLogoProps){

    return (
        <Box onClick={()=>{
            onClick()
        }}
        sx={{
           display: "flex",
           justifyContent: "center",
           paddingTop:"40px",
           cursor:"pointer"
        }}
        >
            {width > 1220 ? <Logo />:<Logoin1280/> }
        </Box>
    )
}
