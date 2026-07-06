"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

type ColorMode = "light" | "dark";

const ColorModeContext = createContext<{
  mode: ColorMode;
  toggle: () => void;
}>({
  mode: "light",
  toggle: () => {},
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

export default function AppThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mode, setMode] = useState<ColorMode>("light");

  const colorMode = useMemo(
    () => ({
      mode,
      toggle: () => setMode((prev) => (prev === "light" ? "dark" : "light")),
    }),
    [mode]
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
        },
      }),
    [mode]
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
