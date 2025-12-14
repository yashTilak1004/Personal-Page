import axios from "axios";
import React, { useEffect, useState } from "react";
import Navbar, { drawerWidth, miniWidth } from "./Navbar";

function Intro() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false); // sync with drawer

  useEffect(() => {
    const GetData = async () => {
      try {
        const res = await axios.get("http://localhost:4000/leetcode/user4354pU");
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    GetData();
  }, []);

  return (
    <div style={{ display: "flex" }}>
      <Navbar open={open} setOpen={setOpen} />

      <main
        style={{
          marginLeft: open ? drawerWidth : miniWidth,
          padding: "20px",
          width: "100%",
          transition: "margin-left 0.3s ease",
        }}
      >
        {data ? <pre>{JSON.stringify(data, null, 2)}</pre> : "Loading..."}
      </main>
    </div>
  );
}

export default Intro;
