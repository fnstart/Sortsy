import { useColorMode } from "@vueuse/core";

export const mode = useColorMode({
  attribute: "class",
  modes: {
    dark: "dark",
    light: "",
  },
});

export const toggle = {
  callback: () => {
    mode.value = mode.value === "dark" ? "light" : "dark";
  },
  index: "toggle",
};

export const list = {
  index: "theme",
  list: [toggle],
};

export default list;
