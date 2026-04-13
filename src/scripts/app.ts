import { DnDProvider } from "@vue-dnd-kit/core";
import { createApp, h } from "vue";
import * as composables from "@/scripts/composables";

import "@/css/style.css";
import App from "@/main/App.vue";

// What the actual fuck
const app = createApp({
  render: () => h(DnDProvider, null, { default: () => h(App) }),
});

// Ngl this just makes me sad.
composables.compose.forEach((data) => {
  const key = `$${data.index}`;

  app.config.globalProperties[key] = Object.fromEntries(
    data.list.map((item) => [item.index, item.callback]),
  );
});

app.mount("#app");
