import React from "react";
import "./styles.css";

const ColorSwitcher = ({ handleColorChange }) => {
  return (
    <div className="color-switcher">
      <div
        className="color-option color-box green"
        onClick={() =>
          handleColorChange({
            "--primary-purple": "#16a34a", // Dark green
            "--primary-purple-shade": "#22c55e", // Bright green
          })
        }
      ></div>
      <div
        className="color-option color-box pink"
        onClick={() =>
          handleColorChange({
            "--primary-purple": "#db2777", // Bold pink
            "--primary-purple-shade": "#f472b6", // Light pink
          })
        }
      ></div>
      <div
        className="color-option color-box orange"
        onClick={() =>
          handleColorChange({
            "--primary-purple": "#ea580c", // Bold orange
            "--primary-purple-shade": "#fb923c", // Light orange
          })
        }
      ></div>
      <div
        className="color-option color-box light-green"
        onClick={() =>
          handleColorChange({
            "--primary-purple": "#0d9488", // Teal
            "--primary-purple-shade": "#2dd4bf", // Lighter teal
          })
        }
      ></div>
      <div
        className="color-option color-box default"
        onClick={() =>
          handleColorChange({
            "--primary-purple": "#6842EF", // Default purple
            "--primary-purple-shade": "#8161f4", // Lighter purple
          })
        }
      ></div>
    </div>
  );
};

export default ColorSwitcher;
