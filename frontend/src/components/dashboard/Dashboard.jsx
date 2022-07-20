import { TextField, InputAdornment, Typography} from "@mui/material";
import {HomeIcon, PlusIcon, SearchIcon} from "../../assets/icon/icon";
import {ChartSvg} from "../../assets/icon/chart";
import { styled } from "@mui/system";
import Box from '@mui/material/Box';
const DashboardContainer = styled(Box)(({theme})=>({
    padding: "20px",
    paddingBottom:"40px",
    marginLeft:"250px",
    width:"100%",
    minWidth:"1094px",
    [theme.breakpoints.down(1381)]:{
        marginLeft:"83px"
    },
}))
const FlexContainer = styled(Box)(({theme})=>({
    display:"flex",
    flexWrap: "wrap",
    gap:"30px",
    justifyContent:"space-between"    
}))
const FlexContent = styled(Box)(({theme})=>({
    maxWidth:"512px",
    width:"100%",
    minWidth:"428px",
    minHeight:"446px",
    borderLeft:"8px solid #F1E9FE",
    boxShadow:"0px 0px 25px 2px rgba(0, 0, 0, 0.09)",
    borderRadius:"10px",
    marginBottom:"40px",
    [theme.breakpoints.down(1944)]:{
        maxWidth: "47%",
    },
    
    "&.fourth":{
        maxWidth: "47%",
    },
    "&.fifth":{
        maxWidth: "47%",
        [theme.breakpoints.down(1944)]:{
            maxWidth:"100% "
        },
    },
    "&.second":{
        borderWidth: "0px 0px 8px 8px",
        borderStyle: "solid",
        borderColor: "#F1E9FE",
    },
    "&.sixs":{
        maxWidth:"100%!important",
    },
    "&.sevn":{
        maxWidth:"100%!important"
    },
}))

const title = {color: '#3A474E',
fontWeight: 500,
fontSize: 18,
lineHeight: '160%',
textAlign: 'left',
marginTop: '16px',
marginBottom: '11px'}

export function Dashboard() {
    return <DashboardContainer>
            <Box sx={{display: "flex", alignItems: "center",padding: '20px 48px 20px 0', justifyContent: 'space-between'}}>
                <Box sx={{display: "flex", alignItems: 'center'}}>
                    <Box sx={{mr: "9.6px"}}><HomeIcon/></Box>
                    <Typography sx={{
                    fontSize: "20px",
                    lineHeight: "133.4%",
                    color: "#94A4AD"
                    }}>My Dashboard</Typography>
                </Box>
            <Box sx={{display: "flex", alignItems: 'center'}}>
                <Box sx={{
                    background: '#EF4C36',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: 0,
                    margin: 0,
                    marginRight: '20px',
                    cursor: "pointer",
                }}>
                    <Box sx={{
                        margin: '15.5px 0 15.5px 10px'
                    }}>
                        <ChartSvg first={true} second={true} third={true}/>
                    </Box>
                    <Typography sx={{
                        fontSize: '24px',
                        color: '#fff',
                        margin: '0 9px',
                        fontWeight: 400,
                        lineHeight: '140%'
                    }}>
                        10
                    </Typography>
                    <Typography sx={{
                        fontSize: '14px',
                        color: '#fff',
                        marginRight: '14px',
                        fontWeight: 400,
                        lineHeight: '140%'
                    }}>
                        Active Critical Alerts
                    </Typography>
                </Box>
                <Box sx={{
                    background: '#FF833D',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    textAlign: 'center',
                    padding: 0,
                    margin: 0,
                    cursor: "pointer",
                }}>
                    <Box sx={{
                        margin: '15.5px 0 15.5px 10px'
                    }}>
                        <ChartSvg first={true} second={true} third={false}/>
                    </Box>
                    <Typography sx={{
                        fontSize: '24px',
                        color: '#fff',
                        margin: '0 9px'
                    }}>
                        500
                    </Typography>
                    <Typography sx={{
                        fontSize: '14px',
                        color: '#fff',
                        marginRight: '14px'
                    }}>
                        Active High Alerts
                    </Typography>
                </Box>
                <Box sx={{
                    height: '42px',
                    width: '1px',
                    backgroundColor: '#B3BEC4',
                    margin: '0 20px 0 30px'
                }}/>
                <Box sx={{
                    display: 'flex',
                    cursor: "pointer",
                }}>
                    <Box sx={{
                        margin: '0 6px'
                    }}>
                        <PlusIcon/>
                    </Box>
                    <Typography sx={{
                        color: '#9D60FB',
                        fontSize: '14px',
                        fontWeight: 400
                    }}>
                        Add Monitor
                    </Typography>
                </Box>
            </Box>
        </Box>
        <FlexContainer>
            <FlexContent className="first" sx={{
                borderLeft: '8px solid rgba(239, 76, 54, 0.5)',
            }}>
                <Typography sx={title} >
                    Models List
                </Typography>
                <Box>
                    <TextField
                        sx={{
                            borderRadius: '4px',
                            width: 'calc(100% - 60px)',
                            margin: '30px',
                            marginLeft: "40px"
                        }}
                        placeholder='Search Model'
                        variant="outlined"
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end" sx={{
                                    cursor: 'pointer'
                                }}>
                                    <SearchIcon />
                                </InputAdornment>
                            )
                        }}
                    />
                </Box>

            </FlexContent>
            <FlexContent className="second">
                <Box sx={{}}>
                    <Typography  sx={{...title,mt:2,ml:2}}>
                        Data Ingest Status
                    </Typography>
                </Box>
                
            </FlexContent>
            <FlexContent className="third">
                <Box sx={{}}>
                    <Typography  sx={{...title,mt:2,ml:2}}>
                        Data Ingest Status
                    </Typography>
                </Box>
                
            </FlexContent>
            <FlexContent className="fourth">
                <Box sx={{}}>
                    <Typography  sx={{...title,mt:2,ml:2}}>
                        Data Ingest Status
                    </Typography>
                </Box>
                
            </FlexContent>
            <FlexContent className="fifth">
                <Box sx={{}}>
                    <Typography  sx={{...title,mt:2,ml:2}}>
                        Data Ingest Status
                    </Typography>
                </Box>
                
            </FlexContent>
            <FlexContent className="sixs">
                <Box sx={{}}>
                    <Typography  sx={{...title,mt:2,ml:2}}>
                        Data Ingest Status
                    </Typography>
                </Box>
                
            </FlexContent>
            <FlexContent className="sevn">
                <Box sx={{}}>
                    <Typography  sx={{...title,mt:2,ml:2}}>
                        Data Ingest Status
                    </Typography>
                </Box>
                
            </FlexContent>
        </FlexContainer>
    </DashboardContainer>
}
