import { THEME } from "@/context/themeContext"

type THEME_DATA = {
  id: number,
  name: THEME,
  background: string,
  "board-light": string,
  "board-dark": string,
  "board-image": string
}

export const THEMES_DATA: THEME_DATA[] = [
  {
    id: 1,
    name: "default",
    background: "#302E2B",
    "board-light": "#EBECD0",
    "board-dark": "#739552",
    "board-image": "https://www.chess.com/bundles/web/images/offline-play/standardboard.1d6f9426.png",
  },
  {
    id: 2,
    name: "bubblegum",
    background: "#282F3B",
    "board-light": "#627182",
    "board-dark": "#2C303E",
    "board-image": "https://res.cloudinary.com/dcugqfvvg/image/upload/e_improve,e_sharpen/v1718047051/screenshot-localhost_5173-2024.06.11-00_44_01_pxwr43.png",
  }
]