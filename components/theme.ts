"use client";

import { createTheme } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Palette {
    ink: Palette["primary"];
    sand: Palette["primary"];
    clay: Palette["primary"];
    sky: Palette["primary"];
    accent: Palette["primary"];
  }
  interface PaletteOptions {
    ink?: PaletteOptions["primary"];
    sand?: PaletteOptions["primary"];
    clay?: PaletteOptions["primary"];
    sky?: PaletteOptions["primary"];
    accent?: PaletteOptions["primary"];
  }
}

const theme = createTheme({
  palette: {
    primary: {
      main: "#355834", // moss
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#f4f1f0", // sand
      contrastText: "#231f20", // ink
    },
    ink: {
      main: "#231f20",
      contrastText: "#ffffff",
    },
    sand: {
      main: "#f4f1f0",
      contrastText: "#231f20",
    },
    clay: {
      main: "#e96954",
      contrastText: "#ffffff",
    },
    sky: {
      main: "#94d9f8",
      contrastText: "#231f20",
    },
    accent: {
      main: "#ff7637",
      contrastText: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Work Sans", sans-serif',
    h1: { fontFamily: '"Roboto", sans-serif' },
    h2: { fontFamily: '"Roboto", sans-serif' },
    h3: { fontFamily: '"Roboto", sans-serif' },
    h4: { fontFamily: '"Roboto", sans-serif' },
    h5: { fontFamily: '"Roboto", sans-serif' },
    h6: { fontFamily: '"Roboto", sans-serif' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "9999px",
          px: 4,
          py: 1,
          fontSize: "0.875rem",
          fontWeight: 500,
          textTransform: "none",
          transition: "background-color 0.2s",
        },
      },
      variants: [
        {
          props: { variant: "contained" },
          style: {
            boxShadow: "none",
            "&:hover": { boxShadow: "none", backgroundColor: "#355834" },
          },
        },
        {
          props: { variant: "outlined" },
          style: {
            boxShadow: "none",
            backgroundColor: "#f4f1f0",
            color: "#231f20",
            borderColor: "#231f20",
            "&:hover": {
              backgroundColor: "#94d9f8",
              color: "#231f20",
              borderColor: "#231f20",
            },
          },
        },
        {
          props: { variant: "text" },
          style: {
            boxShadow: "none",
            color: "rgba(35, 31, 32, 0.7)",
            backgroundColor: "transparent",
            "&:hover": {
              backgroundColor: "#f4f1f0",
              color: "#231f20",
            },
          },
        },
      ],
    },
  },
});

export default theme;