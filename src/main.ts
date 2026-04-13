import { DnDProvider } from "@vue-dnd-kit/core";
import { createApp, h } from "vue";
import "./style.css";
import App from "./App.vue";

// What the actual fuck
createApp({
  render: () => h(DnDProvider, null, { default: () => h(App) }),
}).mount("#app");
