import React, { createContext, useState, useEffect, useContext } from "react";

export const ColorContext = createContext({
  pointerColor: "",
  setPointerColor: () => {},
});

export const ColorProvider = ({ children }) => {
  const [pointerColor, setPointerColor] = useState("");

  useEffect(() => {
    try {
      const value = pointerColor || "#10b981";
      document.documentElement.style.setProperty("--pointer-color", value);
    } catch (e) {
      // ignore (server-side or restricted env)
    }
  }, [pointerColor]);

  return (
    <ColorContext.Provider value={{ pointerColor, setPointerColor }}>
      {children}
    </ColorContext.Provider>
  );
};

export const usePointerColor = () => useContext(ColorContext);
