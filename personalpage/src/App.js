import axios from "axios";
import { useEffect } from "react";
import Navbar from "./Folder/Navbar";

function App() {
  const GetData = async () => {
    try {
      const res = await axios.get("http://localhost:4000/leetcode/user4354pU");
      // assuming server returns JSON array/object as before
      console.log(res);
    } catch (err) {
      console.error("Fetch data error:", err);
    }
  };

  useEffect(() => {
    GetData();
  }, []);

  return (
    <div className="App">
      <Navbar />
    </div>
  );
}

export default App;
