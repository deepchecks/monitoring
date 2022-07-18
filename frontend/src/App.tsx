import './App.css';
import { Box, Container } from '@mui/material';
import { BACKGROUND_COLOR_MAX_WIDTH } from './helpers/colors/color';
import Sidebar from './components/sidebar/Sidebar';
import MyRouts from './routes';

function App() {
  return (
    <div className="App">
      <Box sx={{
                background:BACKGROUND_COLOR_MAX_WIDTH
              }}>
                <Container maxWidth={false} sx={{
                  maxWidth:"1920px",
                  minWidth: "1280px",
                  position:'relative',
                }} >
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
