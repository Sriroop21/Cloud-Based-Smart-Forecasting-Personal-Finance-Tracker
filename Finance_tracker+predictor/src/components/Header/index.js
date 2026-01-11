import React, { useState } from "react";
import "./styles.css";
import { TbMoneybag } from "react-icons/tb";
import { AiFillSetting } from "react-icons/ai";
import UserProfile from "../UserProfileFeture";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <header className="navbar">
        <div className="navbar-left">
          <h1 className="app-title">
            Finance Tracker <TbMoneybag className="logo-icon" />
          </h1>
        </div>
        <div
          className={`menu-btn-container ${isOpen ? "rotate" : ""}`}
          onClick={handleOpen}
        >
          <AiFillSetting className="menu-btn" />
        </div>
      </header>
      {isOpen && <UserProfile className="profile" />}
    </>
  );
};

export default Header;
