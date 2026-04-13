import "vue";

declare module "vue" {
  interface ComponentCustomProperties {
    $theme: {
      toggle: () => void;
    };
  }
}

export {};
