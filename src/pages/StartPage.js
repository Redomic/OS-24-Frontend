import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import "./StartPage.css";

const StartPage = () => {
  const [videoStreamUrl, setVideoStreamUrl] = useState("./data/output_1.mp4"); // Add state to store the input value
  const navigate = useNavigate();

  const handleProcess = () => {
    const postData = {
      video_stream_url: videoStreamUrl, // Use the state value
      zones: [],
    };

    axios
      .post("http://localhost:5920/process_stream", postData)
      .then((response) => {
        if (response.status === 200) {
          navigate("/stream");
        } else {
          console.log(response.data);
        }
      })
      .catch((error) => {
        console.error(error.message);
      });
  };

  return (
    <div>
      <div className="container">
        <div className="stream-link">
          <input
            type="text"
            placeholder="Stream URL (Nothing for Camera)"
            value={videoStreamUrl} // Bind the input value to the state
            onChange={(e) => setVideoStreamUrl(e.target.value)} // Update state on input change
          />
        </div>
        <button className="process-btn" onClick={handleProcess}>
          Process Stream
        </button>
      </div>
    </div>
  );
};

export default StartPage;
