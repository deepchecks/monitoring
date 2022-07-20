import  { useState,} from "react";
import { useNavigate } from "react-router-dom";
import { Box } from "@mui/system"
import { styled } from "@mui/system";
import { sideBarInfo, SidebarInfo } from '../../helpers/helper';
import DeepCheckLogo from "../logo/DeepCheckLogo";
import { DASHBOARD_ROUTE } from "../../helpers/route";
import { Arow, InfoIcon } from "../../assets/icon/icon";
import profileImg from "../../assets/icon/profileImg.jpg"
import useWindowResize from "../../hook/windowsize";
const ImgBox = styled(Box)(({ theme }) => ({
    margin:"0 14px",
    width:"40px",
    height:"40px",
    [theme.breakpoints.down(1381)]: {
        margin:"auto -4px"
    }
}))
const SidebarContainer = styled(Box)(({theme})=>({
    position:"fixed",
    background: "#17003E",
    width:  "237px" ,
    height:"100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent:"space-between",
    [theme.breakpoints.down(1381)]:{
        width:"83px"
    }
}))


function isActivElement(arr:any, id:string){
    if(Array.isArray(arr)) {
        return arr.map(el => {
            if (el.key === id) {
                return {
                    ...el,
                    activ: true,
                }
            };
            return {
                ...el,
                activ: false,
            };
        });
    };
}

export default function Sidebar() {
    const [sidebarInfo, setSidebarInfo] = useState<any>(sideBarInfo)
    const width =useWindowResize()
    const navigate = useNavigate()
    return ( <Box sx = {
                {
                    position:"fixed",
                    background: "#17003E",
                    maxWidth: width > 1381 ? "237px" : "83px",
                    height:"100vh",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent:"space-between"
                }
            }>
            <Box>
            <DeepCheckLogo width={width} onClick={()=>{
                return undefined
            }} />
            <Box sx = {
                { mt: "54px", ml: "16px" }
            }> {
                sidebarInfo.map((el:SidebarInfo) => {
                        return <Box sx = {
                            {
                                width: width>1381?"237px":"70px",
                                ml:"5px",
                                height: "38px",
                                display: "flex",
                                alignItems: "center",
                                borderRadius: "20px 0px 0px 20px",
                                fontSize: "14px",
                                lineHeight: "120%",
                                color: el.activ ? "#17003E" : "#fff",
                                cursor: "pointer",
                                backgroundColor: el.activ ? "#fff" : null,
                                backgroundImage: el.activ ? `url(${el.ActivIcon})` : `url(${el.Icon})`,
                                backgroundRepeat: "no-repeat",
                                backgroundPosition: `${width>1381 ? "30px" : "10px"} center`,
                                transition: "all 0.2s ease-in",
                                "&:hover": {
                                    color: "#B17DFF",
                                    backgroundImage: `url(${el.IconHover})`,
                                    transition: "all 0.2s ease-in",
                                },
                            }
                        }
                        onClick = {
                            () => {
                                el.action(navigate, DASHBOARD_ROUTE)
                                setSidebarInfo(isActivElement(sidebarInfo, el.key))
                            }
                        }
                        key = { el.key } >
                            {width>1381?<Box display = {
                                {
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }
                            } >
                            <span style = {
                                { marginLeft: "72px", marginRight: "" } } > { el.text } </span> { el.text === "Alerts" ? <Arow/> : null }
                        </Box >:null}
                            
                    </Box>
            })
        } </Box>
        </Box>
        <Box sx={{
                    ml: "16px",
                }}>
                    <Box sx={{
                        // width: "237px",
                        pb:"43px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        height: "38px",
                        borderRadius: "20px 0px 0px 20px",
                        fontSize: "14px",
                        lineHeight: "120%",
                        color: "#fff",
                        cursor: "pointer",
                        "&:hover": {
                            color: "#B17DFF",
                            fill: "#17003E"
                        },
                        "&:active": {
                            color: "#B17DFF",
                            fill: "#17003E"
                        }
                    }}>
                        <Box sx={
                            {
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between"

                            }
                        }>
                            <ImgBox sx={{
                                marginLeft:"8px"
                            }}>
                                <img src={profileImg} alt='profile' style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 50,
                                    borderWidth: 2,
                                    borderColor: 'rgba(255, 255, 255, 0.2)',
                                    borderStyle: 'solid'
                                }}/>
                            </ImgBox>
                            {width>1381?<Box>Hi, person</Box>:null}
                        </Box>
                    </Box>
                    <Box sx={{
                        width: width>1381?"237px":"0",
                        pb:"79px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        height: "38px",
                        borderRadius: "20px 0px 0px 20px",
                        fontSize: "14px",
                        lineHeight: "120%",
                        color: "#fff",
                        cursor: "pointer",
                        "&:hover": {
                            color: "#B17DFF",
                            fill: "#17003E"
                        },
                        "&:active": {
                            color: "#B17DFF",
                            fill: "#17003E"
                        }
                    }}>
                        <Box sx={{
                            display: "flex",
                            alignItems: "center",
                            "space-between" : "center",
                        }}>
                            <ImgBox>
                                <InfoIcon/>
                            </ImgBox>
                            {width > 1381 ?<Box>Need Help?</Box> :null}
                        </Box>
                    </Box>
                </Box>
            </Box>
    )
}
