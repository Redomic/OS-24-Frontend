import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import io from "socket.io-client";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./StreamPage.css";

const StreamPage = () => {
  const socket = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const ctx = useRef(null);
  const [data, setData] = useState({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [rectCoords, setRectCoords] = useState(null);
  const [zoneCounter, setZoneCounter] = useState(0);
  const [zoneFootfall, setZoneFootfall] = useState({});

  useEffect(() => {
    socket.current = io("ws://127.0.0.1:5920");

    socket.current.on("connect", () => {
      console.log("Connected to WebSocket server");
    });

    socket.current.on("frame", (data) => {
      if (videoRef.current) {
        videoRef.current.src = `data:image/jpeg;base64,${data}`;
      }
    });

    socket.current.on("response", (newData) => {
      setData(newData);

      const timestamp = new Date().toLocaleTimeString();
      if (newData.footfall_summary) {
        setZoneFootfall((prev) => {
          const updatedFootfall = { ...prev };

          Object.entries(newData.footfall_summary.zone_footfall).forEach(
            ([zone, count]) => {
              if (!updatedFootfall[zone]) {
                updatedFootfall[zone] = [];
              }
              updatedFootfall[zone] = [
                ...updatedFootfall[zone],
                { time: timestamp, footfall: count },
              ].slice(-40);
            }
          );

          return updatedFootfall;
        });
      }
    });

    socket.current.on("disconnect", () => {
      console.log("Disconnected from WebSocket server");
    });

    // Initialize the canvas context
    ctx.current = canvasRef.current.getContext("2d");

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  const formatJson = (json) => {
    const formattedJson = JSON.stringify(json, null, 2);
    return formattedJson
      .replace(/"([^"]+)":/g, '<span class="key">"$1":</span>') // Key color
      .replace(/: "([^"]+)"/g, ': <span class="value">"$1"</span>'); // Value color
  };

  const generateHeatmap = () => {
    axios
      .get("http://localhost:5920/generate_heatmap")
      .then((response) => {
        if (response.status === 200) {
          console.log(response.data);
        }
      })
      .catch((error) => {
        console.error(error.message);
      });
  };

  const handleMouseDown = (e) => {
    e.preventDefault(); // Prevent image dragging behavior

    setIsDrawing(true);
    const rect = videoRef.current.getBoundingClientRect();
    setStartX(e.clientX - rect.left);
    setStartY(e.clientY - rect.top);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const rect = videoRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    // Clear previous drawing and redraw the rectangle
    ctx.current.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    ctx.current.beginPath();
    ctx.current.rect(startX, startY, currentX - startX, currentY - startY);
    ctx.current.strokeStyle = "red";
    ctx.current.lineWidth = 2;
    ctx.current.stroke();
  };

  const handleMouseUp = (e) => {
    setIsDrawing(false);

    // Clear the canvas when mouse is up
    ctx.current.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    const rect = videoRef.current.getBoundingClientRect();
    const x_max = e.clientX - rect.left;
    const y_max = e.clientY - rect.top;

    const originalWidth = videoRef.current.naturalWidth; // Get the original image width
    const originalHeight = videoRef.current.naturalHeight; // Get the original image height

    // Increment the zone counter
    setZoneCounter((prevCounter) => prevCounter + 1);

    // Calculate the coordinates relative to the original image size
    const coords = {
      zone_id: `zone-${zoneCounter + 1}`, // Append the zone ID
      coordinates: {
        x_min: Math.round((startX / rect.width) * originalWidth),
        y_min: Math.round((startY / rect.height) * originalHeight),
        x_max: Math.round((x_max / rect.width) * originalWidth),
        y_max: Math.round((y_max / rect.height) * originalHeight),
      },
    };

    setRectCoords(coords);

    axios
      .post("http://localhost:5920/create_zone", coords)
      .then((response) => {
        if (response.status === 200) {
          console.log("Made region");
        } else {
          console.log(response.data);
        }
      })
      .catch((error) => {
        console.error(error.message);
      });
    console.log("Calculated Zone Coordinates:", coords);
  };

  return (
    <div className="stream-page-container">
      <div className="stream-container">
        <div className="video-container">
          <img
            id="stream-frame"
            ref={videoRef}
            alt="Stream frame"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          />
          <canvas
            ref={canvasRef}
            width={640} // Set canvas dimensions to match the video
            height={480}
            className="video-canvas"
          />
          <button className="video-button" onClick={generateHeatmap}>
            Generate Heatmap
          </button>
        </div>
        <div className="code-container">
          <div className="code-header">Response</div>
          <pre
            className="code-block"
            dangerouslySetInnerHTML={{ __html: formatJson(data) }}
          />
        </div>
      </div>
      <div className="charts-container">
        {Object.keys(zoneFootfall).map((zone) => (
          <div key={zone} className="chart-item">
            <h3>{zone}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={zoneFootfall[zone] || []}>
                {/* <CartesianGrid strokeDasharray="3 3" /> */}
                <XAxis
                  dataKey="time"
                  tick={{ fill: "white" }}
                  //   axisLine={{ stroke: "white" }}
                  //   tickLine={{ stroke: "white" }}
                />
                <YAxis
                  tick={{ fill: "white" }}
                  //   axisLine={{ stroke: "white" }}
                  //   tickLine={{ stroke: "white" }}
                />
                <Tooltip />
                <Line type="monotone" dataKey="footfall" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StreamPage;
