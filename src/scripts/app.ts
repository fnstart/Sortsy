import { createApp } from "vue";
import { plugin as slicksortPlugin } from "vue-slicksort";
import * as composables from "@/scripts/composables";

import "@/css/style.css";
import App from "@/main/App.vue";

const app = createApp(App);

app.use(slicksortPlugin);

// Ngl this just makes me sad.
composables.compose.forEach((data) => {
  const key = `$${data.index}`;

  app.config.globalProperties[key] = Object.fromEntries(
    data.list.map((item) => [item.index, item.callback]),
  );
});

app.mount("#app");
