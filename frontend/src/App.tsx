import './App.css';
import { Box} from '@mui/material';
import { BACKGROUND_COLOR_MAX_WIDTH } from './helpers/colors/color';
import Sidebar from './components/sidebar/Sidebar';
import MyRouts from './routes';
import { styled } from '@mui/system';
const Container = styled(Box)(({theme})=>({
  maxWidth:"1920px",
  minWidth: "1280px",
  position:'relative',
  margin:"0 auto",
  [theme.breakpoints.up(1920)]:{
    borderRight:"1px solid rgba(209, 216, 220, 0.5)",
    borderLeft:"1px solid rgba(209, 216, 220, 0.5)",
    height:"100%",
  }
}))

function App() {
  return (
    <div className="App">
      <Box sx={{
                background:BACKGROUND_COLOR_MAX_WIDTH
              }}>
                <Container>
                  <Box sx={{
                    display:"flex",
                    height:"100%"
                }}>
                  <Sidebar/>
                  <MyRouts/>
                  </Box>
                </Container>
              </Box>
    </div>
  );
}

export default App;
