import axios from "axios";
import Intro from "./Folder/Intro";
import {BrowserRouter, Routes,Route} from 'react-router-dom';

function App() {

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Intro />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
